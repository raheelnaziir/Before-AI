'use client'

import { motion, useInView, useReducedMotion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import { CountUp } from './CountUp'
import { MonoLabel, Stat, Streamed } from './demo-ui'
import { EASE } from './motion'
import { Reveal } from './Reveal'
import { SectionHeading } from './SectionHeading'
import { cn } from '@/lib/cn'
import { brierScore, calibrationNote } from '@/lib/scoring/brier'

const PROMPT =
  'My useEffect hook is firing twice on mount in my React app. Why?'

const QUESTION = 'What do you think is causing it?'

const OPTIONS = [
  { id: 'A', label: 'A missing dependency array' },
  { id: 'B', label: 'A duplicated event listener' },
  { id: 'C', label: 'Two React roots mounting the tree' },
  { id: 'D', label: 'React Strict Mode in development' },
] as const

const PICK = 'C'
const CORRECT = 'D'
const CONFIDENCE = 50
const SCORE = brierScore(CONFIDENCE, 'miss')
const NOTE = calibrationNote(CONFIDENCE, 'miss')

const ANSWER =
  'React Strict Mode intentionally invokes certain lifecycle behavior twice in development, so effects with unsafe side effects surface immediately rather than in production.'

/**
 * Beat lengths, in ms. Index is the step being *left*, so the last entry is
 * unused — the run ends on the verdict and stays there.
 */
const BEATS = [1300, 1700, 900, 900, 1100, 2600] as const

/** 0 prompt · 1 challenge · 2 picked · 3 confidence · 4 locked · 5 answer · 6 verdict */
const LAST_STEP = 6

export function ProductDemo() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.35 })
  const reduced = useReducedMotion()

  // Reduced motion gets the finished round in one go: same information, no
  // sequence to sit through.
  const [step, setStep] = useState(0)
  const [runId, setRunId] = useState(0)

  const animated = !reduced

  useEffect(() => {
    if (!inView) return
    if (reduced) {
      setStep(LAST_STEP)
      return
    }
    if (step >= LAST_STEP) return

    const timer = setTimeout(() => setStep((s) => s + 1), BEATS[step] ?? 1200)
    return () => clearTimeout(timer)
  }, [inView, reduced, step])

  const replay = useCallback(() => {
    setStep(0)
    setRunId((id) => id + 1)
  }, [])

  const revealed = step >= 5
  const picked = step >= 2
  const locked = step >= 4

  return (
    <section aria-labelledby="what-it-does-heading" className="py-20 sm:py-24 lg:py-32">
      <Reveal>
        <SectionHeading
          eyebrow="What Before AI does"
          id="what-it-does-heading"
          lede={
            <p>
              When your AI request starts, Before AI generates a contextual
              prediction challenge based on what you asked.
            </p>
          }
        >
          Don&apos;t watch AI think. Think with it.
        </SectionHeading>
      </Reveal>

      <Reveal delay={0.08} className="mt-12 lg:mt-16">
        <div ref={ref} className="mx-auto w-full max-w-2xl">
          <div className="overflow-hidden rounded-2xl border border-line bg-base edge-light">
            {/* Chrome */}
            <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  aria-hidden
                  className={cn(
                    'size-1.5 shrink-0 rounded-full',
                    revealed ? 'bg-signal' : 'animate-pulse-dot bg-signal',
                  )}
                />
                <MonoLabel className="truncate text-ink-muted">
                  {revealed ? 'Round complete' : 'Machine working'}
                </MonoLabel>
              </div>

              <button
                type="button"
                onClick={replay}
                className="shrink-0 rounded border border-line px-2 py-1 font-mono text-[9px] tracking-wider text-ink-faint uppercase transition-colors hover:border-line-strong hover:text-ink"
              >
                Replay
              </button>
            </div>

            <div className="space-y-4 px-4 py-5 sm:px-5">
              {/* Prompt */}
              <div className="rounded-xl border border-line bg-overlay/40 px-4 py-3.5">
                <MonoLabel className="text-ink-faint">You asked</MonoLabel>
                <Streamed
                  key={`prompt-${runId}`}
                  text={PROMPT}
                  animated={animated}
                  className="mt-2 text-[14.5px] leading-relaxed text-ink-muted"
                />
              </div>

              {/* Challenge — collapses to a one-line summary once the answer lands */}
              <div className="min-h-[19.5rem] sm:min-h-[18rem]">
                {step === 0 ? (
                  <div className="rounded-xl border border-line bg-raised px-4 py-4">
                    <div className="flex items-center gap-3">
                      <span aria-hidden className="flex items-end gap-1">
                        {[0, 1, 2].map((i) => (
                          <span
                            key={i}
                            className="animate-drift size-1.5 rounded-full bg-signal-dim"
                            style={{ animationDelay: `${i * 0.22}s` }}
                          />
                        ))}
                      </span>
                      <p className="text-sm text-ink">
                        Reading your prompt · building a challenge
                      </p>
                    </div>

                    <div className="mt-5 h-px w-full overflow-hidden bg-line">
                      <div className="animate-sweep h-full w-1/3 bg-gradient-to-r from-transparent via-signal to-transparent" />
                    </div>

                    <MonoLabel className="mt-5 leading-relaxed text-ink-faint">
                      The real request is already streaming · into a sealed buffer
                    </MonoLabel>
                  </div>
                ) : null}

                {step >= 1 && !revealed ? (
                  <motion.div
                    initial={animated ? { opacity: 0, y: 10 } : false}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: EASE }}
                    className="rounded-xl border border-line bg-raised px-4 py-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <MonoLabel className="text-signal">While AI works…</MonoLabel>
                      <MonoLabel className="text-ink-faint">Debugging</MonoLabel>
                    </div>

                    <p className="mt-3 text-[15px] leading-snug font-medium text-ink">
                      {QUESTION}
                    </p>

                    <ul className="mt-3.5 space-y-2">
                      {OPTIONS.map((option, i) => {
                        const active = picked && option.id === PICK
                        return (
                          <motion.li
                            key={option.id}
                            initial={animated ? { opacity: 0, y: 6 } : false}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                              duration: 0.3,
                              delay: animated ? 0.1 + i * 0.09 : 0,
                              ease: EASE,
                            }}
                            className={cn(
                              'flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors duration-300',
                              active
                                ? 'border-signal/60 bg-signal/[0.07]'
                                : 'border-line bg-overlay/40',
                              picked && !active && 'opacity-45',
                            )}
                          >
                            <span
                              className={cn(
                                'flex size-5 shrink-0 items-center justify-center rounded font-mono text-[10px] transition-colors duration-300',
                                active
                                  ? 'bg-signal text-void'
                                  : 'border border-line-strong text-ink-faint',
                              )}
                            >
                              {option.id}
                            </span>
                            <span
                              className={cn(
                                'min-w-0 text-[13.5px] transition-colors duration-300',
                                active ? 'text-ink' : 'text-ink-muted',
                              )}
                            >
                              {option.label}
                            </span>
                          </motion.li>
                        )
                      })}
                    </ul>

                    <div className="mt-4 flex items-baseline justify-between gap-3">
                      <MonoLabel className="text-ink-faint">Confidence</MonoLabel>
                      <span className="font-mono text-[13px] tabular-nums text-signal">
                        {step >= 3 ? `${CONFIDENCE}%` : '—'}
                      </span>
                    </div>

                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-line">
                      <motion.div
                        className="h-full rounded-full bg-signal-dim"
                        initial={false}
                        animate={{ width: step >= 3 ? `${CONFIDENCE}%` : '0%' }}
                        transition={{ duration: 0.6, ease: EASE }}
                      />
                    </div>

                    <div
                      className={cn(
                        'mt-4 rounded-lg px-4 py-3 text-center font-mono text-[11px] tracking-[0.14em] uppercase',
                        'transition-all duration-500',
                        locked
                          ? 'bg-signal text-void shadow-[0_0_26px_-8px_var(--color-signal)]'
                          : 'border border-line bg-overlay/40 text-ink-faint',
                      )}
                    >
                      {locked ? 'Prediction locked' : 'Lock prediction'}
                    </div>
                  </motion.div>
                ) : null}

                {revealed ? (
                  <motion.div
                    initial={animated ? { opacity: 0, y: 10 } : false}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, ease: EASE }}
                    className="space-y-4"
                  >
                    {/* What was committed, kept in view next to the answer */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border border-line bg-overlay/40 px-4 py-3">
                      <MonoLabel className="text-ink-faint">You said</MonoLabel>
                      <span className="font-mono text-[12px] text-ink">{PICK}</span>
                      <span className="min-w-0 truncate text-[13px] text-ink-muted">
                        Two React roots mounting the tree
                      </span>
                      <span className="ml-auto font-mono text-[12px] tabular-nums text-ink-faint">
                        {CONFIDENCE}%
                      </span>
                    </div>

                    <div className="rounded-xl border border-line bg-raised px-4 py-4">
                      <MonoLabel className="text-signal">AI says…</MonoLabel>
                      <Streamed
                        key={`answer-${runId}`}
                        text={ANSWER}
                        animated={animated}
                        className="mt-2.5 text-[14px] leading-relaxed text-ink-muted"
                      />
                    </div>

                    {step >= LAST_STEP ? (
                      <motion.div
                        initial={animated ? { opacity: 0, scale: 0.985 } : false}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.4, ease: EASE }}
                        className="rounded-xl border border-violet/35 bg-violet/[0.05] px-4 py-4 edge-light"
                      >
                        <MonoLabel className="text-ink-faint">Verdict</MonoLabel>
                        <p className="mt-1 text-[clamp(1.35rem,1.1rem+1vw,1.75rem)] font-medium tracking-tight text-violet">
                          AI got you.
                        </p>

                        <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-line pt-4">
                          <Stat label="Answer">{CORRECT}</Stat>
                          <Stat label="You said">{PICK}</Stat>
                          <Stat label="Score">
                            {animated ? <CountUp value={SCORE} duration={0.9} /> : SCORE}
                          </Stat>
                        </dl>

                        <p className="mt-3.5 text-[13px] leading-relaxed text-ink-muted">
                          {NOTE}
                        </p>
                      </motion.div>
                    ) : null}
                  </motion.div>
                ) : null}
              </div>
            </div>
          </div>

          <p className="mt-4 text-center text-[13px] leading-relaxed text-ink-faint">
            A miss still scores {SCORE} out of 100 — hedging at {CONFIDENCE}% is
            cheaper than being certain and wrong.
          </p>
        </div>
      </Reveal>
    </section>
  )
}
