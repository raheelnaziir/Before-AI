/**
 * Shared domain types.
 *
 * Mirrors ARCHITECTURE.md §7.
 */

/**
 * Round lifecycle.
 *
 * `grading` and `completed` are deliberately distinct: the reveal opens the
 * moment the Commitment Gate conditions hold, and the verdict lands a beat
 * later. Conflating them is what produces a reveal that flashes an ungraded
 * verdict for 400ms.
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
}

/**
 * A locked prediction. Immutable once created — the reducer refuses a second
 * LOCK, which is what makes the commitment real rather than advisory.
 */
export interface Prediction {
  optionId: OptionId
  /** 0..100. Feeds the Brier score. */
  confidence: number
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

export type GradeVerdict = 'hit' | 'partial' | 'miss'

export interface Grade {
  correctOptionId: OptionId
  verdict: GradeVerdict
  /** 0..100, Brier-calibrated. Computed server-side, never by the model. */
  score: number
  /** ≤ 40 words. */
  explanation: string
  /**
   * Verbatim span from the answer, or `null` when the model's quote could not be
   * found in the answer. Never a paraphrase — an unverifiable quote is dropped.
   */
  evidenceQuote: string | null
}

export interface CategoryStats {
  n: number
  hits: number
  accuracy: number
  avgScore: number
}

export interface CalibrationProfile {
  version: 1
  totalRounds: number
  hits: number
  partials: number
  misses: number
  /** (hits + 0.5·partials) / total, as 0..1. */
  accuracy: number
  avgConfidence: number
  /** The headline calibration number. */
  avgScore: number
  /** avgConfidence − accuracy·100. Positive means overconfident. */
  overconfidenceIndex: number
  streak: number
  bestStreak: number
  byCategory: Partial<Record<Category, CategoryStats>>
  updatedAt: number
}

/**
 * A completed round, as persisted.
 *
 * Deliberately not the whole `Round`: the answer text is the largest thing in a
 * round and history never renders it, so keeping it out bounds the localStorage
 * footprint at 50 entries.
 */
export interface RoundRecord {
  id: string
  createdAt: number
  prompt: string
  category: Category
  question: string
  optionId: OptionId
  optionLabel: string
  confidence: number
  verdict: GradeVerdict
  score: number
  correctOptionId: OptionId
  lockedBeforeAnswer: boolean
}

/** `/api/health` payload. */
export interface HealthResponse {
  status: 'ok'
  mode: 'development' | 'production'
  /** Which provider a round would use right now. */
  provider: ProviderMode
  version: string
}
