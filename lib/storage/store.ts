import type { CalibrationProfile, RoundRecord } from '@/types'

/**
 * Persistence seam.
 *
 * Exists so the localStorage implementation is not load-bearing. `docs/schema.sql`
 * describes the Postgres path; swapping it in is an implementation of this
 * interface plus an anonymous session cookie, and nothing above this line changes.
 *
 * Synchronous because localStorage is, and because the profile is read during
 * render. An async store would mean a loading state on a number that is already
 * on the machine.
 */
export interface ProfileStore {
  readProfile(): CalibrationProfile
  writeProfile(profile: CalibrationProfile): void
  readRounds(): RoundRecord[]
  /** Prepends and enforces the history cap. Returns the retained list. */
  appendRound(record: RoundRecord): RoundRecord[]
  clear(): void
}

/** Keep a judge's demo bounded; nobody scrolls past 50 rounds anyway. */
export const HISTORY_LIMIT = 50

export const STORAGE_KEYS = {
  profile: 'beforeai.profile.v1',
  rounds: 'beforeai.rounds.v1',
} as const
