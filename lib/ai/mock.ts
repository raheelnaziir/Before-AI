import type { AIProvider, AnswerChunk } from './provider'

/**
 * Demo-mode answer.
 *
 * Says what it is. An unlabelled canned answer rendered under an "AI ANSWER"
 * heading would be deceptive, and demo mode exists so judges can run the app
 * without a key — not so it can pass for live inference.
 *
 * Replaced on Day 12 by per-prompt fixtures captured from real runs.
 */
const DEMO_ANSWER = `Demo mode — this text is a canned fixture, not live inference. Add ANTHROPIC_API_KEY to .env.local and reload to get a real answer.

Everything around this text is real. The answer streamed in over SSE, accumulated into a hidden buffer, and stayed hidden until you locked your prediction. The Commitment Gate, the race between you and the model, and the reveal all behave exactly as they do against the live API. Only the words you are reading were written in advance.

For reference: the live answer model is claude-opus-5 with adaptive thinking and a 64,000 token output ceiling. A real answer opens with a direct position, backs it with two or three concrete specifics, and names the main trade-off instead of hedging — which is what makes it worth predicting in the first place.`

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

export interface MockProviderOptions {
  /**
   * Multiplier on replay delays. 1 reproduces realistic streaming; 0 removes all
   * waiting, which is what tests want.
   */
  delayScale?: number
}

/**
 * Demo provider.
 *
 * Replays token-by-token with jittered timing rather than resolving instantly.
 * The thing being judged is the *experience of waiting*, so a mock that returns
 * in one shot would misrepresent the product (ARCHITECTURE §5).
 *
 * Emits no `thinking` chunks: demo mode has no real reasoning to report, and
 * inventing some is exactly what the product promises never to do.
 */
export function createMockProvider(options: MockProviderOptions = {}): AIProvider {
  const delayScale = options.delayScale ?? 1

  return {
    mode: 'demo',

    async *streamAnswer(prompt: string, signal: AbortSignal): AsyncIterable<AnswerChunk> {
      const random = createRandom(hashString(prompt))
      const pieces = tokenize(DEMO_ANSWER)

      // Time to first token — a real request has connect + prefill latency.
      if (delayScale > 0) await sleep(320 * delayScale)

      let emitted = ''

      for (const piece of pieces) {
        if (signal.aborted) return

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
  }
}
