import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createMockProvider } from '../lib/ai/mock.ts'
import { readEvents } from '../lib/round/events.ts'
import {
  initialRoundState,
  revealedAnswer,
  roundReducer,
  type RoundState,
} from '../lib/round/machine.ts'
import type { RoundEvent } from '../lib/round/events.ts'
import type { AIProvider } from '../lib/ai/provider.ts'
import type { OptionId } from '../types/index.ts'

/**
 * End-to-end round, from provider through SSE encoding into the client reducer.
 *
 * The unit tests cover the reducer's own transitions. This covers the seam: that
 * the events the route actually emits, in the order it emits them, drive the
 * machine to the right place — and that at no point in the log the answer text is
 * reachable before commitment.
 *
 * Uses the mock provider throughout. No API credits are spent here.
 */

/**
 * A faithful reimplementation of the route's event sequence.
 *
 * Importing the route handler itself would pull in `next/server` and the whole
 * request plumbing for no benefit — the thing under test is the *ordering*, which
 * is what this reproduces: both lanes started at t=0, the challenge forwarded when
 * it lands, and `answer.done` held until the challenge has been sent.
 */
async function* runRound(
  provider: AIProvider,
  prompt: string,
  signal: AbortSignal,
): AsyncGenerator<RoundEvent> {
  const startedAt = Date.now()

  yield { t: 'round.start', roundId: 'test-round', startedAt, mode: provider.mode, intent: 'technical' }

  // Both calls start now. The challenge generator receives the prompt only.
  const challengePromise = provider
    .generateChallenge(prompt, signal)
    .then((challenge): RoundEvent => ({ t: 'challenge.ready', challenge }))
    .catch((): RoundEvent => ({ t: 'challenge.error', message: 'Challenge failed.' }))

  let challengeEvent: RoundEvent | null = null
  const pending: RoundEvent[] = []
  void challengePromise.then((event) => {
    challengeEvent = event
    pending.push(event)
  })

  try {
    for await (const chunk of provider.streamAnswer(prompt, signal)) {
      // Flush the challenge as soon as it has landed.
      while (pending.length > 0) yield pending.shift() as RoundEvent

      if (chunk.kind === 'thinking') {
        yield { t: 'answer.thinking', text: chunk.text }
        continue
      }
      if (chunk.kind === 'text') {
        yield { t: 'answer.delta', text: chunk.text }
        continue
      }

      // Never announce a finished answer before the user has something to commit to.
      if (challengeEvent === null) {
        yield await challengePromise
      } else {
        while (pending.length > 0) yield pending.shift() as RoundEvent
      }

      yield {
        t: 'answer.done',
        answer: {
          text: chunk.text,
          model: chunk.model,
          outputTokens: chunk.outputTokens,
          latencyMs: Date.now() - startedAt,
        },
      }
    }
  } catch {
    yield { t: 'answer.error', message: 'Answer failed.' }
  }

  if (challengeEvent === null) yield await challengePromise
  else while (pending.length > 0) yield pending.shift() as RoundEvent

  yield { t: 'round.end' }
}

/** Collect a whole round's event log. */
async function collect(provider: AIProvider, prompt = 'Postgres or Mongo?'): Promise<RoundEvent[]> {
  const events: RoundEvent[] = []
  for await (const event of runRound(provider, prompt, new AbortController().signal)) {
    events.push(event)
  }
  return events
}

/** Feed a log into the reducer, optionally locking at a chosen point. */
function replay(
  events: readonly RoundEvent[],
  lockBefore?: (event: RoundEvent, index: number) => boolean,
  optionId: OptionId = 'A',
  confidence = 75,
): { state: RoundState; leaked: RoundEvent | null } {
  let state = initialRoundState
  state = roundReducer(state, { type: 'START', prompt: 'Postgres or Mongo?', startedAt: Date.now() })

  let locked = false
  let leaked: RoundEvent | null = null

  events.forEach((event, index) => {
    if (!locked && lockBefore?.(event, index)) {
      state = roundReducer(state, { type: 'LOCK', optionId, confidence, at: Date.now() })
      locked = true
    }

    state = roundReducer(state, { type: 'EVENT', event })

    // The invariant, checked after every single event: before a lock, the answer
    // must be unreachable.
    if (!locked && revealedAnswer(state) !== null) leaked = event
  })

  if (!locked && lockBefore === undefined) {
    state = roundReducer(state, { type: 'LOCK', optionId, confidence, at: Date.now() })
  }

  return { state, leaked }
}

const mock = (overrides = {}) => createMockProvider({ delayScale: 0, ...overrides })

describe('stream integration — event log shape', () => {
  it('starts the round, delivers a challenge, streams, and ends', async () => {
    const events = await collect(mock())
    const types = events.map((e) => e.t)

    assert.equal(types[0], 'round.start')
    assert.equal(types.at(-1), 'round.end')
    assert.ok(types.includes('challenge.ready'))
    assert.ok(types.includes('answer.done'))
    assert.ok(types.filter((t) => t === 'answer.delta').length > 20)
  })

  it('delivers the challenge before it announces a finished answer', async () => {
    const types = (await collect(mock())).map((e) => e.t)
    assert.ok(
      types.indexOf('challenge.ready') < types.indexOf('answer.done'),
      'the user must have something to commit to before the answer is declared ready',
    )
  })

  it('survives an SSE round-trip unchanged', async () => {
    const events = await collect(mock())
    const encoder = new TextEncoder()

    const body = new ReadableStream<Uint8Array>({
      start(sink) {
        for (const event of events) {
          sink.enqueue(encoder.encode(`event: ${event.t}\ndata: ${JSON.stringify(event)}\n\n`))
        }
        sink.close()
      },
    })

    const decoded: RoundEvent[] = []
    for await (const event of readEvents(body)) decoded.push(event)
    assert.deepEqual(decoded, events)
  })
})

