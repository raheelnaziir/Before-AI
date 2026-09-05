'use client'

import { motion } from 'framer-motion'
import { overconfidenceNote } from '@/lib/scoring/profile'
import { cn } from '@/lib/cn'

interface OverconfidenceMeterProps {
  /** avgConfidence − accuracy·100. Positive is overconfident. */
  index: number
}

/** Beyond ±40 the bar is pinned; the sign is the message at that point. */
const RANGE = 40

/**
 * The headline calibration number.
 *
 * A centred bar rather than a percentage: the *sign* is what matters — whether you
 * over- or under-trust yourself — and a signed number on a left-anchored bar reads
 * as a score, which this is not.
 */
export function OverconfidenceMeter({ index }: OverconfidenceMeterProps) {
  const clamped = Math.max(-RANGE, Math.min(RANGE, index))
  // Half-width from centre, in percent of the track.
  const extent = (Math.abs(clamped) / RANGE) * 50
  const overconfident = clamped >= 0

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[10px] tracking-wider text-ink-faint uppercase">
          Overconfidence
        </span>
        <span
          className={cn(
            'font-mono text-sm tabular-nums',
            Math.abs(index) < 5
              ? 'text-signal'
              : overconfident
                ? 'text-violet'
                : 'text-ink-muted',
          )}
        >
          {index > 0 ? '+' : ''}
          {Math.round(index)}
        </span>
      </div>

      <div className="relative mt-2.5 h-1.5 w-full rounded-full bg-line">
        {/* Centre tick — the calibrated point. */}
        <div
          aria-hidden
          className="absolute top-1/2 left-1/2 h-3 w-px -translate-x-1/2 -translate-y-1/2 bg-line-strong"
        />
        <motion.div
          className={cn(
            'absolute top-0 h-full rounded-full',
            overconfident ? 'bg-violet/70' : 'bg-signal/60',
          )}
          initial={false}
          animate={{
            left: overconfident ? '50%' : `${50 - extent}%`,
            width: `${extent}%`,
          }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>

      <p className="mt-2 text-[13px] text-ink-faint">{overconfidenceNote(index)}</p>
    </div>
  )
}
