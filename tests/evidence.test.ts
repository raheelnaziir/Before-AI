import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { verifyEvidenceQuote } from '../lib/ai/evidence.ts'

const ANSWER = `Use Postgres. Range queries on a timestamp index are its home turf, and
an append-heavy workload is not the bottleneck people assume it is.

The one case for MongoDB is a genuinely variable event shape.`

describe('evidence verification — accepts real quotes', () => {
  it('accepts a verbatim span', () => {
    assert.equal(
      verifyEvidenceQuote(ANSWER, 'Range queries on a timestamp index'),
      'Range queries on a timestamp index',
    )
  })

  it('accepts a span that crosses a line break, returning the original text', () => {
    // The model will almost always re-wrap this to a single space.
    const result = verifyEvidenceQuote(ANSWER, 'the bottleneck people assume it is')
    assert.equal(result, 'the bottleneck people assume it is')
  })

  it('tolerates whitespace re-wrapping and returns the ANSWER’s own text', () => {
    const result = verifyEvidenceQuote(ANSWER, 'its home turf, and an append-heavy workload')
    assert.notEqual(result, null)
    // The returned value is a slice of the answer, newline and all — not the
    // model's single-spaced rendering of it.
    assert.ok(ANSWER.includes(result as string))
    assert.match(result as string, /\n/)
  })

  it('strips surrounding quotation marks the model added', () => {
    assert.equal(
      verifyEvidenceQuote(ANSWER, '"Range queries on a timestamp index"'),
      'Range queries on a timestamp index',
    )
    assert.equal(
      verifyEvidenceQuote(ANSWER, '“Range queries on a timestamp index”'),
      'Range queries on a timestamp index',
    )
  })

  it('strips leading and trailing ellipses', () => {
    assert.equal(
      verifyEvidenceQuote(ANSWER, '...Range queries on a timestamp index...'),
      'Range queries on a timestamp index',
    )
    assert.equal(
      verifyEvidenceQuote(ANSWER, '…Range queries on a timestamp index'),
      'Range queries on a timestamp index',
    )
  })
})

describe('evidence verification — rejects fabrications', () => {
  it('rejects a quote the answer does not contain', () => {
    assert.equal(verifyEvidenceQuote(ANSWER, 'Postgres cannot handle this workload'), null)
  })

  it('rejects a paraphrase, however close', () => {
    // The answer says "are its home turf"; this says "is its home turf".
    assert.equal(
      verifyEvidenceQuote(ANSWER, 'Range queries on a timestamp index is its home turf'),
      null,
    )
  })

  it('rejects a quote with an interior word changed', () => {
    assert.equal(verifyEvidenceQuote(ANSWER, 'Range queries on a datetime index'), null)
  })

  it('rejects an empty or whitespace-only quote', () => {
    assert.equal(verifyEvidenceQuote(ANSWER, ''), null)
    assert.equal(verifyEvidenceQuote(ANSWER, '   '), null)
    assert.equal(verifyEvidenceQuote(ANSWER, '"..."'), null)
  })

  it('rejects a fragment too short to be evidence', () => {
    // Present in the answer, but "Use" proves nothing.
    assert.equal(verifyEvidenceQuote(ANSWER, 'Use'), null)
  })

  it('rejects a quote long enough to be the whole answer', () => {
    const long = 'x'.repeat(500)
    assert.equal(verifyEvidenceQuote(`prefix ${long} suffix`, long), null)
  })

  it('never returns text that is not in the answer', () => {
    const candidates = [
      'Range queries on a timestamp index',
      'its   home    turf',
      'not in here at all',
      '"quoted"',
      'Use Postgres.',
    ]
    for (const candidate of candidates) {
      const result = verifyEvidenceQuote(ANSWER, candidate)
      if (result !== null) {
        assert.ok(
          ANSWER.includes(result),
          `verified quote must be a real slice of the answer: ${result}`,
        )
      }
    }
  })
})
