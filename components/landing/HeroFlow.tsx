'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { CountUp } from './CountUp'
import { MonoLabel, Stat, Streamed } from './demo-ui'
import { EASE } from './motion'
import { useAutoAdvance, tablistTarget } from './useAutoAdvance'
import { cn } from '@/lib/cn'
import { brierScore } from '@/lib/scoring/brier'

/* -------------------------------------------------------------------------- */
/* Script                                                                      */
/* -------------------------------------------------------------------------- */

const STAGES = [
  { id: 'prompt', label: 'User prompt', ms: 2600 },
  { id: 'working', label: 'AI is thinking', ms: 3600 },
  { id: 'turn', label: 'Your turn', ms: 2000 },
  { id: 'predict', label: 'Predict', ms: 4600 },
  { id: 'answer', label: 'AI answer', ms: 3400 },
  { id: 'reveal', label: 'Reveal', ms: 4000 },
] as const

const DWELL = STAGES.map((stage) => stage.ms)

/** Nominal clock reading per stage. Used whenever the cycle is not running. */
const STAGE_ELAPSED = [400, 2800, 3900, 4600, 6100, 6400] as const

const PROMPT = 'Why is my useEffect firing twice on mount in React?'

const OPTIONS = [
  { id: 'A', label: 'Stale dependency array' },
  { id: 'B', label: 'React Strict Mode' },
  { id: 'C', label: 'Two roots mounting' },
  { id: 'D', label: 'Parent re-render loop' },
] as const

const PICK = 'B'
const CONFIDENCE = 72
const SCORE = brierScore(CONFIDENCE, 'hit')

/* -------------------------------------------------------------------------- */
/* Stages                                                                      */
/* -------------------------------------------------------------------------- */

function PromptStage({ animated }: { animated: boolean }) {
  return (
    <div>
      <MonoLabel className="text-ink-faint">You asked</MonoLabel>
      <Streamed
        text={PROMPT}
        animated={animated}
        caret
        className="mt-3 text-[clamp(0.95rem,0.9rem+0.3vw,1.0625rem)] leading-relaxed text-ink"
      />
      <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-line pt-4">
        <span className="rounded border border-line-strong px-2 py-0.5 font-mono text-[10px] tracking-wider text-signal uppercase">
          Debugging
        </span>
        <span className="text-[12.5px] text-ink-faint">
          classified before either model call
        </span>
      </div>
    </div>
  )
}

function WorkingStage({ animated }: { animated: boolean }) {
  return (
    <div>
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
        <p className="text-sm text-ink">The answer is forming.</p>
      </div>

      <div className="mt-5 h-px w-full overflow-hidden bg-line">
        <div className="animate-sweep h-full w-1/3 bg-gradient-to-r from-transparent via-signal to-transparent" />
      </div>

      <dl className="mt-5 grid grid-cols-3 gap-3">
        <Stat label="Elapsed">2.8s</Stat>
        <Stat label="Streamed">
          {animated ? <CountUp value={1284} duration={2.4} /> : 1284}
          <span className="ml-1 text-[9px] text-ink-faint">chars</span>
        </Stat>
        <Stat label="Reasoning">active</Stat>
      </dl>

      <MonoLabel className="mt-6 border-t border-dashed border-line pt-4 leading-relaxed text-ink-faint">
        Streaming into a sealed buffer · hidden until you commit
      </MonoLabel>
    </div>
  )
}

function TurnStage() {
  return (
    <div className="flex h-full flex-col justify-center">
      <MonoLabel className="text-signal">Answer withheld</MonoLabel>
      <p className="mt-4 text-[clamp(1.5rem,1.2rem+1.4vw,2.25rem)] font-semibold tracking-[-0.02em] text-ink">
        Your turn.
      </p>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-muted">
        A challenge built from your prompt — not a mini-game bolted onto a
        spinner.
      </p>
    </div>
  )
}

