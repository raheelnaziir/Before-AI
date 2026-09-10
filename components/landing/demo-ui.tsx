'use client'

import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** Mono micro-label. The same one the round UI uses to caption every panel. */
export function MonoLabel({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <p className={cn('font-mono text-[10px] tracking-[0.16em] uppercase', className)}>
      {children}
    </p>
  )
}

/**
 * Word-by-word fade.
 *
 * Reads as text arriving without the cost — or the caret jitter — of a real
 * per-character typewriter. `animated` off renders the finished string in one
 * pass, which is what reduced motion and every static stage get.
 */
export function Streamed({
  text,
  className,
  animated,
  caret = false,
}: {
  text: string
  className?: string
  animated: boolean
  caret?: boolean
}) {
  const words = text.split(' ')

  return (
    <p className={className}>
      {words.map((word, i) => (
        <motion.span
          key={`${word}-${i}`}
          initial={animated ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.24, delay: animated ? i * 0.04 : 0 }}
        >
          {word}{' '}
        </motion.span>
      ))}
      {caret ? (
        <span
          aria-hidden
          className="animate-caret ml-px inline-block h-[0.95em] w-[2px] translate-y-[0.12em] bg-signal align-baseline"
        />
      ) : null}
    </p>
  )
}

/** Label-over-value pair, as used in the waiting panel and the reveal. */
export function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="font-mono text-[9px] tracking-[0.14em] text-ink-faint uppercase">
        {label}
      </dt>
      <dd className="mt-1 truncate font-mono text-[15px] tabular-nums text-ink">
        {children}
      </dd>
    </div>
  )
}
