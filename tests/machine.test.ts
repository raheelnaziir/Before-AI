import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { ANSWER, CHALLENGE, GRADE } from './fixtures.ts'
import {
  initialRoundState,
  isAnswerHeld,
  isAwaitingAnswer,
  isDegraded,
  isRevealed,
  revealedAnswer,
  roundReducer,
  type RoundState,
} from '../lib/round/machine.ts'
import type { RoundAction } from '../lib/round/machine.ts'

const T0 = 1_000_000

/** Fold a list of actions over the reducer. */
function run(actions: RoundAction[], from: RoundState = initialRoundState): RoundState {
  return actions.reduce(roundReducer, from)
}

const start: RoundAction = { type: 'START', prompt: 'Postgres or Mongo?', startedAt: T0 }
const challengeReady: RoundAction = {
  type: 'EVENT',
  event: { t: 'challenge.ready', challenge: CHALLENGE },
}
const challengeFailed: RoundAction = {
  type: 'EVENT',
  event: { t: 'challenge.error', message: 'The model returned an unusable response.' },
}
const answerDone: RoundAction = { type: 'EVENT', event: { t: 'answer.done', answer: ANSWER } }
const lock: RoundAction = { type: 'LOCK', optionId: 'A', confidence: 80, at: T0 + 3_000 }
const graded: RoundAction = { type: 'GRADED', grade: GRADE }

const delta = (text: string): RoundAction => ({
  type: 'EVENT',
  event: { t: 'answer.delta', text },
})

describe('round machine — lifecycle', () => {
  it('START moves idle -> processing and records the prompt', () => {
    const state = run([start])
    assert.equal(state.status, 'processing')
    assert.equal(state.prompt, 'Postgres or Mongo?')
    assert.equal(state.startedAt, T0)
  })

  it('challenge.ready moves processing -> challenge_ready', () => {
    const state = run([start, challengeReady])
    assert.equal(state.status, 'challenge_ready')
    assert.equal(state.challenge?.question, CHALLENGE.question)
  })

  it('round.start adopts the server clock and the local intent guess', () => {
    const state = run([
      start,
      {
        type: 'EVENT',
        event: {
          t: 'round.start',
          roundId: 'r1',
          startedAt: T0 + 25,
          mode: 'demo',
          intent: 'technical',
        },
      },
    ])
    assert.equal(state.startedAt, T0 + 25)
    assert.equal(state.mode, 'demo')
    assert.equal(state.intent, 'technical')
  })

  it('RESET clears the hidden buffers', () => {
    const state = run([start, challengeReady, delta('secret'), { type: 'RESET' }])
    assert.equal(state.status, 'idle')
    assert.equal(state.answerBuffer, '')
    assert.equal(state.chars, 0)
  })

  it('runs the full lifecycle idle -> ... -> completed', () => {
    const state = run([start, challengeReady, lock, answerDone, graded])
    assert.equal(state.status, 'completed')
    assert.equal(state.grade?.verdict, 'hit')
    assert.equal(state.gradeError, null)
  })
})

describe('round machine — answer accumulation', () => {
  it('accumulates deltas into the hidden buffer and counts them exactly', () => {
    const state = run([start, challengeReady, delta('Use '), delta('Postgres'), delta('.')])
    assert.equal(state.answerBuffer, 'Use Postgres.')
    assert.equal(state.chars, 13)
    assert.equal(state.deltas, 3)
  })

  it('answer.done prefers the authoritative server text over accumulated deltas', () => {
    const state = run([start, challengeReady, delta('Use Post'), answerDone])
    assert.equal(state.answerBuffer, ANSWER.text)
    assert.equal(state.chars, ANSWER.text.length)
    assert.equal(state.answerComplete, true)
  })

  it('answer.thinking sets the reasoning flag and never touches the answer buffer', () => {
    const state = run([
      start,
      challengeReady,
      { type: 'EVENT', event: { t: 'answer.thinking', text: 'weighing write patterns' } },
    ])
    assert.equal(state.reasoning, true)
    assert.equal(state.answerBuffer, '')
    assert.equal(state.thinkingBuffer, 'weighing write patterns')
  })

  it('answer.progress overwrites counters with server-authoritative values', () => {
    const state = run([
      start,
      challengeReady,
      delta('abc'),
      {
        type: 'EVENT',
        event: { t: 'answer.progress', chars: 900, deltas: 120, elapsedMs: 1_500 },
      },
    ])
    assert.equal(state.chars, 900)
    assert.equal(state.deltas, 120)
  })
})