function PredictStage({ animated }: { animated: boolean }) {
  // The script inside the stage. Without motion it renders straight to the end
  // state, so the panel still shows a made choice rather than an empty form.
  const [picked, setPicked] = useState<string | null>(animated ? null : PICK)
  const [locked, setLocked] = useState(!animated)

  useEffect(() => {
    if (!animated) return
    const pick = setTimeout(() => setPicked(PICK), 1500)
    const lock = setTimeout(() => setLocked(true), 3400)
    return () => {
      clearTimeout(pick)
      clearTimeout(lock)
    }
  }, [animated])

  return (
    <div>
      <p className="text-[14.5px] leading-snug font-medium text-ink">
        What will the AI blame?
      </p>

      <div className="mt-3.5 grid gap-2 sm:grid-cols-2">
        {OPTIONS.map((option, i) => {
          const active = picked === option.id
          return (
            <motion.div
              key={option.id}
              initial={animated ? { opacity: 0, y: 6 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: animated ? 0.06 + i * 0.08 : 0, ease: EASE }}
              className={cn(
                'flex items-center gap-2.5 rounded-lg border px-2.5 py-2 transition-colors duration-300',
                active
                  ? 'border-signal/60 bg-signal/[0.07]'
                  : 'border-line bg-overlay/40',
                picked !== null && !active && 'opacity-40',
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
                  'truncate text-[12.5px] transition-colors duration-300',
                  active ? 'text-ink' : 'text-ink-muted',
                )}
              >
                {option.label}
              </span>
            </motion.div>
          )
        })}
      </div>

      <div className="mt-4 flex items-baseline justify-between gap-3">
        <MonoLabel className="text-ink-faint">Confidence</MonoLabel>
        <span className="font-mono text-[13px] tabular-nums text-signal">
          {animated ? (
            <CountUp value={CONFIDENCE} suffix="%" duration={0.7} delay={1.9} />
          ) : (
            `${CONFIDENCE}%`
          )}
        </span>
      </div>

      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-line">
        <motion.div
          className="h-full rounded-full bg-signal-dim"
          initial={animated ? { width: 0 } : false}
          animate={{ width: `${CONFIDENCE}%` }}
          transition={{ duration: 0.7, delay: animated ? 1.9 : 0, ease: EASE }}
        />
      </div>

      <div
        className={cn(
          'mt-4 rounded-lg px-4 py-2.5 text-center font-mono text-[11px] tracking-[0.14em] uppercase',
          'transition-all duration-500',
          locked
            ? 'bg-signal text-void shadow-[0_0_26px_-8px_var(--color-signal)]'
            : 'border border-line bg-overlay/40 text-ink-faint',
        )}
      >
        {locked ? 'Prediction locked' : 'Lock it in'}
      </div>
    </div>
  )
}

function AnswerStage({ animated }: { animated: boolean }) {
  return (
    <div>
      <MonoLabel className="text-signal">AI says</MonoLabel>
      <Streamed
        animated={animated}
        text="React Strict Mode intentionally invokes certain lifecycle behaviour twice in development to surface unsafe side effects."
        className="mt-3 text-[14px] leading-relaxed text-ink-muted"
      />
      <dl className="mt-6 grid grid-cols-3 gap-3 border-t border-line pt-4">
        <Stat label="Model">claude-opus-5</Stat>
        <Stat label="Streamed">1284</Stat>
        <Stat label="Latency">4.6s</Stat>
      </dl>
    </div>
  )
}

function RevealStage() {
  return (
    <div className="flex h-full flex-col justify-center">
      <div className="rounded-xl border border-signal/40 bg-signal/[0.05] px-4 py-3.5">
        <MonoLabel className="text-ink-faint">Verdict</MonoLabel>
        <p className="mt-1 text-[clamp(1.25rem,1.05rem+0.9vw,1.75rem)] font-medium tracking-tight text-signal">
          You called it
        </p>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-3">
        <Stat label="You said">{PICK}</Stat>
        <Stat label="Answer">{PICK}</Stat>
        <Stat label="Score">{SCORE}</Stat>
      </dl>

      <p className="mt-4 text-[12.5px] leading-relaxed text-ink-faint">
        Right, and you hedged at {CONFIDENCE}%. The score rewards knowing what
        you know.
      </p>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Panel                                                                       */
/* -------------------------------------------------------------------------- */

function ElapsedClock({
  running,
  index,
  cycle,
}: {
  running: boolean
  index: number
  cycle: number
}) {
  const [ms, setMs] = useState(0)

  useEffect(() => setMs(0), [cycle])

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setMs((v) => v + 100), 100)
    return () => clearInterval(id)
  }, [running])

  // Before the clock has ever run — reduced motion, or a stage picked by hand —
  // it shows that stage's nominal reading rather than a dead 0.0s.
  const shown = ms > 0 ? ms : (STAGE_ELAPSED[index] ?? 0)

  return (
    <span className="font-mono text-[11px] tabular-nums text-ink-faint">
      {(shown / 1000).toFixed(1)}s
    </span>
  )
}

