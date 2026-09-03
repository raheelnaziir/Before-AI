'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { ExamplePrompts } from '@/components/landing/ExamplePrompts'
import { Hero } from '@/components/landing/Hero'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { PromptInput } from '@/components/landing/PromptInput'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { SystemStatus } from '@/components/ui/SystemStatus'
import { MachineWorkingPanel } from '@/components/waiting/MachineWorkingPanel'
import { useElapsed } from '@/lib/useElapsed'
import type { RoundStatus } from '@/types'

/**
 * Stages this shell can reach. Local state on purpose — it is replaced
 * wholesale by the `useRound` reducer + SSE on Day 3, so building the full
 * eight-state machine here would only be thrown away.
 */
type Stage = Extract<RoundStatus, 'idle' | 'processing'>

const TRANSITION = { duration: 0.32, ease: [0.16, 1, 0.3, 1] } as const

export default function Page() {
  const [stage, setStage] = useState<Stage>('idle')
  const [prompt, setPrompt] = useState('')
  const [startedAt, setStartedAt] = useState<number | null>(null)

  const elapsed = useElapsed(startedAt)

  function handleSubmit() {
    if (!prompt.trim()) return
    setStartedAt(Date.now())
    setStage('processing')
  }

  function handleReset() {
    setStage('idle')
    setStartedAt(null)
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
            {stage === 'idle' ? (
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
                key="processing"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={TRANSITION}
                className="mx-auto w-full max-w-2xl"
              >
                <Card className="px-5 py-4">
                  <p className="font-mono text-[10px] tracking-wider text-ink-faint uppercase">
                    Your prompt
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                    {prompt}
                  </p>
                </Card>

                <div className="mt-4">
                  <MachineWorkingPanel elapsedMs={elapsed} connected={false} />
                </div>

                <div className="mt-6 flex justify-center">
                  <Button variant="ghost" onClick={handleReset}>
                    New prompt
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
