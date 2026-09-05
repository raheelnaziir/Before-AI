import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { CHALLENGE } from './fixtures.ts'
import { createMockProvider } from '../lib/ai/mock.ts'
import { ChallengeSchema } from '../lib/ai/schemas.ts'
import type { AnswerChunk } from '../lib/ai/provider.ts'

const NO_SIGNAL = () => new AbortController().signal

/** Drain the provider with no delays. */
async function drain(
  prompt: string,
  signal: AbortSignal = NO_SIGNAL(),
): Promise<AnswerChunk[]> {
  const provider = createMockProvider({ delayScale: 0 })
  const chunks: AnswerChunk[] = []
  for await (const chunk of provider.streamAnswer(prompt, signal)) chunks.push(chunk)
  return chunks
}

/** The finished answer text, as the client would see it. */
async function answerText(prompt: string): Promise<string> {
  const done = (await drain(prompt)).at(-1)
  assert.equal(done?.kind, 'done')
  return done?.kind === 'done' ? done.text : ''
}

describe('mock provider — answer stream', () => {
  it('reports demo mode', () => {
    assert.equal(createMockProvider().mode, 'demo')
  })

  it('streams text chunks and terminates with exactly one done chunk', async () => {
    const chunks = await drain('Postgres or Mongo?')
    const text = chunks.filter((c) => c.kind === 'text')
    const done = chunks.filter((c) => c.kind === 'done')

    assert.ok(text.length > 20, 'should stream many pieces, not one blob')
    assert.equal(done.length, 1)
    assert.equal(chunks.at(-1)?.kind, 'done')
  })

  it('accumulated deltas equal the final answer text', async () => {
    const chunks = await drain('Postgres or Mongo?')
    const accumulated = chunks
      .filter((c): c is Extract<AnswerChunk, { kind: 'text' }> => c.kind === 'text')
      .map((c) => c.text)
      .join('')
    const done = chunks.at(-1)
    assert.equal(done?.kind, 'done')
    if (done?.kind === 'done') assert.equal(accumulated, done.text)
  })

  it('emits no thinking chunks — demo mode has no real reasoning to report', async () => {
    const chunks = await drain('Postgres or Mongo?')
    assert.equal(chunks.filter((c) => c.kind === 'thinking').length, 0)
  })

  it('says it is demo output rather than passing for live inference', async () => {
    const chunks = await drain('Postgres or Mongo?')
    const done = chunks.at(-1)
    if (done?.kind === 'done') {
      assert.match(done.text, /demo mode/i)
      assert.equal(done.model, 'demo-fixture')
    }
  })

  it('is deterministic for a given prompt', async () => {
    const a = await drain('same prompt')
    const b = await drain('same prompt')
    assert.deepEqual(a, b)
  })

  it('stops promptly when the signal aborts mid-stream', async () => {
    const controller = new AbortController()
    const provider = createMockProvider({ delayScale: 0 })
    const chunks: AnswerChunk[] = []

    for await (const chunk of provider.streamAnswer('abort me', controller.signal)) {
      chunks.push(chunk)
      if (chunks.length === 5) controller.abort()
    }

    assert.equal(chunks.length, 5, 'iteration must stop on abort')
    assert.equal(
      chunks.some((c) => c.kind === 'done'),
      false,
      'an aborted stream must not report completion',
    )
  })

  it('applies real delays when delayScale is 1', async () => {
    const provider = createMockProvider({ delayScale: 1 })
    const startedAt = Date.now()
    const iterator = provider.streamAnswer('timing', new AbortController().signal)
    // Pull the first chunk only; time-to-first-token should be non-trivial.
    for await (const _chunk of iterator) break
    assert.ok(Date.now() - startedAt >= 250, 'demo mode must not resolve instantly')
  })
})

