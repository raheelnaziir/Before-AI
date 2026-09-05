import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it } from 'node:test'
import { brierScore } from '../lib/scoring/brier.ts'
import { emptyProfile } from '../lib/scoring/profile.ts'
import { createLocalStore } from '../lib/storage/local.ts'
import { HISTORY_LIMIT, STORAGE_KEYS } from '../lib/storage/store.ts'
import type { GradeVerdict, RoundRecord } from '../types/index.ts'

/**
 * Minimal localStorage stand-in.
 *
 * Node has no DOM. Installing a fake on `globalThis.window` is enough because the
 * store only ever touches `getItem`/`setItem`/`removeItem` and guards on
 * `typeof window`.
 */
function installStorage(): Map<string, string> {
  const data = new Map<string, string>()
  ;(globalThis as { window?: unknown }).window = {
    localStorage: {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => void data.set(key, value),
      removeItem: (key: string) => void data.delete(key),
    },
  }
  return data
}

function uninstallStorage(): void {
  delete (globalThis as { window?: unknown }).window
}

const T0 = 1_700_000_000_000

function record(
  id: string,
  verdict: GradeVerdict = 'hit',
  createdAt = T0,
): RoundRecord {
  return {
    id,
    createdAt,
    prompt: 'Postgres or Mongo?',
    category: 'technical',
    question: 'What will it recommend?',
    optionId: 'A',
    optionLabel: 'Postgres',
    confidence: 80,
    verdict,
    score: brierScore(80, verdict),
    correctOptionId: verdict === 'hit' ? 'A' : 'B',
    lockedBeforeAnswer: true,
  }
}

describe('local store — happy path', () => {
  let data: Map<string, string>

  beforeEach(() => {
    data = installStorage()
  })
  afterEach(uninstallStorage)

  it('returns an empty profile on a fresh browser', () => {
    assert.deepEqual(createLocalStore().readProfile(), emptyProfile())
    assert.deepEqual(createLocalStore().readRounds(), [])
  })

  it('round-trips a profile', () => {
    const store = createLocalStore()
    const profile = { ...emptyProfile(), totalRounds: 3, hits: 2, avgScore: 81.5 }
    store.writeProfile(profile)
    assert.deepEqual(createLocalStore().readProfile(), profile)
  })

  it('round-trips history newest-first', () => {
    const store = createLocalStore()
    store.appendRound(record('1'))
    const rounds = store.appendRound(record('2'))
    assert.deepEqual(
      rounds.map((r) => r.id),
      ['2', '1'],
    )
    assert.deepEqual(
      createLocalStore()
        .readRounds()
        .map((r) => r.id),
      ['2', '1'],
    )
  })

  it('caps history and drops the oldest round', () => {
    const store = createLocalStore()
    for (let i = 0; i < HISTORY_LIMIT + 5; i++) {
      store.appendRound(record(`r${i}`, 'hit', T0 + i))
    }
    const rounds = store.readRounds()
    assert.equal(rounds.length, HISTORY_LIMIT)
    assert.equal(rounds[0]?.id, `r${HISTORY_LIMIT + 4}`, 'newest survives')
    assert.equal(
      rounds.some((r) => r.id === 'r0'),
      false,
      'oldest is dropped',
    )
  })

  it('clear removes both keys', () => {
    const store = createLocalStore()
    store.writeProfile({ ...emptyProfile(), totalRounds: 1 })
    store.appendRound(record('1'))
    store.clear()
    assert.equal(data.has(STORAGE_KEYS.profile), false)
    assert.equal(data.has(STORAGE_KEYS.rounds), false)
  })
})

describe('local store — corrupt data must not break a demo', () => {
  let data: Map<string, string>

  beforeEach(() => {
    data = installStorage()
  })
  afterEach(uninstallStorage)

  it('unparseable JSON yields defaults rather than throwing', () => {
    data.set(STORAGE_KEYS.profile, '{not json')
    data.set(STORAGE_KEYS.rounds, 'also not json')
    const store = createLocalStore()
    assert.deepEqual(store.readProfile(), emptyProfile())
    assert.deepEqual(store.readRounds(), [])
  })

  it('a schema-invalid profile is rebuilt from valid history', () => {
    data.set(STORAGE_KEYS.profile, JSON.stringify({ version: 99, nonsense: true }))
    data.set(
      STORAGE_KEYS.rounds,
      JSON.stringify([record('2', 'miss', T0 + 1_000), record('1', 'hit', T0)]),
    )

    const profile = createLocalStore().readProfile()
    assert.equal(profile.totalRounds, 2)
    assert.equal(profile.hits, 1)
    assert.equal(profile.misses, 1)
    assert.equal(profile.accuracy, 0.5)
  })

  it('a schema-invalid profile with no history falls back to empty', () => {
    data.set(STORAGE_KEYS.profile, JSON.stringify({ totalRounds: 'many' }))
    assert.deepEqual(createLocalStore().readProfile(), emptyProfile())
  })

  it('keeps the readable rows of a partially-corrupt history', () => {
    data.set(
      STORAGE_KEYS.rounds,
      JSON.stringify([record('good-1'), { id: 'bad', verdict: 'maybe' }, record('good-2')]),
    )
    const rounds = createLocalStore().readRounds()
    assert.deepEqual(
      rounds.map((r) => r.id),
      ['good-1', 'good-2'],
    )
  })

  it('a non-array history yields no rounds', () => {
    data.set(STORAGE_KEYS.rounds, JSON.stringify({ rounds: [] }))
    assert.deepEqual(createLocalStore().readRounds(), [])
  })
})

describe('local store — no window (server render)', () => {
  it('reads defaults and writes are no-ops', () => {
    uninstallStorage()
    const store = createLocalStore()
    assert.deepEqual(store.readProfile(), emptyProfile())
    assert.deepEqual(store.readRounds(), [])
    // Must not throw during SSR.
    store.writeProfile(emptyProfile())
    store.clear()
    assert.deepEqual(store.appendRound(record('1')), [record('1')])
  })
})

describe('local store — storage that throws', () => {
  afterEach(uninstallStorage)

  it('survives a setItem that throws (private mode / quota)', () => {
    ;(globalThis as { window?: unknown }).window = {
      localStorage: {
        getItem: () => null,
        setItem: () => {
          throw new Error('QuotaExceededError')
        },
        removeItem: () => {
          throw new Error('nope')
        },
      },
    }

    const store = createLocalStore()
    // The round completed; losing the write is acceptable, throwing is not.
    store.writeProfile(emptyProfile())
    store.clear()
    assert.deepEqual(store.readProfile(), emptyProfile())
  })
})
