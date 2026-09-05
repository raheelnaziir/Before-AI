'use client'

import { useSyncExternalStore } from 'react'
import {
  clearProfile,
  getServerSnapshot,
  getSnapshot,
  recordRound,
  subscribe,
} from './profileStore'
import type { CalibrationProfile, RoundRecord } from '@/types'

export interface UseProfile {
  profile: CalibrationProfile
  rounds: RoundRecord[]
  /** True on the server render and until hydration reads localStorage. */
  loading: boolean
  record: (record: RoundRecord) => void
  clear: () => void
}

/**
 * Calibration profile, backed by localStorage.
 *
 * `useSyncExternalStore` rather than state-plus-effect: localStorage *is* an
 * external store, and the hook's server snapshot is what makes hydration correct
 * without a mismatch or a manual loading flag. `loading` is derived from that —
 * the server snapshot is the one that is identically empty.
 */
export function useProfile(): UseProfile {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const server = getServerSnapshot()

  return {
    profile: snapshot.profile,
    rounds: snapshot.rounds,
    // Identity comparison: only the server snapshot is this exact object.
    loading: snapshot === server,
    record: recordRound,
    clear: clearProfile,
  }
}
