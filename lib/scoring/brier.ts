import type { GradeVerdict } from '@/types'

/**
 * Brier-style calibration score.
 *
 * ```
 * outcome = hit 1.0 | partial 0.5 | miss 0.0
 * c       = confidence / 100
 * score   = round(100 × (1 − (c − outcome)²))
 * ```
 *
 * Accuracy alone is an un-actionable number: it rewards guessing and punishes
 * honesty equally. This rewards *knowing what you know* — a hedged miss beats a
 * confident one, and a hedged hit is worth less than a confident one.
 *
 * | Confidence | Verdict | Score |
 * |---|---|---|
 * | 95% | hit | 100 |
 * | 95% | miss | 10 |
 * | 50% | either | 75 |
 *
 * Computed here rather than asked of the grader: this is the headline number on
 * the profile, and a number a judge can check with a calculator must not come out
 * of a language model.
 */

const OUTCOME: Record<GradeVerdict, number> = {
  hit: 1,
  partial: 0.5,
  miss: 0,
}

/** Numeric outcome for a verdict. Exported for the profile aggregation. */
export function outcomeValue(verdict: GradeVerdict): number {
  return OUTCOME[verdict]
}

/**
 * Score a prediction. `confidence` is 0..100 and is clamped, so a malformed
 * client payload degrades to a valid score instead of a NaN on screen.
 */
export function brierScore(confidence: number, verdict: GradeVerdict): number {
  const c = clampConfidence(confidence) / 100
  const outcome = OUTCOME[verdict]
  const error = c - outcome
  return Math.round(100 * (1 - error * error))
}

/** 0..100, with NaN mapped to the neutral midpoint rather than propagating. */
export function clampConfidence(confidence: number): number {
  if (!Number.isFinite(confidence)) return 50
  return Math.min(100, Math.max(0, confidence))
}

/**
 * One-line reading of the score, shown beside it.
 *
 * The wording is chosen so a miss reads as *fair* rather than punishing — the
 * verdict the user disagrees with is the one that breaks trust in the product.
 */
export function calibrationNote(confidence: number, verdict: GradeVerdict): string {
  const c = clampConfidence(confidence)

  if (verdict === 'hit') {
    if (c >= 80) return 'Confident and correct. That is what calibration looks like.'
    if (c >= 50) return 'Right, and you hedged. Trust yourself a little more.'
    return 'Right, but you barely backed it. You knew more than you thought.'
  }

  if (verdict === 'partial') {
    if (c >= 80) return 'Close, but you were very sure about it.'
    return 'A near miss, honestly hedged.'
  }

  if (c >= 80) return 'Overconfident on that one. The expensive kind of wrong.'
  if (c >= 50) return 'Wrong, but you left yourself room.'
  return 'Wrong — and you already suspected it. Well hedged.'
}
