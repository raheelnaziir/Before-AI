'use client'

import { useInView, useReducedMotion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState, type FocusEvent } from 'react'

interface AutoAdvanceOptions {
  /** Number of steps in the cycle. */
  count: number
  /** Dwell time per step in ms. One number applies to every step. */
  dwell: number | readonly number[]
}

/**
 * Roving-tabindex key handling for a tablist.
 *
 * Returns the index to move to, or `null` when the key is not a navigation key
 * and the event should be left alone.
 */
export function tablistTarget(
  key: string,
  index: number,
  count: number,
): number | null {
  const last = count - 1
  if (key === 'ArrowDown' || key === 'ArrowRight') return index === last ? 0 : index + 1
  if (key === 'ArrowUp' || key === 'ArrowLeft') return index === 0 ? last : index - 1
  if (key === 'Home') return 0
  if (key === 'End') return last
  return null
}

/**
 * Drives the two scripted demos on the introduction page.
 *
 * The rules that make an auto-advancing panel tolerable rather than annoying:
 * it only runs while genuinely on screen, it holds while pointed at or focused,
 * it never runs under `prefers-reduced-motion`, and the first deliberate
 * selection stops it for good. A visitor who has taken control keeps it.
 */
export function useAutoAdvance<T extends HTMLElement = HTMLDivElement>({
  count,
  dwell,
}: AutoAdvanceOptions) {
  const containerRef = useRef<T>(null)
  const inView = useInView(containerRef, { amount: 0.35 })
  const reduced = useReducedMotion()

  const [index, setIndex] = useState(0)
  /** Completed loops. Lets consumers reset derived state on wrap. */
  const [cycle, setCycle] = useState(0)
  const [held, setHeld] = useState(false)
  const [manual, setManual] = useState(false)

  const running = inView && !held && !manual && !reduced

  useEffect(() => {
    if (!running) return

    const ms = typeof dwell === 'number' ? dwell : (dwell[index] ?? 3000)

    const timer = setTimeout(() => {
      const next = (index + 1) % count
      setIndex(next)
      if (next === 0) setCycle((c) => c + 1)
    }, ms)

    return () => clearTimeout(timer)
  }, [running, index, count, dwell])

  /** A deliberate pick. Retires the cycle. */
  const select = useCallback((next: number) => {
    setManual(true)
    setIndex(next)
  }, [])

  const hold = useCallback(() => setHeld(true), [])
  const release = useCallback(() => setHeld(false), [])

  return {
    containerRef,
    index,
    cycle,
    running,
    manual,
    select,
    /** Spread onto the container so pointer and keyboard both pause the cycle. */
    holdProps: {
      onPointerEnter: hold,
      onPointerLeave: release,
      onFocusCapture: hold,
      onBlurCapture: (event: FocusEvent<T>) => {
        // Only release once focus has left the panel altogether.
        if (!event.currentTarget.contains(event.relatedTarget)) release()
      },
    },
  }
}
