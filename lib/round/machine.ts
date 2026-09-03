import type { RoundEvent } from './events'
import type {
  AnswerResult,
  Challenge,
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
  error: string | null
}

export type RoundAction =
  | { type: 'START'; prompt: string; startedAt: number }
  | { type: 'EVENT'; event: RoundEvent }
  | { type: 'LOCK'; optionId: OptionId; at: number }
  | { type: 'FAIL'; message: string }
  | { type: 'RESET' }

export const initialRoundState: RoundState = {
  status: 'idle',
  roundId: null,
  prompt: '',
  startedAt: null,
  mode: null,
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
  error: null,
}

/**
 * THE COMMITMENT GATE.
 *
 * The only sanctioned way to read the answer text. Returns null until the user
 * has locked a prediction *and* the answer has finished. Components must never
 * touch `state.answerBuffer` — routing every read through here is what makes the
 * guarantee structural instead of a matter of discipline.
 */
export function revealedAnswer(state: RoundState): string | null {
  // A failed round reveals nothing, even if both gate conditions happen to hold —
  // e.g. answer.error arriving after a lock and a completed answer.
  if (state.status === 'error') return null
  if (state.prediction === null) return null
  if (!state.answerComplete) return null
  return state.answer?.text ?? state.answerBuffer
}

/**
 * Promote to `completed` once both gate conditions hold.
 *
 * Called after anything that could satisfy either condition, which is what makes
 * the two orderings — lock-then-finish and finish-then-lock — converge on the
 * same state without either being a special case.
 */
function settle(state: RoundState): RoundState {
  if (state.status === 'error') return state
  if (state.prediction !== null && state.answerComplete) {
    return { ...state, status: 'completed' }
  }
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
      // Guard: no challenge, no prediction. Also blocks a double-lock.
      if (state.challenge === null || state.prediction !== null) return state
      if (state.status === 'error' || state.status === 'idle') return state

      const prediction: Prediction = {
        optionId: action.optionId,
        lockedAtMs: state.startedAt === null ? 0 : action.at - state.startedAt,
        // Recorded before `settle` runs, so it reflects the true ordering.
        lockedBeforeAnswer: !state.answerComplete,
      }

      return settle({ ...state, status: 'predicted', prediction })
    }

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
