'use client'

import { AnimatePresence, motion } from 'framer-motion'
import Link from 'next/link'
import { useCallback, useState } from 'react'
import { ChallengeCard } from '@/components/challenge/ChallengeCard'
import { HistoryDrawer } from '@/components/history/HistoryDrawer'
import { ExamplePrompts } from '@/components/play/ExamplePrompts'
import { Hero } from '@/components/play/Hero'
import { HowItWorks } from '@/components/play/HowItWorks'
import { PromptInput } from '@/components/play/PromptInput'
import { CalibrationPanel } from '@/components/profile/CalibrationPanel'
import { RevealStage } from '@/components/reveal/RevealStage'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { SystemStatus } from '@/components/ui/SystemStatus'
import { MachineWorkingPanel } from '@/components/waiting/MachineWorkingPanel'
import { isAnswerHeld, isAwaitingAnswer, isDegraded, isRevealed } from '@/lib/round/machine'
import { useRound, type RoundCompleteInput } from '@/lib/round/useRound'
import { useProfile } from '@/lib/storage/useProfile'
import { useElapsed } from '@/lib/useElapsed'
import type { RoundRecord } from '@/types'

const TRANSITION = { duration: 0.32, ease: [0.16, 1, 0.3, 1] } as const

/** Status line for the waiting panel. Describes only what is actually true. */
function waitingStatus(
  held: boolean,
  awaiting: boolean,
  degraded: boolean,
  chars: number,
): string {
  if (degraded) return 'No challenge this round. The answer is still coming.'
  if (held) return 'Answer complete. Waiting on your prediction.'
  if (awaiting) return 'Prediction locked. The AI is still working.'
  if (chars > 0) return 'Answer is forming…'
  return 'Connected. Waiting for the first tokens…'
}

export default function Page() {
  const [prompt, setPrompt] = useState('')
  const { profile, rounds, loading, record, clear } = useProfile()

  /**
   * Fold a finished round into the profile.
   *
   * Skipped when there is no grade — an ungraded round has no verdict, and
   * recording a placeholder would quietly corrupt the accuracy number that the
   * whole profile is built on.
   */
  const handleComplete = useCallback(
    ({ state, grade }: RoundCompleteInput) => {
      if (grade === null || state.challenge === null || state.prediction === null) return

      const label =
        state.challenge.options.find((o) => o.id === state.prediction?.optionId)?.label ?? ''

      const entry: RoundRecord = {
        id: state.roundId ?? crypto.randomUUID(),
        createdAt: state.startedAt ?? Date.now(),
        prompt: state.prompt,
        category: state.challenge.category,
        question: state.challenge.question,
        optionId: state.prediction.optionId,
        optionLabel: label,
        confidence: state.prediction.confidence,
        verdict: grade.verdict,
        score: grade.score,
        correctOptionId: grade.correctOptionId,
        lockedBeforeAnswer: state.prediction.lockedBeforeAnswer,
      }

      record(entry)
    },
    [record],
  )

  const { state, answer, start, lock, reset } = useRound({ onComplete: handleComplete })

  const elapsed = useElapsed(state.status === 'idle' ? null : state.startedAt)

  const held = isAnswerHeld(state)
  const awaiting = isAwaitingAnswer(state)
  const degraded = isDegraded(state)
  const isIdle = state.status === 'idle'
  const isError = state.status === 'error'
  const revealed = isRevealed(state) && answer !== null

  function handleSubmit() {
    if (!prompt.trim()) return
    start(prompt.trim())
  }

  return (
    <div className="relative min-h-dvh bg-ambient">
      <div className="mx-auto flex min-h-dvh max-w-3xl flex-col px-6 lg:max-w-4xl">
        <div className="flex items-center justify-between py-6">
          {/* Back to the introduction page. Same type and weight as the plain
              wordmark it replaces, so the header reads exactly as before until
              you hover it. */}
          <Link
            href="/"
            className="group flex items-center gap-2 font-mono text-[11px] tracking-[0.2em] text-ink-muted uppercase transition-colors hover:text-ink"
          >
            <span
              aria-hidden
              className="text-ink-faint transition-all duration-200 group-hover:-translate-x-0.5 group-hover:text-signal"
            >
              ←
            </span>
            Before&nbsp;AI
          </Link>
          <SystemStatus />
        </div>

        <main className="flex flex-1 flex-col justify-center py-12">
          <AnimatePresence mode="wait" initial={false}>
            {isIdle ? (
              <motion.div
                key="idle"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={TRANSITION}
              >
                <Hero />

                <div className="mx-auto mt-12 w-full max-w-2xl">
                  <PromptInput
                    value={prompt}
                    onChange={setPrompt}
                    onSubmit={handleSubmit}
                  />
                  <ExamplePrompts onSelect={setPrompt} />
                </div>

                <div className="mx-auto mt-12 w-full max-w-2xl space-y-4">
                  <CalibrationPanel profile={profile} loading={loading} />
                  <HistoryDrawer rounds={rounds} onClear={clear} />
                </div>

                <HowItWorks />
              </motion.div>
            ) : (
              <motion.div
                key="round"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={TRANSITION}
                className="mx-auto w-full max-w-2xl space-y-4"
              >
                <Card className="px-5 py-4">
                  <p className="font-mono text-[10px] tracking-wider text-ink-faint uppercase">
                    Your prompt
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                    {state.prompt}
                  </p>
                </Card>

                {isError ? (
                  <Card className="px-5 py-6">
                    <p className="font-mono text-[10px] tracking-wider text-violet uppercase">
                      Round failed
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-ink">
                      {state.error ?? 'Something went wrong.'}
                    </p>
                  </Card>
                ) : revealed ? (
                  <>
                    <RevealStage
                      text={answer}
                      answer={state.answer}
                      challenge={state.challenge}
                      prediction={state.prediction}
                      grade={state.grade}
                      gradeError={state.gradeError}
                    />
                    <CalibrationPanel profile={profile} loading={loading} />
                  </>
                ) : (
                  <>
                    <MachineWorkingPanel
                      elapsedMs={elapsed}
                      status={waitingStatus(held, awaiting, degraded, state.chars)}
                      chars={state.chars}
                      reasoning={state.reasoning}
                      held={held}
                      demo={state.mode === 'demo'}
                      intent={state.intent}
                      challengeReady={state.challenge !== null}
                    />

                    {state.challenge && (
                      <ChallengeCard
                        challenge={state.challenge}
                        prediction={state.prediction}
                        answerReady={state.answerComplete}
                        onLock={lock}
                      />
                    )}
                  </>
                )}

                <div className="flex justify-center pt-2">
                  <Button variant="ghost" onClick={reset}>
                    {revealed || isError ? 'Ask something else' : 'Cancel round'}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <footer className="flex items-center justify-between py-6 font-mono text-[10px] tracking-wider text-ink-faint uppercase">
          <span>Think before the machine does</span>
          <span>WaitOS · Experience 01</span>
        </footer>
      </div>
    </div>
  )
}
