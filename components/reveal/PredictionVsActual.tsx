'use client'

import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/cn'
import type { Challenge, Grade, Prediction } from '@/types'

interface PredictionVsActualProps {
  challenge: Challenge
  prediction: Prediction
  /** null while grading is in flight, or if it failed. */
  grade: Grade | null
}

export function PredictionVsActual({
  challenge,
  prediction,
  grade,
}: PredictionVsActualProps) {
  const picked = challenge.options.find((o) => o.id === prediction.optionId)
  const actual =
    grade === null
      ? null
      : (challenge.options.find((o) => o.id === grade.correctOptionId) ?? null)

  const agreed = grade !== null && grade.correctOptionId === prediction.optionId

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-line px-5 py-3">
        <span className="font-mono text-[11px] tracking-wider text-ink-muted uppercase">
          Prediction vs. answer
        </span>
      </div>

      <div className="divide-y divide-line">
        <Row
          label="You predicted"
          optionId={prediction.optionId}
          text={picked?.label ?? '—'}
          accent="signal"
          meta={`${prediction.confidence}% confident · ${
            prediction.lockedBeforeAnswer
              ? 'locked before the answer finished'
              : 'locked after the answer finished'
          }`}
        />

        {/* Collapsed to one row when they agree — showing the same option twice
            under two headings reads as a rendering bug, not a result. */}
        {!agreed && (
          <Row
            label="The answer went with"
            optionId={grade?.correctOptionId ?? null}
            text={actual?.label ?? (grade === null ? 'Judging…' : '—')}
            accent="violet"
            meta={actual?.blurb}
          />
        )}
      </div>

      {grade !== null && (
        <div className="border-t border-line px-5 py-4">
          <p className="font-mono text-[10px] tracking-wider text-ink-faint uppercase">
            Why
          </p>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            {grade.explanation}
          </p>
        </div>
      )}
    </Card>
  )
}

interface RowProps {
  label: string
  optionId: string | null
  text: string
  accent: 'signal' | 'violet'
  meta?: string
}

function Row({ label, optionId, text, accent, meta }: RowProps) {
  return (
    <div className="px-5 py-4">
      <p className="font-mono text-[10px] tracking-wider text-ink-faint uppercase">
        {label}
      </p>
      <div className="mt-2 flex items-start gap-3">
        <span
          aria-hidden
          className={cn(
            'mt-px flex size-6 shrink-0 items-center justify-center rounded-md border font-mono text-[11px]',
            accent === 'signal'
              ? 'border-signal/50 bg-signal/10 text-signal'
              : 'border-violet/50 bg-violet/10 text-violet',
          )}
        >
          {optionId ?? '·'}
        </span>
        <div className="min-w-0">
          <p className="text-sm text-ink">{text}</p>
          {meta && (
            <p className="mt-1 text-[13px] leading-relaxed text-ink-faint">{meta}</p>
          )}
        </div>
      </div>
    </div>
  )
}
