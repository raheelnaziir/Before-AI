import { verifyEvidenceQuote } from './evidence'
import type { AIProvider, AnswerChunk, GradeInput } from './provider'
import { StructuredOutputError } from './provider'
import { classifyPrompt } from '@/lib/intent'
import { brierScore } from '@/lib/scoring/brier'
import type { Challenge, Grade, OptionId } from '@/types'

/**
 * Demo-mode answer.
 *
 * Says what it is. An unlabelled canned answer rendered under an "AI ANSWER"
 * heading would be deceptive, and demo mode exists so judges can run the app
 * without a key — not so it can pass for live inference.
 */
const DEMO_ANSWER = `Demo mode — this text is a canned fixture, not live inference. Add ANTHROPIC_API_KEY to .env.local and reload to get a real answer.

Everything around this text is real. The answer streamed in over SSE, accumulated into a hidden buffer, and stayed hidden until you locked your prediction. The Commitment Gate, the race between you and the model, and the reveal all behave exactly as they do against the live API. Only the words you are reading were written in advance.

The most likely cause of a difference you notice between demo and live mode is the challenge: here it is assembled from a template keyed to your prompt's category, whereas live it is written by claude-haiku-4-5 from your prompt alone. For reference, the live answer model is claude-opus-5 with adaptive thinking and a 64,000 token output ceiling.`

/**
 * Demo challenges, keyed by the local classifier's category.
 *
 * These ask about the answer's *shape* rather than its content, because a static
 * fixture cannot honestly claim to know what a specific answer will contain. The
 * live generator asks the real question. Labelling that distinction in
 * `DEMO_ANSWER` is deliberate.
 */
const DEMO_CHALLENGES: Record<string, { question: string; options: [string, string][] }> = {
  debugging: {
    question: 'What will it reach for first?',
    options: [
      ['A specific mechanism', 'Names the exact behaviour causing it before anything else.'],
      ['A diagnostic step', 'Tells you what to check or log before committing to a cause.'],
      ['A list of candidates', 'Enumerates several plausible causes without ranking them.'],
    ],
  },
  technical: {
    question: 'How will it frame the trade-off?',
    options: [
      ['One clear recommendation', 'Picks a side in the first sentence, then defends it.'],
      ['It depends, with criteria', 'Gives you the decision rule rather than the decision.'],
      ['A comparison table', 'Leads with structure — dimensions first, verdict later.'],
    ],
  },
  recommendation: {
    question: 'What will it optimise for?',
    options: [
      ['Your stated priority', 'Takes the constraint you named and builds everything around it.'],
      ['A balanced spread', 'Covers several angles rather than committing to one.'],
      ['The unstated constraint', 'Surfaces something you did not ask about but probably meant.'],
    ],
  },
  research: {
    question: 'Where will it start?',
    options: [
      ['The strongest evidence', 'Leads with what the literature agrees on.'],
      ['The disagreement', 'Opens on where the evidence conflicts, because that is the story.'],
      ['A definition', 'Pins down terms before making any claim.'],
    ],
  },
}

const DEMO_FALLBACK = {
  question: 'How will it open?',
  options: [
    ['Straight to the verdict', 'Commits to a position in the first sentence, then defends it.'],
    ['Caveats first', 'Opens by qualifying the question or listing what it depends on.'],
    ['Structure first', 'Leads with a framework, a numbered list, or a breakdown.'],
  ] as [string, string][],
}

const OPTION_IDS: OptionId[] = ['A', 'B', 'C', 'D']

/**
 * Deterministic PRNG.
 *
 * Jitter has to look organic but stay reproducible, otherwise a timing-sensitive
 * test is flaky by construction.
 */
function createRandom(seed: number): () => number {
  let state = seed || 1
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
}

function hashString(input: string): number {
  let hash = 2166136261
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return Math.abs(hash)
}

