import type { RoundEvent } from './events'
import { clampConfidence } from '@/lib/scoring/brier'
import type {
  AnswerResult,
  Category,
  Challenge,
  Grade,
  OptionId,
  Prediction,
  ProviderMode,
  RoundStatus,
} from '@/types'

export interface RoundState {
  status: RoundStatus
  roundId: string | null
  prompt: string
  /** Wall-clock start, used for the elapsed clock. */
  startedAt: number | null
  mode: ProviderMode | null
  /** Local classifier's guess. Available immediately; the challenge supersedes it. */
  intent: Category | null

  challenge: Challenge | null
  challengeError: string | null

  /* ─── hidden buffers ──────────────────────────────────────────────────────
     Never read directly by any component. Reach the answer through
     `revealedAnswer()`, which enforces the Commitment Gate. */
  answerBuffer: string
  thinkingBuffer: string
  /* ─────────────────────────────────────────────────────────────────────── */

  /** Characters received. Exact, not an estimate — safe to display. */
  chars: number
  /** Delta events received. Exact. */
  deltas: number
  /** Has any reasoning arrived? Drives a status label only; the text is not shown. */
  reasoning: boolean

  answerComplete: boolean
  answer: AnswerResult | null

  prediction: Prediction | null
  grade: Grade | null
  /** Grading failed. The round still completes — the answer and prediction stand. */
  gradeError: string | null

  error: string | null
}

export type RoundAction =
  | { type: 'START'; prompt: string; startedAt: number }
  | { type: 'EVENT'; event: RoundEvent }
  | { type: 'LOCK'; optionId: OptionId; confidence: number; at: number }
  | { type: 'GRADED'; grade: Grade }
  | { type: 'GRADE_FAILED'; message: string }
  | { type: 'FAIL'; message: string }
  | { type: 'RESET' }

export const initialRoundState: RoundState = {
  status: 'idle',
  roundId: null,
  prompt: '',
  startedAt: null,
  mode: null,
  intent: null,
  challenge: null,
  challengeError: null,
  answerBuffer: '',
  thinkingBuffer: '',
  chars: 0,
  deltas: 0,
  reasoning: false,
  answerComplete: false,
  answer: null,
  prediction: null,
  grade: null,
  gradeError: null,
  error: null,
}

/**
 * Did challenge generation fail, leaving nothing to predict against?
 *
 * Distinct from `status === 'degraded'` because a lock cannot walk the status
 * back, and this predicate has to stay true for the rest of the round.
 */
function hasNoChallenge(state: RoundState): boolean {
  return state.challenge === null && state.challengeError !== null
}

/**
 * THE COMMITMENT GATE.
 *
 * The only sanctioned way to read the answer text. Returns null until the user
 * has locked a prediction *and* the answer has finished. Components must never
 * touch `state.answerBuffer` — routing every read through here is what makes the
 * guarantee structural instead of a matter of discipline.
 *
 * One exception, and it is not a loophole: if challenge generation failed there is
 * no prediction to protect, so the gate has nothing to hold the answer against.
 * Withholding it then would punish the user for our failure. The gate exists to
 * stop a prediction being made after seeing the answer — with no challenge, no
 * such prediction is possible.
 */
export function revealedAnswer(state: RoundState): string | null {
  // A failed round reveals nothing, even if both gate conditions happen to hold —
  // e.g. answer.error arriving after a lock and a completed answer.
  if (state.status === 'error') return null
  if (!state.answerComplete) return null
  if (state.prediction === null && !hasNoChallenge(state)) return null
  return state.answer?.text ?? state.answerBuffer
}

/**
 * Promote once the gate conditions hold.
 *
 * With a prediction the target is `grading`, not `completed`: the answer is
 * revealed the instant the gate opens, and the verdict lands a beat later when the
 * grade returns. Going straight to `completed` is what would flash an ungraded
 * verdict. A degraded round skips grading entirely — there is no prediction to
 * grade — and completes as soon as the answer does.
 *
 * Called after anything that could satisfy either condition, which is what makes
 * the two orderings — lock-then-finish and finish-then-lock — converge on the
 * same state without either being a special case.
 */
function settle(state: RoundState): RoundState {
  if (state.status === 'error') return state
  if (state.status === 'grading' || state.status === 'completed') return state
  if (!state.answerComplete) return state

  if (state.prediction !== null) return { ...state, status: 'grading' }
  if (hasNoChallenge(state)) return { ...state, status: 'completed' }
  return state
}