describe('stream integration — the challenge never sees the answer', () => {
  it('no challenge string appears in the answer', async () => {
    const events = await collect(mock())
    const challenge = events.find((e) => e.t === 'challenge.ready')
    const done = events.find((e) => e.t === 'answer.done')
    assert.ok(challenge?.t === 'challenge.ready')
    assert.ok(done?.t === 'answer.done')

    for (const value of [
      challenge.challenge.question,
      ...challenge.challenge.options.flatMap((o) => [o.label, o.blurb]),
    ]) {
      assert.equal(done.answer.text.includes(value), false, `leak: ${value}`)
    }
  })
})

describe('stream integration — the gate holds across the whole log', () => {
  it('CASE A: lock while the answer is still streaming', async () => {
    const events = await collect(mock())
    // Lock right after the 10th delta — well before answer.done.
    let deltas = 0
    const { state, leaked } = replay(events, (event) => {
      if (event.t === 'answer.delta') deltas += 1
      return deltas === 10
    })

    assert.equal(leaked, null, 'the answer must never be readable before the lock')
    assert.equal(state.prediction?.lockedBeforeAnswer, true)
    assert.equal(state.status, 'grading')
    assert.notEqual(revealedAnswer(state), null)
  })

  it('CASE B: lock after the answer has finished', async () => {
    const events = await collect(mock())
    const { state, leaked } = replay(events, (event) => event.t === 'round.end')

    assert.equal(leaked, null, 'a finished answer must stay sealed until the lock')
    assert.equal(state.prediction?.lockedBeforeAnswer, false)
    assert.equal(state.status, 'grading')
    assert.notEqual(revealedAnswer(state), null)
  })

  it('CASE C: never locking leaves the answer sealed for the whole round', () => {
    return collect(mock()).then((events) => {
      let state = initialRoundState
      state = roundReducer(state, {
        type: 'START',
        prompt: 'Postgres or Mongo?',
        startedAt: Date.now(),
      })

      for (const event of events) {
        state = roundReducer(state, { type: 'EVENT', event })
        assert.equal(revealedAnswer(state), null, `leaked at ${event.t}`)
      }

      assert.equal(state.answerComplete, true)
      assert.equal(state.status, 'challenge_ready', 'the round waits on the user, indefinitely')
    })
  })

  it('both orderings converge on the same revealed answer', async () => {
    const events = await collect(mock())
    let deltas = 0
    const early = replay(events, (event) => {
      if (event.t === 'answer.delta') deltas += 1
      return deltas === 5
    })
    const late = replay(events, (event) => event.t === 'round.end')

    assert.equal(revealedAnswer(early.state), revealedAnswer(late.state))
    assert.equal(early.state.status, late.state.status)
  })
})

describe('stream integration — grading the replayed round', () => {
  it('grades the locked prediction against the revealed answer', async () => {
    const provider = mock({ verdict: 'hit' })
    const events = await collect(provider)
    const { state } = replay(events, (event) => event.t === 'round.end', 'A', 80)

    const answerText = revealedAnswer(state)
    assert.ok(answerText !== null && state.challenge !== null && state.prediction !== null)

    const grade = await provider.gradePrediction(
      {
        challenge: state.challenge,
        optionId: state.prediction.optionId,
        confidence: state.prediction.confidence,
        answerText,
      },
      new AbortController().signal,
    )

    const completed = roundReducer(state, { type: 'GRADED', grade })
    assert.equal(completed.status, 'completed')
    assert.equal(completed.grade?.score, 96)
    // The grader saw the real answer, and its quote is verifiably inside it.
    assert.notEqual(completed.grade?.evidenceQuote, null)
    assert.ok(answerText.includes(completed.grade?.evidenceQuote as string))
  })
})

describe('stream integration — failures', () => {
  it('a challenge failure degrades without killing the answer', async () => {
    const events = await collect(mock({ failure: 'challenge' }))
    const types = events.map((e) => e.t)

    assert.ok(types.includes('challenge.error'))
    assert.ok(types.includes('answer.done'), 'the answer lane must survive')

    let state = initialRoundState
    state = roundReducer(state, { type: 'START', prompt: 'p', startedAt: Date.now() })
    for (const event of events) state = roundReducer(state, { type: 'EVENT', event })

    // No challenge means no prediction was possible, so the round completes.
    assert.equal(state.status, 'completed')
    assert.equal(state.prediction, null)
    assert.notEqual(revealedAnswer(state), null)
  })

  it('an answer failure keeps the partial buffer sealed forever', async () => {
    const events = await collect(mock({ failure: 'answer' }))
    assert.ok(events.some((e) => e.t === 'answer.error'))

    let state = initialRoundState
    state = roundReducer(state, { type: 'START', prompt: 'p', startedAt: Date.now() })
    for (const event of events) state = roundReducer(state, { type: 'EVENT', event })

    assert.equal(state.status, 'error')
    assert.ok(state.answerBuffer.length > 0, 'a partial answer was buffered')
    assert.equal(revealedAnswer(state), null, 'and it is never revealed')

    // Even locking afterwards cannot open a failed round.
    const locked = roundReducer(state, {
      type: 'LOCK',
      optionId: 'A',
      confidence: 50,
      at: Date.now(),
    })
    assert.equal(revealedAnswer(locked), null)
  })
})
