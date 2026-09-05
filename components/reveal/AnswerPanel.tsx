'use client'

import { motion } from 'framer-motion'
import { EvidenceHighlight } from './EvidenceHighlight'
import { Card } from '@/components/ui/Card'
import type { AnswerResult, Grade } from '@/types'

interface AnswerPanelProps {
  /** Already past the Commitment Gate — `revealedAnswer()` returned non-null. */
  text: string
  answer: AnswerResult | null
  /** null while grading is in flight; the answer renders without a highlight. */
  grade: Grade | null
}

export function AnswerPanel({ text, answer, grade }: AnswerPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
    >
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
          {/* Plain text on purpose — markdown rendering is not this task. The
              evidence span is marked inside the answer, which is what makes the
              verdict feel earned rather than asserted. */}
          <div className="text-[15px] leading-relaxed text-ink-muted">
            <EvidenceHighlight text={text} quote={grade?.evidenceQuote ?? null} />
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-line px-5 py-3">
          <span className="font-mono text-[10px] tracking-wider text-ink-faint uppercase">
            {answer?.model ?? ''}
          </span>
          {/* Only claimed when a quote survived verification. Silence otherwise —
              there is no fallback quote, because a fabricated one is worse than none. */}
          {grade?.evidenceQuote && (
            <span className="font-mono text-[10px] tracking-wider text-signal-dim uppercase">
              Evidence highlighted
            </span>
          )}
        </div>
      </Card>
    </motion.div>
  )
}