describe('COMMITMENT GATE — the answer stays sealed', () => {
  it('withholds the answer while streaming, prediction unlocked', () => {
    const state = run([start, challengeReady, delta('Use Postgres.')])
    assert.equal(revealedAnswer(state), null)
    assert.equal(isRevealed(state), false)
  })

  it('withholds the answer when it is COMPLETE but no prediction is locked', () => {
    const state = run([start, challengeReady, answerDone])
    assert.equal(state.answerComplete, true)
    assert.equal(revealedAnswer(state), null, 'a finished answer must not open the gate')
    assert.equal(isAnswerHeld(state), true)
    assert.equal(isRevealed(state), false)
  })

  it('withholds the answer when a prediction is locked but the answer is unfinished', () => {
    const state = run([start, challengeReady, delta('Use Post'), lock])
    assert.equal(state.status, 'predicted')
    assert.equal(revealedAnswer(state), null, 'locking early must not open the gate')
    assert.equal(isAwaitingAnswer(state), true)
    assert.equal(isRevealed(state), false)
  })

  it('opens only when BOTH conditions hold', () => {
    const state = run([start, challengeReady, answerDone, lock])
    assert.equal(state.status, 'grading')
    assert.equal(revealedAnswer(state), ANSWER.text)
    assert.equal(isRevealed(state), true)
  })

  it('grading cannot happen before the answer is available', () => {
    // A grade arriving while the answer is still streaming is a stale response
    // from an abandoned round; it must not complete the round.
    const state = run([start, challengeReady, lock, graded])
    assert.equal(state.status, 'predicted')
    assert.equal(state.grade, null)
    assert.equal(revealedAnswer(state), null)
  })
})

describe('COMMITMENT GATE — both race orderings converge', () => {
  it('ordering A: lock BEFORE the answer finishes', () => {
    const locked = run([start, challengeReady, delta('Use Post'), lock])
    assert.equal(locked.status, 'predicted')
    assert.equal(locked.prediction?.lockedBeforeAnswer, true)
    assert.equal(revealedAnswer(locked), null)

    const settled = roundReducer(locked, answerDone)
    assert.equal(settled.status, 'grading')
    assert.equal(revealedAnswer(settled), ANSWER.text)
    assert.equal(settled.prediction?.lockedBeforeAnswer, true, 'the race result must survive')

    const done = roundReducer(settled, graded)
    assert.equal(done.status, 'completed')
    assert.equal(done.grade?.score, GRADE.score)
  })

  it('ordering B: lock AFTER the answer finishes', () => {
    const held = run([start, challengeReady, answerDone])
    assert.equal(held.status, 'challenge_ready')
    assert.equal(revealedAnswer(held), null)

    const settled = roundReducer(held, lock)
    assert.equal(settled.status, 'grading')
    assert.equal(revealedAnswer(settled), ANSWER.text)
    assert.equal(settled.prediction?.lockedBeforeAnswer, false)

    const done = roundReducer(settled, graded)
    assert.equal(done.status, 'completed')
  })

  it('both orderings reach an identical revealed state', () => {
    const a = run([start, challengeReady, delta('x'), lock, answerDone, graded])
    const b = run([start, challengeReady, delta('x'), answerDone, lock, graded])
    assert.equal(a.status, b.status)
    assert.equal(revealedAnswer(a), revealedAnswer(b))
    assert.deepEqual(a.grade, b.grade)
  })

  it('records lockedAtMs relative to round start', () => {
    const state = run([start, challengeReady, lock])
    assert.equal(state.prediction?.lockedAtMs, 3_000)
  })
})

