/**
 * Shared domain types.
 *
 * Mirrors ARCHITECTURE.md §7. Only the types this task actually needs are
 * defined here; the rest (Challenge, Prediction, Grade, CalibrationProfile)
 * land alongside the code that uses them, so nothing sits here unused.
 */

/** Round lifecycle. Seven states — `predicted` and `grading` stay distinct. */
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

/** `/api/health` payload. `mode` drives the demo-mode badge from Day 4. */
export interface HealthResponse {
  status: 'ok'
  mode: 'development' | 'production'
  version: string
}
