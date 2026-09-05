import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { brierScore } from '../lib/scoring/brier.ts'
import {
  applyRound,
  emptyProfile,
  overconfidenceNote,
  profileFromHistory,
  type RoundOutcome,
} from '../lib/scoring/profile.ts'
import type { CalibrationProfile, GradeVerdict, RoundRecord } from '../types/index.ts'

const T0 = 1_700_000_000_000

function outcome(
  verdict: GradeVerdict,
  confidence: number,
  category: RoundOutcome['category'] = 'technical',
  at = T0,
): RoundOutcome {
  return { verdict, confidence, category, score: brierScore(confidence, verdict), at }
}

/** Fold a series of outcomes into a fresh profile. */
function fold(outcomes: RoundOutcome[]): CalibrationProfile {
  return outcomes.reduce(applyRound, emptyProfile())
}

describe('profile — a single round', () => {
  it('records a hit', () => {
    const profile = applyRound(emptyProfile(), outcome('hit', 80))
    assert.equal(profile.totalRounds, 1)
    assert.equal(profile.hits, 1)
    assert.equal(profile.accuracy, 1)
    assert.equal(profile.avgConfidence, 80)
    assert.equal(profile.avgScore, 96)
    assert.equal(profile.streak, 1)
    assert.equal(profile.bestStreak, 1)
  })

  it('records a miss', () => {
    const profile = applyRound(emptyProfile(), outcome('miss', 90))
    assert.equal(profile.misses, 1)
    assert.equal(profile.accuracy, 0)
    assert.equal(profile.streak, 0)
    // 90% confident and wrong: avgConfidence 90 − accuracy 0 = +90.
    assert.equal(profile.overconfidenceIndex, 90)
  })

  it('weights a partial at half in accuracy', () => {
    const profile = applyRound(emptyProfile(), outcome('partial', 50))
    assert.equal(profile.partials, 1)
    assert.equal(profile.accuracy, 0.5)
  })
})

describe('profile — running aggregates', () => {
  it('averages confidence and score across rounds', () => {
    const profile = fold([outcome('hit', 100), outcome('miss', 0)])
    assert.equal(profile.totalRounds, 2)
    assert.equal(profile.avgConfidence, 50)
    // 100 and 100 — both perfectly calibrated in opposite directions.
    assert.equal(profile.avgScore, 100)
    assert.equal(profile.accuracy, 0.5)
    assert.equal(profile.overconfidenceIndex, 0, 'perfectly calibrated overall')
  })

  it('counts each verdict exactly once', () => {
    const profile = fold([
      outcome('hit', 70),
      outcome('hit', 60),
      outcome('partial', 50),
      outcome('miss', 80),
    ])
    assert.equal(profile.hits, 2)
    assert.equal(profile.partials, 1)
    assert.equal(profile.misses, 1)
    assert.equal(profile.totalRounds, 4)
    // (2 + 0.5) / 4
    assert.equal(profile.accuracy, 0.625)
  })

  it('detects overconfidence', () => {
    const profile = fold([outcome('miss', 90), outcome('miss', 85), outcome('hit', 95)])
    assert.ok(profile.overconfidenceIndex > 15, `expected clear overconfidence, got ${profile.overconfidenceIndex}`)
  })

  it('detects underconfidence', () => {
    const profile = fold([outcome('hit', 30), outcome('hit', 25), outcome('hit', 35)])
    assert.ok(profile.overconfidenceIndex < -15, `expected underconfidence, got ${profile.overconfidenceIndex}`)
  })

  it('clamps a nonsense confidence rather than poisoning the average', () => {
    const profile = fold([{ ...outcome('hit', 80), confidence: 400 }])
    assert.equal(profile.avgConfidence, 100)
  })
})

describe('profile — streaks', () => {
  it('a miss breaks the streak, a partial holds it', () => {
    const profile = fold([
      outcome('hit', 70),
      outcome('hit', 70),
      outcome('partial', 60),
      outcome('hit', 70),
    ])
    assert.equal(profile.streak, 3, 'the partial held the streak without extending it')
    assert.equal(profile.bestStreak, 3)

    const broken = applyRound(profile, outcome('miss', 70))
    assert.equal(broken.streak, 0)
    assert.equal(broken.bestStreak, 3, 'the best streak survives')
  })
})

describe('profile — per-category breakdown', () => {
  it('tracks categories independently', () => {
    const profile = fold([
      outcome('hit', 80, 'technical'),
      outcome('miss', 80, 'creative'),
      outcome('hit', 60, 'technical'),
    ])

    assert.equal(profile.byCategory.technical?.n, 2)
    assert.equal(profile.byCategory.technical?.hits, 2)
    assert.equal(profile.byCategory.technical?.accuracy, 1)
    assert.equal(profile.byCategory.creative?.n, 1)
    assert.equal(profile.byCategory.creative?.accuracy, 0)
    assert.equal(profile.byCategory.research, undefined)
  })

  it('halves a partial inside a category too', () => {
    const profile = fold([
      outcome('hit', 70, 'debugging'),
      outcome('partial', 70, 'debugging'),
    ])
    assert.equal(profile.byCategory.debugging?.accuracy, 0.75)
    assert.equal(profile.byCategory.debugging?.hits, 1)
  })
})

describe('profile — rebuild from history', () => {
  const record = (
    id: string,
    verdict: GradeVerdict,
    confidence: number,
    createdAt: number,
  ): RoundRecord => ({
    id,
    createdAt,
    prompt: 'p',
    category: 'technical',
    question: 'q',
    optionId: 'A',
    optionLabel: 'label',
    confidence,
    verdict,
    score: brierScore(confidence, verdict),
    correctOptionId: verdict === 'hit' ? 'A' : 'B',
    lockedBeforeAnswer: true,
  })

  it('reproduces the incrementally-built profile', () => {
    const history = [
      record('1', 'hit', 80, T0),
      record('2', 'miss', 90, T0 + 1_000),
      record('3', 'partial', 50, T0 + 2_000),
    ]

    const rebuilt = profileFromHistory(history)
    const incremental = fold([
      outcome('hit', 80, 'technical', T0),
      outcome('miss', 90, 'technical', T0 + 1_000),
      outcome('partial', 50, 'technical', T0 + 2_000),
    ])

    assert.deepEqual(rebuilt, incremental)
  })

  it('orders by timestamp so streaks are chronological', () => {
    // Newest-first, as stored.
    const history = [
      record('3', 'hit', 70, T0 + 2_000),
      record('2', 'hit', 70, T0 + 1_000),
      record('1', 'miss', 70, T0),
    ]
    assert.equal(profileFromHistory(history).streak, 2)
  })

  it('an empty history yields an empty profile', () => {
    assert.deepEqual(profileFromHistory([]), emptyProfile())
  })
})

describe('overconfidence note', () => {
  it('reads as the shareable line at the extremes', () => {
    assert.match(overconfidenceNote(20), /more than you should/i)
    assert.match(overconfidenceNote(-20), /better than you think/i)
    assert.match(overconfidenceNote(0), /calibrated/i)
  })
})
