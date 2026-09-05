import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { brierScore, calibrationNote, clampConfidence, outcomeValue } from '../lib/scoring/brier.ts'

/**
 * The score is the product's central claim and it is invisible when wrong — a
 * judge would have to do the arithmetic to notice. Hence the table.
 */
describe('brier score — the documented table', () => {
  it('95% confident and right scores 100', () => {
    // 100 × (1 − (0.95 − 1)²) = 99.75 → 100
    assert.equal(brierScore(95, 'hit'), 100)
  })

  it('95% confident and wrong scores 10', () => {
    // 100 × (1 − 0.95²) = 9.75 → 10
    assert.equal(brierScore(95, 'miss'), 10)
  })

  it('50% scores 75 either way — the honest hedge', () => {
    assert.equal(brierScore(50, 'hit'), 75)
    assert.equal(brierScore(50, 'miss'), 75)
  })
})

describe('brier score — boundaries', () => {
  it('100% confident: perfect when right, zero when wrong', () => {
    assert.equal(brierScore(100, 'hit'), 100)
    assert.equal(brierScore(100, 'miss'), 0)
  })

  it('0% confident: zero when right, perfect when wrong', () => {
    assert.equal(brierScore(0, 'hit'), 0)
    assert.equal(brierScore(0, 'miss'), 100)
  })

  it('a partial peaks at 50% confidence', () => {
    assert.equal(brierScore(50, 'partial'), 100)
    assert.equal(brierScore(100, 'partial'), 75)
    assert.equal(brierScore(0, 'partial'), 75)
  })

  it('is monotonic in confidence for a hit', () => {
    const scores = [0, 25, 50, 75, 100].map((c) => brierScore(c, 'hit'))
    for (let i = 1; i < scores.length; i++) {
      assert.ok(scores[i]! > scores[i - 1]!, `hit score must rise with confidence: ${scores}`)
    }
  })

  it('is monotonic downwards in confidence for a miss', () => {
    const scores = [0, 25, 50, 75, 100].map((c) => brierScore(c, 'miss'))
    for (let i = 1; i < scores.length; i++) {
      assert.ok(scores[i]! < scores[i - 1]!, `miss score must fall with confidence: ${scores}`)
    }
  })

  it('never leaves 0..100', () => {
    for (let c = -50; c <= 150; c += 7) {
      for (const verdict of ['hit', 'partial', 'miss'] as const) {
        const score = brierScore(c, verdict)
        assert.ok(score >= 0 && score <= 100, `${c}/${verdict} → ${score}`)
      }
    }
  })
})

describe('confidence clamping', () => {
  it('bounds to 0..100', () => {
    assert.equal(clampConfidence(-10), 0)
    assert.equal(clampConfidence(140), 100)
    assert.equal(clampConfidence(62), 62)
  })

  it('maps a non-finite confidence to the neutral midpoint rather than NaN', () => {
    assert.equal(clampConfidence(Number.NaN), 50)
    assert.equal(clampConfidence(Number.POSITIVE_INFINITY), 50)
    assert.ok(Number.isInteger(brierScore(Number.NaN, 'hit')))
  })
})

describe('outcome values', () => {
  it('weights a partial at exactly one half', () => {
    assert.equal(outcomeValue('hit'), 1)
    assert.equal(outcomeValue('partial'), 0.5)
    assert.equal(outcomeValue('miss'), 0)
  })
})

describe('calibration note', () => {
  it('distinguishes a confident hit from a hedged one', () => {
    assert.notEqual(calibrationNote(95, 'hit'), calibrationNote(30, 'hit'))
  })

  it('names overconfidence on a confident miss', () => {
    assert.match(calibrationNote(95, 'miss'), /overconfident/i)
  })

  it('credits a hedged miss rather than scolding it', () => {
    assert.doesNotMatch(calibrationNote(10, 'miss'), /overconfident/i)
  })

  it('always says something', () => {
    for (const c of [0, 25, 50, 75, 100]) {
      for (const verdict of ['hit', 'partial', 'miss'] as const) {
        assert.ok(calibrationNote(c, verdict).length > 0)
      }
    }
  })
})
