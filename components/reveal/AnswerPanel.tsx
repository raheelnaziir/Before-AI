'use client'

import { motion } from 'framer-motion'
import { Card } from '@/components/ui/Card'
import type { AnswerResult, Challenge, Prediction } from '@/types'

interface AnswerPanelProps {
  /** Already past the Commitment Gate — `revealedAnswer()` returned non-null. */
  text: string
  answer: AnswerResult | null
  challenge: Challenge
  prediction: Prediction
}

export function AnswerPanel({ text, answer, challenge, prediction }: AnswerPanelProps) {
  const picked = challenge.options.find((option) => option.id === prediction.optionId)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-4"
    >
      {/* What the user committed to. No verdict — grading is a later task. */}
      <Card className="px-5 py-4">
        <p className="font-mono text-[10px] tracking-wider text-ink-faint uppercase">
          You predicted
        </p>
        <div className="mt-2 flex items-baseline gap-2.5">
          <span className="font-mono text-[11px] text-signal">{prediction.optionId}</span>
          <span className="text-sm text-ink">{picked?.label ?? '—'}</span>
        </div>
        <p className="mt-2 font-mono text-[10px] tracking-wider text-ink-faint uppercase">
          {prediction.lockedBeforeAnswer
            ? 'Locked before the answer finished'
            : 'Locked after the answer finished'}
        </p>
      </Card>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <span className="font-mono text-[11px] tracking-wider text-ink uppercase">
            AI answer
          </span>
          <span className="font-mono text-[10px] tracking-wider text-ink-faint uppercase">
            {answer
              ? `${answer.outputTokens.toLocaleString()} tok · ${(answer.latencyMs / 1000).toFixed(1)}s`
              : ''}
          </span>
        </div>

        <div className="px-5 py-5">
          {/* Plain text on purpose — markdown rendering is not this task. */}
          <div className="space-y-4 text-[15px] leading-relaxed whitespace-pre-wrap text-ink-muted">
            {text}
          </div>
        </div>

        {answer && (
          <div className="border-t border-line px-5 py-3">
            <span className="font-mono text-[10px] tracking-wider text-ink-faint uppercase">
              {answer.model}
            </span>
          </div>
        )}
      </Card>
    </motion.div>
  )
}
