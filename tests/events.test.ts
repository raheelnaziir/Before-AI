import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { HEARTBEAT, encodeEvent, readEvents } from '../lib/round/events.ts'
import type { RoundEvent } from '../lib/round/events.ts'

/** Build a body that yields exactly the given byte chunks. */
function bodyOf(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  return new ReadableStream<Uint8Array>({
    start(sink) {
      for (const chunk of chunks) sink.enqueue(encoder.encode(chunk))
      sink.close()
    },
  })
}

async function collect(chunks: string[]): Promise<RoundEvent[]> {
  const events: RoundEvent[] = []
  for await (const event of readEvents(bodyOf(chunks))) events.push(event)
  return events
}

const SAMPLE: RoundEvent[] = [
  { t: 'round.start', roundId: 'r1', startedAt: 1_000, mode: 'demo', intent: 'technical' },
  { t: 'answer.delta', text: 'Use Postgres.' },
  { t: 'answer.progress', chars: 13, deltas: 1, elapsedMs: 240 },
  { t: 'round.end' },
]

describe('SSE encode/decode', () => {
  it('round-trips events losslessly', async () => {
    const events = await collect(SAMPLE.map(encodeEvent))
    assert.deepEqual(events, SAMPLE)
  })

  it('names the event type in the SSE frame', () => {
    assert.match(encodeEvent({ t: 'round.end' }), /^event: round\.end\n/)
  })

  it('skips heartbeat comment frames', async () => {
    const events = await collect([
      encodeEvent(SAMPLE[0]!),
      HEARTBEAT,
      HEARTBEAT,
      encodeEvent(SAMPLE[3]!),
    ])
    assert.deepEqual(events, [SAMPLE[0], SAMPLE[3]])
  })

  it('reassembles a frame split across chunk boundaries', async () => {
    const frame = encodeEvent({ t: 'answer.delta', text: 'split across reads' })
    const cut = Math.floor(frame.length / 2)
    const events = await collect([frame.slice(0, cut), frame.slice(cut)])
    assert.deepEqual(events, [{ t: 'answer.delta', text: 'split across reads' }])
  })

  it('handles several frames arriving in one chunk', async () => {
    const events = await collect([SAMPLE.map(encodeEvent).join('')])
    assert.deepEqual(events, SAMPLE)
  })

  it('survives a malformed frame without dropping the rest of the round', async () => {
    const events = await collect([
      'event: answer.delta\ndata: {not json\n\n',
      encodeEvent(SAMPLE[3]!),
    ])
    assert.deepEqual(events, [SAMPLE[3]])
  })

  it('does not emit a trailing partial frame', async () => {
    const events = await collect([encodeEvent(SAMPLE[0]!), 'event: answer.delta\ndata: {"t"'])
    assert.deepEqual(events, [SAMPLE[0]])
  })

  it('preserves multi-byte characters split across chunk boundaries', async () => {
    const frame = encodeEvent({ t: 'answer.delta', text: 'café — ünïcode' })
    const bytes = new TextEncoder().encode(frame)
    const encoder = new TextEncoder()
    void encoder
    // Cut mid-way through the byte array, which will land inside a multi-byte char.
    const body = new ReadableStream<Uint8Array>({
      start(sink) {
        sink.enqueue(bytes.slice(0, 30))
        sink.enqueue(bytes.slice(30))
        sink.close()
      },
    })
    const events: RoundEvent[] = []
    for await (const event of readEvents(body)) events.push(event)
    assert.deepEqual(events, [{ t: 'answer.delta', text: 'café — ünïcode' }])
  })
})
