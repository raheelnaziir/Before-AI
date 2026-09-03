'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { ChallengeCard } from '@/components/challenge/ChallengeCard'
import { ExamplePrompts } from '@/components/landing/ExamplePrompts'
import { Hero } from '@/components/landing/Hero'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { PromptInput } from '@/components/landing/PromptInput'
import { AnswerPanel } from '@/components/reveal/AnswerPanel'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { SystemStatus } from '@/components/ui/SystemStatus'
import { MachineWorkingPanel } from '@/components/waiting/MachineWorkingPanel'
import { isAnswerHeld, isAwaitingAnswer } from '@/lib/round/machine'
import { useRound } from '@/lib/round/useRound'
import { useElapsed } from '@/lib/useElapsed'

const TRANSITION = { duration: 0.32, ease: [0.16, 1, 0.3, 1] } as const

/** Status line for the waiting panel. Describes only what is actually true. */
function waitingStatus(held: boolean, awaiting: boolean, chars: number): string {
  if (held) return 'Answer complete. Waiting on your prediction.'
  if (awaiting) return 'Prediction locked. The AI is still working.'
  if (chars > 0) return 'Answer is forming…'
  return 'Connected. Waiting for the first tokens…'
}

export default function Page() {
  const [prompt, setPrompt] = useState('')
  const { state, answer, start, lock, reset } = useRound()

  const elapsed = useElapsed(state.status === 'idle' ? null : state.startedAt)

  const held = isAnswerHeld(state)
  const awaiting = isAwaitingAnswer(state)
  const isIdle = state.status === 'idle'
  const isError = state.status === 'error'
  const revealed = state.status === 'completed' && answer !== null

  function handleSubmit() {
    if (!prompt.trim()) return
    start(prompt.trim())
  }

  function handleReset() {
    reset()
  }

  return (
    <div className="relative min-h-dvh bg-ambient">
      <div className="mx-auto flex min-h-dvh max-w-3xl flex-col px-6 lg:max-w-4xl">
        <div className="flex items-center justify-between py-6">
          <span className="font-mono text-[11px] tracking-[0.2em] text-ink-muted uppercase">
            Before&nbsp;AI
          </span>
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
                  state.challenge &&
                  state.prediction && (
                    <AnswerPanel
                      text={answer}
                      answer={state.answer}
                      challenge={state.challenge}
                      prediction={state.prediction}
                    />
                  )
                ) : (
                  <>
                    <MachineWorkingPanel
                      elapsedMs={elapsed}
                      status={waitingStatus(held, awaiting, state.chars)}
                      chars={state.chars}
                      reasoning={state.reasoning}
                      held={held}
                      demo={state.mode === 'demo'}
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
                  <Button variant="ghost" onClick={handleReset}>
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
