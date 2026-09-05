'use client'

import { CATEGORY_LABEL } from '@/lib/intent'
import { cn } from '@/lib/cn'
import type { GradeVerdict, RoundRecord } from '@/types'

interface HistoryRowProps {
  round: RoundRecord
}

const VERDICT_TONE: Record<GradeVerdict, string> = {
  hit: 'text-signal',
  partial: 'text-ink-muted',
  miss: 'text-violet',
}

const VERDICT_LABEL: Record<GradeVerdict, string> = {
  hit: 'Hit',
  partial: 'Close',
  miss: 'Miss',
}

/** Short relative time. Absolute dates are noise at this density. */
function ago(timestamp: number): string {
  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000))
  if (seconds < 60) return 'just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

export function HistoryRow({ round }: HistoryRowProps) {
  return (
    <div className="px-5 py-3.5">
      <div className="flex items-baseline justify-between gap-4">
        <p className="min-w-0 flex-1 truncate text-[13px] text-ink-muted">
          {round.prompt}
        </p>
        <span className="shrink-0 font-mono text-lg tabular-nums text-ink">
          {round.score}
        </span>
      </div>

      <div className="mt-1.5 flex items-center gap-2.5 font-mono text-[10px] tracking-wider uppercase">
        <span className={cn(VERDICT_TONE[round.verdict])}>
          {VERDICT_LABEL[round.verdict]}
        </span>
        <span className="text-ink-faint">·</span>
        <span className="text-ink-faint">
          {round.optionId} @ {round.confidence}%
        </span>
        <span className="text-ink-faint">·</span>
        <span className="text-ink-faint">{CATEGORY_LABEL[round.category]}</span>
        <span className="text-ink-faint">·</span>
        <span className="text-ink-faint">{ago(round.createdAt)}</span>
      </div>
    </div>
  )
}
