'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/cn'
import type { GradeVerdict } from '@/types'

interface VerdictBannerProps {
  /** null while grading is still in flight under the reveal. */
  verdict: GradeVerdict | null
  /** Grading failed. The round stands; only the verdict is missing. */
  failed?: boolean
}

/**
 * Copy per verdict.
 *
 * A miss has to read as *fair*. "AI got you" concedes the point without scolding;
 * anything that sounds like a wrong-answer buzzer breaks trust in the grader, and
 * the grader is the part of the product a user is most likely to argue with.
 */
const COPY: Record<GradeVerdict, { headline: string; tone: string }> = {
  hit: { headline: 'You called it', tone: 'text-signal' },
  partial: { headline: 'Close call', tone: 'text-ink' },
  miss: { headline: 'AI got you', tone: 'text-violet' },
}

const RING: Record<GradeVerdict, string> = {
  hit: 'border-signal/40 bg-signal/[0.05]',
  partial: 'border-line-strong bg-overlay/50',
  miss: 'border-violet/35 bg-violet/[0.05]',
}

export function VerdictBanner({ verdict, failed = false }: VerdictBannerProps) {
  // Grading runs underneath the reveal, so this pending state is normally on
  // screen for a few hundred ms. It says what is happening rather than showing a
  // spinner over an empty banner.
  if (verdict === null) {
    return (
      <div
        className={cn(
          'rounded-2xl border px-5 py-4',
          failed ? 'border-line bg-overlay/40' : 'border-line-strong bg-overlay/50',
        )}
      >
        <p className="font-mono text-[11px] tracking-wider text-ink-faint uppercase">
          {failed ? 'No verdict' : 'Judging…'}
        </p>
        <p className="mt-1.5 text-sm text-ink-muted">
          {failed
            ? 'The AI judge could not be reached. Your prediction and the answer are both above.'
            : 'Comparing your prediction against what the answer actually said.'}
        </p>
      </div>
    )
  }

  const { headline, tone } = COPY[verdict]

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={cn('rounded-2xl border px-5 py-4 edge-light', RING[verdict])}
      role="status"
    >
      <p className="font-mono text-[10px] tracking-wider text-ink-faint uppercase">
        Verdict
      </p>
      <p className={cn('mt-1 text-2xl font-medium tracking-tight', tone)}>{headline}</p>
    </motion.div>
  )
}
