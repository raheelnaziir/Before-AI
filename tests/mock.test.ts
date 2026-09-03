import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createMockProvider } from '../lib/ai/mock.ts'
import type { AnswerChunk } from '../lib/ai/provider.ts'

/** Drain the provider with no delays. */
async function drain(
  prompt: string,
  signal: AbortSignal = new AbortController().signal,
): Promise<AnswerChunk[]> {
  const provider = createMockProvider({ delayScale: 0 })
  const chunks: AnswerChunk[] = []
  for await (const chunk of provider.streamAnswer(prompt, signal)) chunks.push(chunk)
  return chunks
}

describe('mock provider', () => {
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
