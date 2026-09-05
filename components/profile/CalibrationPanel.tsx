'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { CategoryBars } from './CategoryBars'
import { OverconfidenceMeter } from './OverconfidenceMeter'
import { Card } from '@/components/ui/Card'
import type { CalibrationProfile } from '@/types'

interface CalibrationPanelProps {
  profile: CalibrationProfile
  /** First client read hasn't landed. Holds the layout for one frame. */
  loading: boolean
}

export function CalibrationPanel({ profile, loading }: CalibrationPanelProps) {
  const empty = profile.totalRounds === 0

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <span className="font-mono text-[11px] tracking-wider text-ink-muted uppercase">
          Your AI calibration
        </span>
        {profile.streak > 1 && (
          <span className="font-mono text-[10px] tracking-wider text-signal uppercase">
            {profile.streak} in a row
          </span>
        )}
      </div>

      <div className="px-5 py-5">
        <AnimatePresence mode="wait" initial={false}>
          {loading ? (
            // Same height as the populated grid, so the panel doesn't jump.
            <div key="loading" className="h-[68px]" aria-hidden />
          ) : empty ? (
            <motion.p
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm leading-relaxed text-ink-faint"
            >
              Nothing here yet. Play a round and this fills in — accuracy, average
              confidence, and whether you trust yourself more than you should.
            </motion.p>
          ) : (
            <motion.div
              key="stats"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <dl className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4">
                <Stat label="Accuracy" value={`${Math.round(profile.accuracy * 100)}%`} />
                <Stat label="Avg confidence" value={`${Math.round(profile.avgConfidence)}%`} />
                <Stat label="Avg score" value={Math.round(profile.avgScore).toString()} />
                <Stat label="Rounds" value={profile.totalRounds.toString()} />
              </dl>

              <div className="mt-5 border-t border-line pt-5">
                <OverconfidenceMeter index={profile.overconfidenceIndex} />
              </div>

              <CategoryBars byCategory={profile.byCategory} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Card>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[10px] tracking-wider text-ink-faint uppercase">
        {label}
      </dt>
      <dd className="mt-1 font-mono text-2xl tabular-nums text-ink">{value}</dd>
    </div>
  )
}
