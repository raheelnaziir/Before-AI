'use client'

import { useEffect, useState } from 'react'

/**
 * Milliseconds elapsed since `startedAt`, or 0 when not running.
 *
 * Ticks at 100ms — the display only resolves to a tenth of a second, so
 * requestAnimationFrame would be ~6x the wakeups for no visible gain.
 *
 * The elapsed value is derived at render rather than stored, which means a new
 * `startedAt` resets the clock without a setState in the effect body. Until the
 * first tick lands, `now` still holds the previous run's timestamp, so the
 * subtraction is clamped at zero.
 */
export function useElapsed(startedAt: number | null): number {
  const [now, setNow] = useState(startedAt ?? 0)

  useEffect(() => {
    if (startedAt === null) return

    const id = setInterval(() => setNow(Date.now()), 100)
    return () => clearInterval(id)
  }, [startedAt])

  if (startedAt === null) return 0
  return Math.max(0, now - startedAt)
}