/**
 * The concept, as a working interface.
 *
 * Six stages of one round, driven by the shared auto-advance hook: it runs only
 * while on screen, holds on hover or focus, and retires permanently the first
 * time someone picks a stage themselves. Implemented as a real tablist — the
 * rail is keyboard-navigable, so nothing here depends on the animation to be
 * understood.
 */
export function HeroFlow() {
  const reduced = useReducedMotion()
  const animated = !reduced
  const { containerRef, index, cycle, running, select, holdProps } =
    useAutoAdvance<HTMLDivElement>({ count: STAGES.length, dwell: DWELL })

  const tabsRef = useRef<Array<HTMLButtonElement | null>>([])
  const stage = STAGES[index] ?? STAGES[0]

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const next = tablistTarget(event.key, index, STAGES.length)
    if (next === null) return
    event.preventDefault()
    select(next)
    tabsRef.current[next]?.focus()
  }

  return (
    <div
      ref={containerRef}
      {...holdProps}
      className="relative overflow-hidden rounded-2xl border border-line bg-base edge-light"
    >
      {/* Chrome */}
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            aria-hidden
            className={cn(
              'size-1.5 shrink-0 rounded-full bg-signal',
              running && 'animate-pulse-dot',
            )}
          />
          <span className="truncate font-mono text-[10px] tracking-[0.18em] text-ink-muted uppercase">
            Before&nbsp;AI · Round
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-2.5">
          <span className="rounded border border-line-strong px-1.5 py-0.5 font-mono text-[9px] tracking-wider text-ink-faint uppercase">
            Preview
          </span>
          <ElapsedClock running={running} index={index} cycle={cycle} />
        </div>
      </div>

      <div className="md:grid md:grid-cols-[minmax(0,10.5rem)_minmax(0,1fr)]">
        {/* Stage rail. `gap-px` over a line-coloured background draws every
            divider in both layouts — the same hairline trick the round UI uses. */}
        <div
          role="tablist"
          aria-label="Round stages"
          aria-orientation="vertical"
          onKeyDown={onKeyDown}
          className="grid grid-cols-3 gap-px border-b border-line bg-line md:grid-cols-1 md:border-r md:border-b-0"
        >
          {STAGES.map((item, i) => {
            const active = i === index
            return (
              <button
                key={item.id}
                ref={(el) => {
                  tabsRef.current[i] = el
                }}
                type="button"
                role="tab"
                id={`flow-tab-${item.id}`}
                aria-selected={active}
                aria-controls="flow-panel"
                tabIndex={active ? 0 : -1}
                onClick={() => select(i)}
                className={cn(
                  'relative overflow-hidden px-3 py-2.5 text-left transition-colors duration-200',
                  active ? 'bg-raised' : 'bg-base hover:bg-overlay/60',
                )}
              >
                <span
                  className={cn(
                    'block font-mono text-[9px] tracking-[0.16em] transition-colors',
                    active ? 'text-signal' : 'text-ink-faint',
                  )}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span
                  className={cn(
                    'mt-0.5 block text-[11.5px] leading-tight transition-colors',
                    active ? 'text-ink' : 'text-ink-faint',
                  )}
                >
                  {item.label}
                </span>

                {/* Dwell meter on the active step. */}
                {active && running ? (
                  <motion.span
                    aria-hidden
                    key={`${cycle}-${item.id}`}
                    className="absolute inset-x-0 bottom-0 h-px origin-left bg-signal/70"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: item.ms / 1000, ease: 'linear' }}
                  />
                ) : active ? (
                  <span
                    aria-hidden
                    className="absolute inset-x-0 bottom-0 h-px bg-signal/70"
                  />
                ) : null}
              </button>
            )
          })}
        </div>

        {/* Stage content */}
        <div
          id="flow-panel"
          role="tabpanel"
          aria-labelledby={`flow-tab-${stage.id}`}
          tabIndex={0}
          className="min-h-[20rem] px-4 py-5 sm:px-6 sm:py-6"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`${stage.id}-${cycle}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: EASE }}
              className="h-full"
            >
              {stage.id === 'prompt' && <PromptStage animated={animated} />}
              {stage.id === 'working' && <WorkingStage animated={animated} />}
              {stage.id === 'turn' && <TurnStage />}
              {stage.id === 'predict' && <PredictStage animated={animated} />}
              {stage.id === 'answer' && <AnswerStage animated={animated} />}
              {stage.id === 'reveal' && <RevealStage />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
