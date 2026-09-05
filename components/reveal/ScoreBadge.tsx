'use client'

import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from 'framer-motion'
import { useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { brierScore, calibrationNote } from '@/lib/scoring/brier'
import type { GradeVerdict } from '@/types'

interface ScoreBadgeProps {
  score: number
  confidence: number
  verdict: GradeVerdict
}

/**
 * The score, counted up.
 *
 * The count-up is the payoff beat — a number that simply appears reads as a fact,
 * a number that climbs reads as a result.
 *
 * Driven by a motion value rather than React state: the count runs at frame rate,
 * and routing ~55 frames through setState would re-render this subtree on every
 * one of them while the rest of the reveal is still animating.
 */
export function ScoreBadge({ score, confidence, verdict }: ScoreBadgeProps) {
  const reduceMotion = useReducedMotion()
  const progress = useMotionValue(reduceMotion ? score : 0)
  const shown = useTransform(progress, (value) => Math.round(value).toString())

  useEffect(() => {
    if (reduceMotion) {
      progress.set(score)
      return
    }

    const controls = animate(progress, score, {
      duration: 0.9,
      ease: [0.16, 1, 0.3, 1],
    })

    return () => controls.stop()
  }, [score, reduceMotion, progress])

  return (
    <Card className="px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] tracking-wider text-ink-faint uppercase">
            Calibration score
          </p>
          {/* aria-live off: the verdict banner already announces the outcome, and
              a live region on a counting number would read every intermediate value. */}
          <motion.p className="mt-1 font-mono text-4xl tabular-nums text-ink">
            {shown}
          </motion.p>
        </div>

        <div className="max-w-[58%] text-right">
          <p className="text-[13px] leading-relaxed text-ink-muted">
            {calibrationNote(confidence, verdict)}
          </p>
          {/* Shows the arithmetic. The score is the product's central claim, so it
              should be checkable rather than asserted. */}
          <p className="mt-2 font-mono text-[10px] tracking-wider text-ink-faint uppercase">
            {confidence}% · {verdict} · Brier {brierScore(confidence, verdict)}
          </p>
        </div>
      </div>
    </Card>
  )
}
