/**
 * Shared domain types.
 *
 * Mirrors ARCHITECTURE.md §7. Grade and CalibrationProfile are absent on
 * purpose — they arrive with grading and the profile, so nothing sits here
 * unused.
 */

/**
 * Round lifecycle.
 *
 * `grading` and `degraded` are declared but unreachable until grading and the
 * real challenge generator land.
 */
export type RoundStatus =
  | 'idle'
  | 'processing'
  | 'challenge_ready'
  | 'predicted'
  | 'grading'
  | 'completed'
  | 'degraded'
  | 'error'

/** Prompt category. Drives the profile breakdown and the intent shimmer. */
export type Category =
  | 'technical'
  | 'debugging'
  | 'research'
  | 'recommendation'
  | 'creative'
  | 'analysis'
  | 'planning'
  | 'other'

export type OptionId = 'A' | 'B' | 'C' | 'D'

/** Whether the round ran against the real API or the built-in demo replay. */
export type ProviderMode = 'live' | 'demo'

export interface ChallengeOption {
  id: OptionId
  /** ≤ 8 words — scannable in the seconds the user actually has. */
  label: string
  /** ≤ 20 words — the case *for* this option. */
  blurb: string
}

export interface Challenge {
  id: string
  /** About the answer's content, e.g. "What will it blame?" */
  question: string
  category: Category
  options: ChallengeOption[]
  format: 'multiple_choice'
  model: string
  latencyMs: number
  /** True while this is the hardcoded stand-in rather than a generated challenge. */
  isPlaceholder: boolean
}

/**
 * A locked prediction.
 *
 * `confidence` joins this once the slider exists; scoring needs it, and nothing
 * here does yet.
 */
export interface Prediction {
  optionId: OptionId
  /** Relative to round start. */
  lockedAtMs: number
  /** Did the user commit before the model finished? The race, recorded. */
  lockedBeforeAnswer: boolean
}

export interface AnswerResult {
  text: string
  model: string
  outputTokens: number
  latencyMs: number
}

/** `/api/health` payload. */
export interface HealthResponse {
  status: 'ok'
  mode: 'development' | 'production'
  /** Which provider a round would use right now. */
  provider: ProviderMode
  version: string
}