describe('mock provider — challenge generation', () => {
  it('produces a schema-valid challenge', async () => {
    const provider = createMockProvider({ delayScale: 0 })
    const challenge = await provider.generateChallenge(
      'Why does my useEffect fire twice?',
      NO_SIGNAL(),
    )
    assert.equal(ChallengeSchema.safeParse(challenge).success, true)
  })

  it('generates from the prompt alone — the signature admits no answer', async () => {
    const provider = createMockProvider({ delayScale: 0 })
    const challenge = await provider.generateChallenge('Postgres or Mongo?', NO_SIGNAL())
    const answer = await answerText('Postgres or Mongo?')

    // A challenge that quoted the answer would be a leak. Nothing in the
    // challenge may appear as a distinctive span of the answer.
    const strings = [
      challenge.question,
      ...challenge.options.flatMap((o) => [o.label, o.blurb]),
    ]
    for (const value of strings) {
      assert.equal(
        answer.includes(value),
        false,
        `challenge text must not be lifted from the answer: ${value}`,
      )
    }
  })

  it('varies with the prompt category', async () => {
    const provider = createMockProvider({ delayScale: 0 })
    const debugging = await provider.generateChallenge(
      'Why does this crash with an undefined error?',
      NO_SIGNAL(),
    )
    const research = await provider.generateChallenge(
      'What does the research say about remote work?',
      NO_SIGNAL(),
    )

    assert.equal(debugging.category, 'debugging')
    assert.equal(research.category, 'research')
    assert.notEqual(debugging.question, research.question)
  })

  it('sequentially ids its options', async () => {
    const provider = createMockProvider({ delayScale: 0 })
    const challenge = await provider.generateChallenge('anything', NO_SIGNAL())
    assert.deepEqual(
      challenge.options.map((o) => o.id),
      ['A', 'B', 'C'],
    )
  })

  it('surfaces a failure so the round can degrade', async () => {
    const provider = createMockProvider({ delayScale: 0, failure: 'challenge' })
    await assert.rejects(() => provider.generateChallenge('anything', NO_SIGNAL()))
  })

  it('takes a measurable amount of time at delayScale 1 — the shimmer covers it', async () => {
    const provider = createMockProvider({ delayScale: 1 })
    const startedAt = Date.now()
    await provider.generateChallenge('latency', NO_SIGNAL())
    assert.ok(Date.now() - startedAt >= 500)
  })
})

describe('mock provider — grading', () => {
  const answer =
    'Use Postgres. Everything around this text is real. Range queries are its home turf.'

  it('grades a prediction and scores it with the Brier formula', async () => {
    const provider = createMockProvider({ delayScale: 0, verdict: 'hit' })
    const grade = await provider.gradePrediction(
      { challenge: CHALLENGE, optionId: 'A', confidence: 80, answerText: answer },
      NO_SIGNAL(),
    )

    assert.equal(grade.verdict, 'hit')
    assert.equal(grade.correctOptionId, 'A')
    // 100 × (1 − (0.8 − 1)²) = 96
    assert.equal(grade.score, 96)
    assert.ok(grade.explanation.length > 0)
  })

  it('returns a verified evidence quote', async () => {
    const provider = createMockProvider({ delayScale: 0, verdict: 'hit' })
    const grade = await provider.gradePrediction(
      { challenge: CHALLENGE, optionId: 'A', confidence: 50, answerText: answer },
      NO_SIGNAL(),
    )
    assert.notEqual(grade.evidenceQuote, null)
    assert.ok(answer.includes(grade.evidenceQuote as string))
  })

  it('drops an evidence quote that is not in the answer', async () => {
    const provider = createMockProvider({
      delayScale: 0,
      verdict: 'hit',
      fabricateEvidence: true,
    })
    const grade = await provider.gradePrediction(
      { challenge: CHALLENGE, optionId: 'A', confidence: 50, answerText: answer },
      NO_SIGNAL(),
    )
    assert.equal(grade.evidenceQuote, null, 'a fabricated quote must never survive')
  })

  it('a forced miss never names the user’s own option as correct', async () => {
    const provider = createMockProvider({ delayScale: 0, verdict: 'miss' })
    const grade = await provider.gradePrediction(
      { challenge: CHALLENGE, optionId: 'A', confidence: 90, answerText: answer },
      NO_SIGNAL(),
    )
    assert.equal(grade.verdict, 'miss')
    assert.notEqual(grade.correctOptionId, 'A')
    // 100 × (1 − 0.9²) = 19
    assert.equal(grade.score, 19)
  })

  it('surfaces a failure so the round can complete without a verdict', async () => {
    const provider = createMockProvider({ delayScale: 0, failure: 'grade' })
    await assert.rejects(() =>
      provider.gradePrediction(
        { challenge: CHALLENGE, optionId: 'A', confidence: 50, answerText: answer },
        NO_SIGNAL(),
      ),
    )
  })
})

describe('mock provider — injected answer failure', () => {
  it('throws partway through, leaving a partial buffer', async () => {
    const provider = createMockProvider({ delayScale: 0, failure: 'answer' })
    const chunks: AnswerChunk[] = []

    await assert.rejects(async () => {
      for await (const chunk of provider.streamAnswer('boom', NO_SIGNAL())) {
        chunks.push(chunk)
      }
    })

    assert.ok(chunks.length > 0, 'some deltas should have arrived first')
    assert.equal(chunks.some((c) => c.kind === 'done'), false)
  })
})
