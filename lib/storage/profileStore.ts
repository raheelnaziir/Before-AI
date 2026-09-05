'use client'

import { createLocalStore } from './local'
import { applyRound, emptyProfile } from '@/lib/scoring/profile'
import type { CalibrationProfile, RoundRecord } from '@/types'

/**
 * Reactive wrapper over the localStorage store.
 *
 * localStorage is an external store, so this is shaped for
 * `useSyncExternalStore` rather than `useState` + an effect: a cached snapshot, a
 * listener set, and a write path that invalidates and notifies. That also removes
 * the hydration problem — the server snapshot is an empty profile, and React
 * swaps in the real one after hydrating without a mismatch.
 *
 * Module-level singleton on purpose. Two components reading the profile must see
 * the same object, or the reveal and the landing panel disagree after a round.
 */

export interface ProfileSnapshot {
  profile: CalibrationProfile
  rounds: RoundRecord[]
}

const store = createLocalStore()

/** Stable across reads. Replaced wholesale on write, which is the change signal. */
let snapshot: ProfileSnapshot | null = null

/** What the server renders. Frozen and shared, so its identity never changes. */
const SERVER_SNAPSHOT: ProfileSnapshot = { profile: emptyProfile(), rounds: [] }

const listeners = new Set<() => void>()

export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getSnapshot(): ProfileSnapshot {
  snapshot ??= { profile: store.readProfile(), rounds: store.readRounds() }
  return snapshot
}

export function getServerSnapshot(): ProfileSnapshot {
  return SERVER_SNAPSHOT
}

function emit(next: ProfileSnapshot): void {
  snapshot = next
  for (const listener of listeners) listener()
}

/**
 * Fold a completed round into the profile and history.
 *
 * Reads the current profile from the cache rather than from React state, so the
 * caller does not have to hold it — and so two rounds recorded in the same tick
 * cannot both aggregate onto the same stale base.
 */
export function recordRound(record: RoundRecord): void {
  const current = getSnapshot()

  const profile = applyRound(current.profile, {
    category: record.category,
    verdict: record.verdict,
    confidence: record.confidence,
    score: record.score,
    at: record.createdAt,
  })

  store.writeProfile(profile)
  emit({ profile, rounds: store.appendRound(record) })
}

export function clearProfile(): void {
  store.clear()
  emit({ profile: emptyProfile(), rounds: [] })
}
