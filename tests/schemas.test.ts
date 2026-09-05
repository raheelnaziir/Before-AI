import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { CHALLENGE } from './fixtures.ts'
import {
  ChallengeSchema,
  GeneratedChallengeSchema,
  GeneratedGradeSchema,
  GradeRequestSchema,
  StreamRequestSchema,
} from '../lib/ai/schemas.ts'

describe('StreamRequestSchema', () => {
  it('accepts a normal prompt and trims it', () => {
    const parsed = StreamRequestSchema.safeParse({ prompt: '  Postgres or Mongo?  ' })
    assert.equal(parsed.success, true)
    assert.equal(parsed.data?.prompt, 'Postgres or Mongo?')
  })

  it('rejects an empty or trivial prompt', () => {
    assert.equal(StreamRequestSchema.safeParse({ prompt: '' }).success, false)
    assert.equal(StreamRequestSchema.safeParse({ prompt: 'ab' }).success, false)
  })

  it('rejects an unbounded prompt — an unbounded prompt is an unbounded bill', () => {
    assert.equal(StreamRequestSchema.safeParse({ prompt: 'x'.repeat(1_001) }).success, false)
  })

  it('rejects a non-string prompt', () => {
    assert.equal(StreamRequestSchema.safeParse({ prompt: 42 }).success, false)
    assert.equal(StreamRequestSchema.safeParse({}).success, false)
  })
})

describe('GeneratedChallengeSchema — what the model is constrained to', () => {
  const valid = {
    question: 'What will it blame?',
    category: 'debugging',
    options: [
      { id: 'A', label: 'StrictMode double-invoke', blurb: 'Development-only, and it looks exactly like this.' },
      { id: 'B', label: 'A missing dependency array', blurb: 'The most common cause in real code.' },
      { id: 'C', label: 'A stale closure', blurb: 'Captures an old value and re-runs.' },
    ],
  }

  it('accepts a well-formed challenge', () => {
    assert.equal(GeneratedChallengeSchema.safeParse(valid).success, true)
  })

  it('accepts four options', () => {
    const four = {
      ...valid,
      options: [...valid.options, { id: 'D', label: 'Parent re-render', blurb: 'Cascades down.' }],
    }
    assert.equal(GeneratedChallengeSchema.safeParse(four).success, true)
  })

  it('rejects fewer than three options — two is a coin flip, not a challenge', () => {
    assert.equal(
      GeneratedChallengeSchema.safeParse({ ...valid, options: valid.options.slice(0, 2) }).success,
      false,
    )
  })

  it('rejects more than four options', () => {
    const five = {
      ...valid,
      options: [
        ...valid.options,
        { id: 'D', label: 'd', blurb: 'd' },
        { id: 'A', label: 'e', blurb: 'e' },
      ],
    }
    assert.equal(GeneratedChallengeSchema.safeParse(five).success, false)
  })

  it('rejects an unknown category', () => {
    assert.equal(
      GeneratedChallengeSchema.safeParse({ ...valid, category: 'philosophy' }).success,
      false,
    )
  })

  it('rejects an option id outside A–D', () => {
    assert.equal(
      GeneratedChallengeSchema.safeParse({
        ...valid,
        options: [{ id: 'E', label: 'x', blurb: 'y' }, ...valid.options.slice(1)],
      }).success,
      false,
    )
  })

  it('has no field through which the answer could arrive', () => {
    const keys = Object.keys(GeneratedChallengeSchema.shape)
    assert.deepEqual(keys.sort(), ['category', 'options', 'question'])
  })
})

describe('ChallengeSchema — what the client consumes', () => {
  it('accepts a stamped challenge', () => {
    assert.equal(ChallengeSchema.safeParse(CHALLENGE).success, true)
  })

  it('rejects a challenge missing the server-stamped fields', () => {
    const { model: _model, ...withoutModel } = CHALLENGE
    assert.equal(ChallengeSchema.safeParse(withoutModel).success, false)
  })

  it('rejects a negative latency', () => {
    assert.equal(ChallengeSchema.safeParse({ ...CHALLENGE, latencyMs: -1 }).success, false)
  })
})

describe('GeneratedGradeSchema', () => {
  const valid = {
    correctOptionId: 'A',
    verdict: 'hit',
    explanation: 'You picked Postgres and the answer led with it.',
    evidenceQuote: 'Range queries on a timestamp index',
  }

  it('accepts a well-formed grade', () => {
    assert.equal(GeneratedGradeSchema.safeParse(valid).success, true)
  })

  it('accepts an empty evidence quote — the honest "no quote" answer', () => {
    assert.equal(GeneratedGradeSchema.safeParse({ ...valid, evidenceQuote: '' }).success, true)
  })

  it('rejects an unknown verdict', () => {
    assert.equal(GeneratedGradeSchema.safeParse({ ...valid, verdict: 'sort of' }).success, false)
  })

  it('does not accept a score — the score is arithmetic, not a model output', () => {
    assert.equal('score' in GeneratedGradeSchema.shape, false)
  })
})

describe('GradeRequestSchema', () => {
  const valid = {
    challenge: CHALLENGE,
    prediction: { optionId: 'A', confidence: 80 },
    answerText: 'Use Postgres.',
  }

  it('accepts a complete grade request', () => {
    assert.equal(GradeRequestSchema.safeParse(valid).success, true)
  })

  it('rejects a confidence outside 0..100', () => {
    assert.equal(
      GradeRequestSchema.safeParse({ ...valid, prediction: { optionId: 'A', confidence: 101 } })
        .success,
      false,
    )
    assert.equal(
      GradeRequestSchema.safeParse({ ...valid, prediction: { optionId: 'A', confidence: -1 } })
        .success,
      false,
    )
  })

  it('rejects an empty answer — there would be nothing to grade against', () => {
    assert.equal(GradeRequestSchema.safeParse({ ...valid, answerText: '' }).success, false)
  })

  it('rejects a malformed challenge', () => {
    assert.equal(
      GradeRequestSchema.safeParse({ ...valid, challenge: { question: 'q' } }).success,
      false,
    )
  })
})
