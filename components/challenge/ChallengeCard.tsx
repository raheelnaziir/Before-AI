'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { ConfidenceSlider } from './ConfidenceSlider'
import { LockButton } from './LockButton'
import { OptionButton } from './OptionButton'
import { Card } from '@/components/ui/Card'
import { CATEGORY_LABEL } from '@/lib/intent'
import type { Challenge, OptionId, Prediction } from '@/types'

interface ChallengeCardProps {
  challenge: Challenge
  prediction: Prediction | null
  /** Answer finished and waiting behind the gate. */
  answerReady: boolean
  onLock: (optionId: OptionId, confidence: number) => void
}

/** Starts at a genuine hedge. Anchoring high would inflate every early score. */
const DEFAULT_CONFIDENCE = 50

export function ChallengeCard({
  challenge,
  prediction,
  answerReady,
  onLock,
}: ChallengeCardProps) {
  const [selected, setSelected] = useState<OptionId | null>(null)
  const [confidence, setConfidence] = useState(DEFAULT_CONFIDENCE)

  const locked = prediction !== null
  // Once locked, the prediction is the single source of truth — local state is
  // ignored from that point, so nothing on screen can drift from what was committed.
  const activeId = prediction?.optionId ?? selected
  const shownConfidence = prediction?.confidence ?? confidence

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <span className="font-mono text-[11px] tracking-wider text-signal uppercase">
            {locked ? 'Prediction locked' : 'Before AI answers'}
          </span>
          <span className="font-mono text-[10px] tracking-wider text-ink-faint uppercase">
            {CATEGORY_LABEL[challenge.category]}
          </span>
        </div>

        <div className="px-5 py-5">
          <h2 className="text-[17px] leading-snug font-medium text-balance text-ink">
            {challenge.question}
          </h2>

          <div
            className="mt-4 space-y-2"
            role="radiogroup"
            aria-label={challenge.question}
          >
            {challenge.options.map((option) => (
              <OptionButton
                key={option.id}
                option={option}
                selected={activeId === option.id}
                locked={locked}
                onSelect={setSelected}
              />
            ))}
          </div>

          <div className="mt-5 border-t border-line pt-5">
            <ConfidenceSlider
              value={shownConfidence}
              disabled={locked}
              onChange={setConfidence}
            />
          </div>

          <AnimatePresence mode="wait" initial={false}>
            {locked ? (
              <motion.p
                key="locked"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.25 }}
                className="mt-5 text-center text-[13px] text-ink-faint"
              >
                {answerReady
                  ? 'Committed. Opening the answer…'
                  : 'Committed. Waiting for the answer to finish.'}
              </motion.p>
            ) : (
              <motion.div
                key="lock"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-5"
              >
                <LockButton
                  disabled={selected === null}
                  answerReady={answerReady}
                  onLock={() => selected && onLock(selected, confidence)}
                />
                <p className="mt-3 text-center text-[13px] text-ink-faint">
                  {answerReady
                    ? 'The answer is ready and sealed. Lock your prediction to open it.'
                    : 'You can lock in before the AI finishes. The answer stays hidden either way.'}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>
    </motion.div>
  )
}
