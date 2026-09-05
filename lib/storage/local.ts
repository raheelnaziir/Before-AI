import { z } from 'zod'
import { HISTORY_LIMIT, STORAGE_KEYS, type ProfileStore } from './store'
import { CategorySchema, OptionIdSchema } from '@/lib/ai/schemas'
import { emptyProfile, profileFromHistory } from '@/lib/scoring/profile'
import type { CalibrationProfile, RoundRecord } from '@/types'

/**
 * Stored shapes are validated on read.
 *
 * A judge's browser may hold data written by an earlier build, or nothing at all,
 * or something a different app put there. A crash on read would take the whole
 * page down for a number that is decoration, so every read is total: it returns
 * defaults rather than throwing.
 */
const CategoryStatsSchema = z.object({
  n: z.number().int().nonnegative(),
  hits: z.number().int().nonnegative(),
  accuracy: z.number(),
  avgScore: z.number(),
})

const ProfileSchema = z.object({
  version: z.literal(1),
  totalRounds: z.number().int().nonnegative(),
  hits: z.number().int().nonnegative(),
  partials: z.number().int().nonnegative(),
  misses: z.number().int().nonnegative(),
  accuracy: z.number(),
  avgConfidence: z.number(),
  avgScore: z.number(),
  overconfidenceIndex: z.number(),
  streak: z.number().int().nonnegative(),
  bestStreak: z.number().int().nonnegative(),
  byCategory: z.partialRecord(CategorySchema, CategoryStatsSchema),
  updatedAt: z.number(),
})

const RoundRecordSchema = z.object({
  id: z.string(),
  createdAt: z.number(),
  prompt: z.string(),
  category: CategorySchema,
  question: z.string(),
  optionId: OptionIdSchema,
  optionLabel: z.string(),
  confidence: z.number(),
  verdict: z.enum(['hit', 'partial', 'miss']),
  score: z.number(),
  correctOptionId: OptionIdSchema,
  lockedBeforeAnswer: z.boolean(),
})

const RoundsSchema = z.array(RoundRecordSchema)

/**
 * localStorage-backed store.
 *
 * Every write is wrapped: Safari private mode throws on `setItem`, and losing a
 * profile update is not worth losing the round the user just played.
 */
export function createLocalStore(): ProfileStore {
  return {
    readProfile(): CalibrationProfile {
      const raw = read(STORAGE_KEYS.profile)
      if (raw === null) return emptyProfile()

      const parsed = ProfileSchema.safeParse(raw)
      if (parsed.success) return parsed.data

      // A profile we can't read but history we can is recoverable — rebuild it
      // rather than silently zeroing a judge's stats mid-demo.
      const rounds = this.readRounds()
      return rounds.length > 0 ? profileFromHistory(rounds) : emptyProfile()
    },

    writeProfile(profile: CalibrationProfile): void {
      write(STORAGE_KEYS.profile, profile)
    },

    readRounds(): RoundRecord[] {
      const raw = read(STORAGE_KEYS.rounds)
      if (raw === null) return []

      const parsed = RoundsSchema.safeParse(raw)
      if (parsed.success) return parsed.data

      // Partially-valid history is worth keeping: drop the bad rows only.
      if (!Array.isArray(raw)) return []
      return raw.flatMap((entry) => {
        const row = RoundRecordSchema.safeParse(entry)
        return row.success ? [row.data] : []
      })
    },

    appendRound(record: RoundRecord): RoundRecord[] {
      // Newest first — history renders in that order, and the cap should drop the
      // oldest round rather than the one just played.
      const next = [record, ...this.readRounds()].slice(0, HISTORY_LIMIT)
      write(STORAGE_KEYS.rounds, next)
      return next
    },

    clear(): void {
      remove(STORAGE_KEYS.profile)
      remove(STORAGE_KEYS.rounds)
    },
  }
}

function read(key: string): unknown {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(key)
    return raw === null ? null : JSON.parse(raw)
  } catch {
    // Unavailable storage or unparseable JSON — same outcome either way.
    return null
  }
}

function write(key: string, value: unknown): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Quota exceeded or storage disabled. The round still completed.
  }
}

function remove(key: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(key)
  } catch {
    // Nothing useful to do.
  }
}