describe('round machine — the prediction is immutable', () => {
  it('ignores a lock with no challenge present', () => {
    const state = run([start, lock])
    assert.equal(state.prediction, null)
    assert.equal(state.status, 'processing')
  })

  it('ignores a second lock — the commitment is irreversible', () => {
    const first = run([start, challengeReady, lock])
    const second = roundReducer(first, {
      type: 'LOCK',
      optionId: 'C',
      confidence: 5,
      at: T0 + 9_000,
    })
    assert.equal(second.prediction?.optionId, 'A')
    assert.equal(second.prediction?.confidence, 80)
    assert.equal(second, first, 'a double lock must be a no-op')
  })

  it('cannot be changed after the answer is revealed', () => {
    const revealed = run([start, challengeReady, lock, answerDone])
    const after = roundReducer(revealed, {
      type: 'LOCK',
      optionId: 'B',
      confidence: 100,
      at: T0 + 12_000,
    })
    assert.equal(after.prediction?.optionId, 'A')
    assert.equal(after, revealed)
  })

  it('ignores a lock from the idle state', () => {
    assert.equal(roundReducer(initialRoundState, lock).prediction, null)
  })

  it('clamps a confidence outside 0..100', () => {
    const high = run([
      start,
      challengeReady,
      { type: 'LOCK', optionId: 'A', confidence: 140, at: T0 + 1 },
    ])
    assert.equal(high.prediction?.confidence, 100)

    const low = run([
      start,
      challengeReady,
      { type: 'LOCK', optionId: 'A', confidence: -20, at: T0 + 1 },
    ])
    assert.equal(low.prediction?.confidence, 0)
  })
})

describe('round machine — grading failures degrade gracefully', () => {
  it('GRADE_FAILED completes the round with the answer intact', () => {
    const state = run([
      start,
      challengeReady,
      lock,
      answerDone,
      { type: 'GRADE_FAILED', message: 'The AI judge could not be reached.' },
    ])
    assert.equal(state.status, 'completed')
    assert.equal(state.grade, null)
    assert.equal(state.gradeError, 'The AI judge could not be reached.')
    assert.equal(revealedAnswer(state), ANSWER.text, 'the answer survives a grading failure')
  })

  it('a late grade cannot overwrite a completed round', () => {
    const failed = run([
      start,
      challengeReady,
      lock,
      answerDone,
      { type: 'GRADE_FAILED', message: 'nope' },
    ])
    assert.equal(roundReducer(failed, graded), failed)
  })
})

describe('round machine — failures', () => {
  it('answer.error moves to error and keeps the answer sealed', () => {
    const state = run([
      start,
      challengeReady,
      delta('partial'),
      {
        type: 'EVENT',
        event: { t: 'answer.error', message: 'The AI provider returned an error.' },
      },
    ])
    assert.equal(state.status, 'error')
    assert.equal(state.error, 'The AI provider returned an error.')
    assert.equal(revealedAnswer(state), null)
  })

  it('FAIL surfaces a message without leaking internals', () => {
    const state = run([start, { type: 'FAIL', message: 'The request was rejected.' }])
    assert.equal(state.status, 'error')
  })

  it('an error state cannot be settled into grading', () => {
    const state = run([
      start,
      challengeReady,
      lock,
      { type: 'EVENT', event: { t: 'answer.error', message: 'boom' } },
      answerDone,
    ])
    assert.equal(state.status, 'error')
  })

  it('a failed round reveals nothing even with both gate conditions met', () => {
    const state = run([
      start,
      challengeReady,
      lock,
      { type: 'EVENT', event: { t: 'answer.error', message: 'boom' } },
      answerDone,
    ])
    assert.equal(state.prediction !== null, true)
    assert.equal(state.answerComplete, true, 'both conditions hold...')
    assert.equal(revealedAnswer(state), null, '...but a failed round still reveals nothing')
  })
})

describe('round machine — degraded path', () => {
  it('challenge.error degrades but leaves the answer lane running', () => {
    const state = run([start, challengeFailed, delta('still streaming')])
    assert.equal(state.status, 'degraded')
    assert.equal(state.challengeError, 'The model returned an unusable response.')
    assert.equal(state.answerBuffer, 'still streaming')
    assert.equal(isDegraded(state), true)
  })

  it('a degraded round still withholds the answer while it is streaming', () => {
    const state = run([start, challengeFailed, delta('partial')])
    assert.equal(revealedAnswer(state), null)
  })

  it('a degraded round reveals on completion — there is no prediction to protect', () => {
    const state = run([start, challengeFailed, answerDone])
    assert.equal(state.status, 'completed')
    assert.equal(revealedAnswer(state), ANSWER.text)
    // No prediction was possible, so no grading is attempted.
    assert.equal(state.prediction, null)
    assert.equal(state.grade, null)
  })

  it('a late challenge recovers the round rather than staying degraded', () => {
    const state = run([start, challengeFailed, challengeReady])
    assert.equal(state.status, 'challenge_ready')
    assert.equal(state.challengeError, null)
    assert.equal(isDegraded(state), false)
    // And the gate is shut again, because there is now something to commit to.
    assert.equal(revealedAnswer(roundReducer(state, answerDone)), null)
  })
})
