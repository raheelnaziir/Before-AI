'use client'

import { motion } from 'framer-motion'
import { AnswerPanel } from './AnswerPanel'
import { PredictionVsActual } from './PredictionVsActual'
import { ScoreBadge } from './ScoreBadge'
import { VerdictBanner } from './VerdictBanner'
import { Card } from '@/components/ui/Card'
import type { AnswerResult, Challenge, Grade, Prediction } from '@/types'

interface RevealStageProps {
  /** Past the Commitment Gate. */
  text: string
  answer: AnswerResult | null
  /** null on a degraded round — challenge generation failed, so there was nothing to predict. */
  challenge: Challenge | null
  prediction: Prediction | null
  grade: Grade | null
  gradeError: string | null
}

/**
 * The payoff.
 *
 * Ordered verdict → score → comparison → answer, which is the order the user
 * wants it in: the result first, the evidence underneath. The staggered entrance
 * is one shared timing curve rather than a per-child orchestration, so the whole
 * sequence lands in ~700ms and grading finishes underneath it.
 */
export function RevealStage({
  text,
  answer,
  challenge,
  prediction,
  grade,
  gradeError,
}: RevealStageProps) {
  const graded = challenge !== null && prediction !== null

  return (
    <motion.div
      initial="hidden"
      animate="shown"
      variants={{
        hidden: {},
        shown: { transition: { staggerChildren: 0.09 } },
      }}
      className="space-y-4"
    >
      {graded ? (
        <>
          <Step>
            <VerdictBanner verdict={grade?.verdict ?? null} failed={gradeError !== null} />
          </Step>

          {grade && (
            <Step>
              <ScoreBadge
                score={grade.score}
                confidence={prediction.confidence}
                verdict={grade.verdict}
              />
            </Step>
          )}

          <Step>
            <PredictionVsActual
              challenge={challenge}
              prediction={prediction}
              grade={grade}
            />
          </Step>
        </>
      ) : (
        // Degraded: no challenge was generated, so there is no prediction and no
        // verdict. Say so plainly instead of rendering an empty verdict shell.
        <Step>
          <Card className="px-5 py-4">
            <p className="font-mono text-[10px] tracking-wider text-ink-faint uppercase">
              No prediction this round
            </p>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              The challenge could not be generated, so there was nothing to commit to.
              The answer below is real and unmodified.
            </p>
          </Card>
        </Step>
      )}

      <Step>
        <AnswerPanel text={text} answer={answer} grade={grade} />
      </Step>
    </motion.div>
  )
}

/** One beat of the reveal. Kept local — nothing else needs this timing. */
function Step({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 12 },
        shown: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
      }}
    >
      {children}
    </motion.div>
  )
}
