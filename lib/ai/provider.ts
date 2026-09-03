import type { ProviderMode } from '@/types'

/**
 * One piece of a streaming answer.
 *
 * `thinking` carries the model's own summarized reasoning. It is real, never
 * synthesised — but it is *not* rendered in this build; the reasoning ticker is
 * a later task, so for now it only drives a boolean "reasoning" status.
 */
export type AnswerChunk =
  | { kind: 'text'; text: string }
  | { kind: 'thinking'; text: string }
  | {
      kind: 'done'
      text: string
      outputTokens: number
      model: string
    }

/** Provider is not usable — e.g. live mode selected with no API key. */
export class ConfigurationError extends Error {
  constructor(message = 'AI provider is not configured') {
    super(message)
    this.name = 'ConfigurationError'
  }
}

/** The model declined the prompt (`stop_reason: "refusal"`). */
export class RefusalError extends Error {
  constructor(message = 'The model declined to answer') {
    super(message)
    this.name = 'RefusalError'
  }
}

/**
 * Assert a usable API key, or fail with an error that carries no key material.
 *
 * Split out from the Anthropic adapter so the guard is unit-testable without
 * importing the SDK.
 */
export function requireApiKey(key: string | undefined): string {
  const trimmed = key?.trim()
  if (!trimmed) throw new ConfigurationError()
  return trimmed
}

/**
 * The AI seam.
 *
 * Thin by design — there are only three things we ask a model to do.
 * `generateChallenge` and `gradePrediction` join this interface with the tasks
 * that implement them; declaring them now as throwing stubs would just be dead
 * code. See ARCHITECTURE.md §5.
 */
export interface AIProvider {
  readonly mode: ProviderMode
  /** Streams the answer. Must stop promptly when `signal` aborts. */
  streamAnswer(prompt: string, signal: AbortSignal): AsyncIterable<AnswerChunk>
}
