import type { Challenge, Grade, OptionId, ProviderMode } from '@/types'

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

/** Structured output came back unparseable or schema-invalid. */
export class StructuredOutputError extends Error {
  constructor(message = 'The model returned no usable structured output') {
    super(message)
    this.name = 'StructuredOutputError'
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
 * Input to grading.
 *
 * `answerText` is present because grading runs *after* the reveal — this is the
 * one place in the app where a model is allowed to see both the prediction and
 * the answer. The challenge generator gets a bare prompt and nothing else.
 */
export interface GradeInput {
  challenge: Challenge
  optionId: OptionId
  confidence: number
  answerText: string
}

/**
 * The AI seam.
 *
 * Thin by design — there are exactly three things we ask a model to do
 * (ARCHITECTURE §5). The signatures encode the honesty guarantee:
 * `generateChallenge` takes a prompt and nothing else, so no implementation of
 * this interface *can* leak the answer into the challenge.
 */
export interface AIProvider {
  readonly mode: ProviderMode
  /**
   * Generates the challenge from the prompt alone.
   *
   * Returns a challenge without `id`/`latencyMs` filled in the way the caller
   * wants? No — it returns a complete `Challenge`; the adapter stamps `model` and
   * the measured latency, because only it knows them.
   */
  generateChallenge(prompt: string, signal: AbortSignal): Promise<Challenge>
  /** Streams the answer. Must stop promptly when `signal` aborts. */
  streamAnswer(prompt: string, signal: AbortSignal): AsyncIterable<AnswerChunk>
  /** Grades a locked prediction against the finished answer. */
  gradePrediction(input: GradeInput, signal: AbortSignal): Promise<Grade>
}
