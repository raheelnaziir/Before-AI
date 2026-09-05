'use client'

import { motion } from 'framer-motion'
import { CATEGORY_LABEL } from '@/lib/intent'
import type { CalibrationProfile, Category } from '@/types'

interface CategoryBarsProps {
  byCategory: CalibrationProfile['byCategory']
}

/**
 * Per-category average score.
 *
 * Score rather than accuracy: with two or three rounds in a category, accuracy is
 * either 0%, 50% or 100% and looks like noise. The Brier score moves smoothly from
 * the first round, so the bars say something on a fresh profile.
 */
export function CategoryBars({ byCategory }: CategoryBarsProps) {
  const rows = (Object.entries(byCategory) as [Category, { n: number; avgScore: number }][])
    .filter(([, stats]) => stats.n > 0)
    .sort((a, b) => b[1].avgScore - a[1].avgScore)

  if (rows.length < 2) return null

  return (
    <div className="mt-5 border-t border-line pt-5">
      <p className="font-mono text-[10px] tracking-wider text-ink-faint uppercase">
        By category
      </p>

      <div className="mt-3 space-y-2">
        {rows.map(([category, stats]) => (
          <div key={category} className="flex items-center gap-3">
            <span className="w-28 shrink-0 truncate text-[13px] text-ink-muted">
              {CATEGORY_LABEL[category]}
            </span>

            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
              <motion.div
                className="h-full rounded-full bg-signal-dim"
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(0, Math.min(100, stats.avgScore))}%` }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>

            <span className="w-14 shrink-0 text-right font-mono text-[11px] tabular-nums text-ink-faint">
              {Math.round(stats.avgScore)}
              <span className="ml-1 text-[9px]">×{stats.n}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