/** Split into token-sized pieces so the replay cadence resembles a real stream. */
function tokenize(text: string): string[] {
  return text.match(/\s*\S+/g) ?? []
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** Which lane, if any, should fail. Drives the degraded-path tests. */
export type MockFailure = 'none' | 'challenge' | 'answer' | 'grade'

export interface MockProviderOptions {
  /**
   * Multiplier on replay delays. 1 reproduces realistic streaming; 0 removes all
   * waiting, which is what tests want.
   */
  delayScale?: number
  /** Inject a failure into one lane. Everything else keeps working. */
  failure?: MockFailure
  /**
   * Force a verdict rather than deriving one from the option index. Lets a test
   * drive scoring and profile aggregation without reverse-engineering the fixture.
   */
  verdict?: Grade['verdict']
  /**
   * Return an evidence quote that is not in the answer. Exercises the
   * verification path that drops fabricated quotes.
   */
  fabricateEvidence?: boolean
}

/**
 * Demo provider.
 *
 * Replays token-by-token with jittered timing rather than resolving instantly.
 * The thing being judged is the *experience of waiting*, so a mock that returned
 * in one shot would misrepresent the product (ARCHITECTURE §5).
 *
 * Emits no `thinking` chunks: demo mode has no real reasoning to report, and
 * inventing some is exactly what the product promises never to do.
 */
export function createMockProvider(options: MockProviderOptions = {}): AIProvider {
  const delayScale = options.delayScale ?? 1
  const failure = options.failure ?? 'none'

  return {
    mode: 'demo',

    async generateChallenge(prompt: string, signal: AbortSignal): Promise<Challenge> {
      const startedAt = Date.now()

      // Mirrors the real generator's latency, which is what the intent shimmer
      // is sized against.
      if (delayScale > 0) await sleep(700 * delayScale)
      if (signal.aborted) throw new Error('aborted')

      if (failure === 'challenge') {
        throw new StructuredOutputError('Mock challenge failure')
      }

      const category = classifyPrompt(prompt)
      const fixture = DEMO_CHALLENGES[category] ?? DEMO_FALLBACK

      return {
        id: `demo-${category}`,
        question: fixture.question,
        category,
        format: 'multiple_choice',
        model: 'demo-fixture',
        latencyMs: Date.now() - startedAt,
        options: fixture.options.map(([label, blurb], index) => ({
          id: OPTION_IDS[index] ?? 'D',
          label,
          blurb,
        })),
      }
    },

    async *streamAnswer(prompt: string, signal: AbortSignal): AsyncIterable<AnswerChunk> {
      const random = createRandom(hashString(prompt))
      const pieces = tokenize(DEMO_ANSWER)

      // Time to first token — a real request has connect + prefill latency.
      if (delayScale > 0) await sleep(320 * delayScale)

      let emitted = ''

      for (const piece of pieces) {
        if (signal.aborted) return

        // Fail partway through, so the client has a partially-filled buffer to
        // keep sealed — the interesting version of this failure.
        if (failure === 'answer' && emitted.length > 120) {
          throw new Error('Mock answer failure')
        }

        emitted += piece
        yield { kind: 'text', text: piece }

        if (delayScale > 0) {
          // ~14-40ms per token, with an occasional longer pause.
          const base = 14 + random() * 26
          const stall = random() > 0.94 ? 110 : 0
          await sleep((base + stall) * delayScale)
        }
      }

      if (signal.aborted) return

      yield {
        kind: 'done',
        text: emitted,
        // Rough token count for the demo replay. Real usage comes from the API.
        outputTokens: Math.round(emitted.length / 4),
        model: 'demo-fixture',
      }
    },

    async gradePrediction(input: GradeInput, signal: AbortSignal): Promise<Grade> {
      if (delayScale > 0) await sleep(420 * delayScale)
      if (signal.aborted) throw new Error('aborted')

      if (failure === 'grade') {
        throw new StructuredOutputError('Mock grading failure')
      }

      // Deterministic pseudo-truth, seeded on the challenge, so a given demo round
      // always grades the same way and the demo stays rehearsable.
      const seeded =
        input.challenge.options[
          hashString(input.challenge.id) % input.challenge.options.length
        ]?.id ?? 'A'

      const verdict =
        options.verdict ??
        (seeded === input.optionId
          ? 'hit'
          : hashString(input.answerText) % 3 === 0
            ? 'partial'
            : 'miss')

      // The verdict is authoritative; the option has to agree with it, or the
      // reveal shows "you called it" beside a different correct answer.
      const other =
        input.challenge.options.find((option) => option.id !== input.optionId)?.id ?? seeded
      const correctOptionId =
        verdict === 'hit' ? input.optionId : verdict === 'miss' ? other : seeded

      const candidate = options.fabricateEvidence
        ? 'a sentence the demo answer does not contain'
        : 'Everything around this text is real.'

      return {
        correctOptionId,
        verdict,
        score: brierScore(input.confidence, verdict),
        explanation:
          verdict === 'hit'
            ? 'Demo grading: your option matches the fixture answer.'
            : verdict === 'partial'
              ? 'Demo grading: your option is a secondary theme in the fixture answer.'
              : 'Demo grading: the fixture answer went a different way.',
        evidenceQuote: verifyEvidenceQuote(input.answerText, candidate),
      }
    },
  }
}
