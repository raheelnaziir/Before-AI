'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { HistoryRow } from './HistoryRow'
import { Card } from '@/components/ui/Card'
import type { RoundRecord } from '@/types'

interface HistoryDrawerProps {
  rounds: readonly RoundRecord[]
  onClear: () => void
}

/** Collapsed height: enough to see there is history without it dominating. */
const PREVIEW_COUNT = 3

export function HistoryDrawer({ rounds, onClear }: HistoryDrawerProps) {
  const [open, setOpen] = useState(false)

  if (rounds.length === 0) return null

  const shown = open ? rounds : rounds.slice(0, PREVIEW_COUNT)
  const hidden = rounds.length - shown.length

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <span className="font-mono text-[11px] tracking-wider text-ink-muted uppercase">
          Past rounds
        </span>
        <button
          type="button"
          onClick={onClear}
          className="font-mono text-[10px] tracking-wider text-ink-faint uppercase transition-colors hover:text-ink-muted"
        >
          Clear
        </button>
      </div>

      <div className="divide-y divide-line">
        <AnimatePresence initial={false}>
          {shown.map((round) => (
            <motion.div
              key={round.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              <HistoryRow round={round} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {(hidden > 0 || open) && (
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="w-full border-t border-line px-5 py-3 font-mono text-[10px] tracking-wider text-ink-faint uppercase transition-colors hover:text-ink-muted"
        >
          {open ? 'Show less' : `Show ${hidden} more`}
        </button>
      )}
    </Card>
  )
}
