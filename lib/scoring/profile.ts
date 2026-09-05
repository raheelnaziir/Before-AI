import { clampConfidence, outcomeValue } from './brier'
import type {
  CalibrationProfile,
  Category,
  CategoryStats,
  GradeVerdict,
  RoundRecord,
} from '@/types'

export const emptyProfile = (): CalibrationProfile => ({
  version: 1,
  totalRounds: 0,
  hits: 0,
  partials: 0,
  misses: 0,
  accuracy: 0,
  avgConfidence: 0,
  avgScore: 0,
  overconfidenceIndex: 0,
  streak: 0,
  bestStreak: 0,
  byCategory: {},
  updatedAt: 0,
})

export interface RoundOutcome {
  category: Category
  verdict: GradeVerdict
  confidence: number
  score: number
  at: number
}

/**
 * Fold one completed round into the profile.
 *
 * Incremental rather than a recompute over history: the profile is the source of
 * truth for the headline numbers, so it must stay correct even if history has
 * been trimmed to its 50-round cap. Running means are kept as running means for
 * the same reason.
 */
export function applyRound(
  profile: CalibrationProfile,
  outcome: RoundOutcome,
): CalibrationProfile {
  const confidence = clampConfidence(outcome.confidence)
  const n = profile.totalRounds
  const next = n + 1

  const hits = profile.hits + (outcome.verdict === 'hit' ? 1 : 0)
  const partials = profile.partials + (outcome.verdict === 'partial' ? 1 : 0)
  const misses = profile.misses + (outcome.verdict === 'miss' ? 1 : 0)

  // A partial counts half — the same weighting the score uses, so accuracy and
  // the overconfidence index are measured against the same scale.
  const accuracy = (hits + 0.5 * partials) / next

  const avgConfidence = (profile.avgConfidence * n + confidence) / next
  const avgScore = (profile.avgScore * n + outcome.score) / next

  // A miss breaks the streak; a partial holds it without extending it, because
  // resetting on a near-miss reads as unfair and rewarding it reads as cheap.
  const streak =
    outcome.verdict === 'hit'
      ? profile.streak + 1
      : outcome.verdict === 'miss'
        ? 0
        : profile.streak

  return {
    version: 1,
    totalRounds: next,
    hits,
    partials,
    misses,
    accuracy: round3(accuracy),
    avgConfidence: round1(avgConfidence),
    avgScore: round1(avgScore),
    overconfidenceIndex: round1(avgConfidence - accuracy * 100),
    streak,
    bestStreak: Math.max(profile.bestStreak, streak),
    byCategory: applyCategory(profile.byCategory, outcome),
    updatedAt: outcome.at,
  }
}

function applyCategory(
  byCategory: CalibrationProfile['byCategory'],
  outcome: RoundOutcome,
): CalibrationProfile['byCategory'] {
  const prior: CategoryStats =
    byCategory[outcome.category] ?? { n: 0, hits: 0, accuracy: 0, avgScore: 0 }

  const n = prior.n + 1
  const hits = prior.hits + (outcome.verdict === 'hit' ? 1 : 0)
  // Recovered from the running accuracy so partials keep their half-weight
  // without storing a fourth counter per category.
  const weighted = prior.accuracy * prior.n + outcomeValue(outcome.verdict)

  return {
    ...byCategory,
    [outcome.category]: {
      n,
      hits,
      accuracy: round3(weighted / n),
      avgScore: round1((prior.avgScore * prior.n + outcome.score) / n),
    },
  }
}

/** Build a profile from scratch. Used to repair a corrupt profile from history. */
export function profileFromHistory(records: readonly RoundRecord[]): CalibrationProfile {
  // Oldest first, so `streak` reflects the real chronology.
  return [...records]
    .sort((a, b) => a.createdAt - b.createdAt)
    .reduce(
      (profile, record) =>
        applyRound(profile, {
          category: record.category,
          verdict: record.verdict,
          confidence: record.confidence,
          score: record.score,
          at: record.createdAt,
        }),
      emptyProfile(),
    )
}

/**
 * The shareable line. Sign matters more than magnitude here — "you trust yourself
 * more than you should" is the sentence people screenshot.
 */
export function overconfidenceNote(index: number): string {
  if (index >= 15) return 'You trust yourself more than you should'
  if (index >= 5) return 'Slightly overconfident'
  if (index > -5) return 'Well calibrated'
  if (index > -15) return 'Slightly underconfident'
  return "You're better than you think"
}

const round1 = (n: number) => Math.round(n * 10) / 10
const round3 = (n: number) => Math.round(n * 1000) / 1000
