'use client'

import { animate, useInView, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { EASE } from './motion'

interface CountUpProps {
  /** The real, final value. Always what ends up on screen. */
  value: number
  suffix?: string
  /** Seconds. */
  duration?: number
  delay?: number
  className?: string
}

/**
 * Number that counts up when it scrolls into view.
 *
 * The displayed value is derived rather than parked in state: off-screen and on
 * the server it renders the *real* figure, so the number can never be left
 * reading a made-up 0 if the observer never fires. It drops to zero only at the
 * moment the count actually begins, and is skipped entirely under reduced
 * motion.
 */
export function CountUp({
  value,
  suffix = '',
  duration = 1.1,
  delay = 0,
  className,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.5 })
  const reduced = useReducedMotion()

  /** Latest frame of the count. `null` until the animation has started. */
  const [tick, setTick] = useState<number | null>(null)

  useEffect(() => {
    if (reduced || !inView) return

    const controls = animate(0, value, {
      duration,
      delay,
      ease: EASE,
      onUpdate: (v) => setTick(Math.round(v)),
    })

    return () => controls.stop()
  }, [inView, reduced, value, duration, delay])

  const display = reduced ? value : (tick ?? (inView ? 0 : value))

  return (
    <span ref={ref} className={className}>
      {display}
      {suffix}
    </span>
  )
}
