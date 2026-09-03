'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'
import { LockButton } from './LockButton'
import { OptionButton } from './OptionButton'
import { Card } from '@/components/ui/Card'
import type { Challenge, OptionId, Prediction } from '@/types'

interface ChallengeCardProps {
  challenge: Challenge
  prediction: Prediction | null
  /** Answer finished and waiting behind the gate. */
  answerReady: boolean
  onLock: (optionId: OptionId) => void
}

export function ChallengeCard({
  challenge,
  prediction,
  answerReady,
  onLock,
}: ChallengeCardProps) {
  const [selected, setSelected] = useState<OptionId | null>(null)

  const locked = prediction !== null
  const activeId = prediction?.optionId ?? selected

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <span className="font-mono text-[11px] tracking-wider text-signal uppercase">
            Your prediction
          </span>
          {challenge.isPlaceholder && (
            <span
              className="font-mono text-[10px] tracking-wider text-ink-faint uppercase"
              title="Stand-in challenge. The real one is generated per prompt in a later task."
            >
              Placeholder
            </span>
          )}
        </div>

        <div className="px-5 py-5">
          <h2 className="text-[17px] leading-snug font-medium text-balance text-ink">
            {challenge.question}
          </h2>

          <div className="mt-4 space-y-2" role="radiogroup" aria-label={challenge.question}>
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

          {!locked && (
            <div className="mt-5">
              <LockButton
                disabled={selected === null}
                answerReady={answerReady}
                onLock={() => selected && onLock(selected)}
              />
              <p className="mt-3 text-center text-[13px] text-ink-faint">
                {answerReady
                  ? 'The answer is ready. Lock your prediction to reveal it.'
                  : 'You can lock in before the AI finishes. The answer stays hidden either way.'}
              </p>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  )
}