export function roundReducer(state: RoundState, action: RoundAction): RoundState {
  switch (action.type) {
    case 'START':
      return {
        ...initialRoundState,
        status: 'processing',
        prompt: action.prompt,
        startedAt: action.startedAt,
      }

    case 'RESET':
      return initialRoundState

    case 'FAIL':
      return { ...state, status: 'error', error: action.message }

    case 'LOCK': {
      // Guard: no challenge, no prediction. Also blocks a double-lock, which is
      // what makes the commitment irreversible rather than merely discouraged.
      if (state.challenge === null || state.prediction !== null) return state
      if (state.status === 'error' || state.status === 'idle') return state

      const prediction: Prediction = {
        optionId: action.optionId,
        confidence: clampConfidence(action.confidence),
        lockedAtMs: state.startedAt === null ? 0 : action.at - state.startedAt,
        // Recorded before `settle` runs, so it reflects the true ordering.
        lockedBeforeAnswer: !state.answerComplete,
      }

      return settle({ ...state, status: 'predicted', prediction })
    }

    case 'GRADED':
      // Only a round that reached the gate can be graded. A grade arriving in any
      // other state is a stale response from an abandoned round.
      if (state.status !== 'grading') return state
      return { ...state, status: 'completed', grade: action.grade, gradeError: null }

    case 'GRADE_FAILED':
      // The round still completes: the answer and the prediction are both real and
      // worth showing. Only the verdict is missing.
      if (state.status !== 'grading') return state
      return { ...state, status: 'completed', grade: null, gradeError: action.message }

    case 'EVENT':
      return settle(applyEvent(state, action.event))

    default:
      return state
  }
}

function applyEvent(state: RoundState, event: RoundEvent): RoundState {
  switch (event.t) {
    case 'round.start':
      return {
        ...state,
        roundId: event.roundId,
        mode: event.mode,
        intent: event.intent,
        // Trust the server's clock for the round, so elapsed matches the stream.
        startedAt: event.startedAt,
      }

    case 'challenge.ready':
      return {
        ...state,
        challenge: event.challenge,
        challengeError: null,
        // Don't walk backwards if the prediction is somehow already locked.
        status: state.prediction === null ? 'challenge_ready' : state.status,
      }

    case 'challenge.error':
      // The answer lane is unaffected — degrade, never abort.
      return { ...state, challengeError: event.message, status: 'degraded' }

    case 'answer.thinking':
      return {
        ...state,
        thinkingBuffer: state.thinkingBuffer + event.text,
        reasoning: true,
      }

    case 'answer.delta':
      return {
        ...state,
        answerBuffer: state.answerBuffer + event.text,
        chars: state.chars + event.text.length,
        deltas: state.deltas + 1,
      }

    case 'answer.progress':
      return {
        ...state,
        chars: event.chars,
        deltas: event.deltas,
      }

    case 'answer.done':
      return {
        ...state,
        answer: event.answer,
        answerComplete: true,
        // Prefer the server's authoritative text over the accumulated deltas.
        answerBuffer: event.answer.text || state.answerBuffer,
        chars: (event.answer.text || state.answerBuffer).length,
      }

    case 'answer.error':
      return { ...state, status: 'error', error: event.message }

    case 'round.end':
      return state

    default:
      return state
  }
}

/** Is the answer finished but still withheld? Drives the "ready — lock it" copy. */
export function isAnswerHeld(state: RoundState): boolean {
  return state.answerComplete && state.prediction === null
}

/** Is the prediction locked but the model still working? The other ordering. */
export function isAwaitingAnswer(state: RoundState): boolean {
  return state.prediction !== null && !state.answerComplete
}

/**
 * Has the gate opened? True through both `grading` and `completed`.
 *
 * The reveal renders off this rather than off `completed`, so the answer appears
 * the moment commitment is satisfied and the verdict animates in over it.
 */
export function isRevealed(state: RoundState): boolean {
  return state.status === 'grading' || state.status === 'completed'
}

/**
 * A degraded round has no challenge, so there is nothing to commit to.
 *
 * Stays true after the round completes, unlike `status === 'degraded'` — the
 * reveal needs to explain why there is no verdict.
 */
export function isDegraded(state: RoundState): boolean {
  return hasNoChallenge(state)
}
