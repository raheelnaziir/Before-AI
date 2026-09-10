'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useRef, type KeyboardEvent } from 'react'
import { MonoLabel } from './demo-ui'
import { EASE } from './motion'
import { Reveal } from './Reveal'
import { SectionHeading } from './SectionHeading'
import { tablistTarget, useAutoAdvance } from './useAutoAdvance'
import { cn } from '@/lib/cn'

interface PromptType {
  id: string
  kind: string
  /** The one-line promise for this kind of prompt. */
  tagline: string
  prompt: string
  question: string
  options: readonly string[]
}

const TYPES: readonly PromptType[] = [
  {
    id: 'coding',
    kind: 'Coding',
    tagline: 'Predict the bug.',
    prompt: 'This list re-renders on every keystroke. What am I doing wrong?',
    question: 'What will the AI blame?',
    options: [
      'A new array identity each render',
      'A missing key prop',
      'State lifted too high',
    ],
  },
  {
    id: 'research',
    kind: 'Research',
    tagline: 'Predict the conclusion.',
    prompt:
      'What does the research actually say about remote work and productivity?',
    question: 'Where will it land?',
    options: [
      'Mixed — it depends on task type',
      'Broadly positive',
      'The evidence is too thin to call',
    ],
  },
  {
    id: 'recommendations',
    kind: 'Recommendations',
    tagline: 'Predict what AI will recommend.',
    prompt:
      'Three days in Lisbon. Food and architecture over nightlife. What should I do?',
    question: 'What goes on day one?',
    options: ['Alfama, on foot', 'Belém and the monastery', 'A day trip to Sintra'],
  },
  {
    id: 'technical',
    kind: 'Technical',
    tagline: 'Predict the answer.',
    prompt:
      'Append-heavy event log with range queries by timestamp. Postgres or MongoDB?',
    question: 'Which way will it go?',
    options: [
      'Postgres, with a BRIN index',
      'MongoDB, for write throughput',
      'It refuses to pick either',
    ],
  },
  {
    id: 'data',
    kind: 'Data',
    tagline: 'Predict the trend.',
    prompt: "Here's eighteen months of signups by channel. What's happening?",
    question: 'What will it call the driver?',
    options: [
      'Seasonality, not growth',
      'One channel carrying the rest',
      'A tracking change mid-series',
    ],
  },
  {
    id: 'creative',
    kind: 'Creative',
    tagline: 'Predict the direction.',
    prompt: 'Write a tagline for a product that makes waiting for AI worth something.',
    question: 'Which angle does it take?',
    options: [
      'Reframe the wait as yours',
      'Lean on speed anyway',
      'Make it about curiosity',
    ],
  },
]

/**
 * The adaptive-challenge section.
 *
 * A tablist rather than six cards: the point is that one waiting experience
 * reshapes itself per prompt, and a single panel that keeps changing shows that
 * far better than six static tiles sitting side by side.
 */
export function PromptTypes() {
  const { containerRef, index, select, holdProps } = useAutoAdvance<HTMLDivElement>({
    count: TYPES.length,
    dwell: 4200,
  })

  const tabsRef = useRef<Array<HTMLButtonElement | null>>([])
  const active = TYPES[index] ?? TYPES[0]

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const next = tablistTarget(event.key, index, TYPES.length)
    if (next === null) return
    event.preventDefault()
    select(next)
    tabsRef.current[next]?.focus()
  }

  if (!active) return null

  return (
    <section aria-labelledby="adapts-heading" className="py-20 sm:py-24 lg:py-32">
      <Reveal>
        <SectionHeading
          eyebrow="It adapts to the prompt"
          id="adapts-heading"
          lede={
            <p>
              The challenge is generated from what you actually asked, so it
              changes shape with the task — not a quiz bolted onto a spinner.
            </p>
          }
        >
          One waiting experience. Any kind of AI task.
        </SectionHeading>
      </Reveal>

      <Reveal delay={0.08} className="mt-12 lg:mt-16">
        <div
          ref={containerRef}
          {...holdProps}
          className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]"
        >
          <div
            role="tablist"
            aria-label="Prompt types"
            aria-orientation="vertical"
            onKeyDown={onKeyDown}
            className="grid grid-cols-2 gap-px bg-line sm:grid-cols-3 lg:grid-cols-1"
          >
            {TYPES.map((type, i) => {
              const selected = i === index
              return (
                <button
                  key={type.id}
                  ref={(el) => {
                    tabsRef.current[i] = el
                  }}
                  type="button"
                  role="tab"
                  id={`type-tab-${type.id}`}
                  aria-selected={selected}
                  aria-controls="type-panel"
                  tabIndex={selected ? 0 : -1}
                  onClick={() => select(i)}
                  className={cn(
                    'relative px-4 py-3.5 text-left transition-colors duration-200 lg:px-5 lg:py-4',
                    selected ? 'bg-raised' : 'bg-base hover:bg-overlay/60',
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      'absolute inset-y-0 left-0 w-px transition-colors duration-300',
                      selected ? 'bg-signal' : 'bg-transparent',
                    )}
                  />
                  <span
                    className={cn(
                      'block font-mono text-[10px] tracking-[0.16em] uppercase transition-colors',
                      selected ? 'text-signal' : 'text-ink-faint',
                    )}
                  >
                    {type.kind}
                  </span>
                  <span
                    className={cn(
                      'mt-1.5 block text-[13px] leading-tight transition-colors',
                      selected ? 'text-ink' : 'text-ink-faint',
                    )}
                  >
                    {type.tagline}
                  </span>
                </button>
              )
            })}
          </div>

          <div
            id="type-panel"
            role="tabpanel"
            aria-labelledby={`type-tab-${active.id}`}
            tabIndex={0}
            className="min-h-[19rem] bg-base p-5 sm:p-7"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={active.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: EASE }}
              >
                <MonoLabel className="text-ink-faint">The prompt</MonoLabel>
                <p className="mt-2.5 text-[clamp(0.95rem,0.9rem+0.35vw,1.125rem)] leading-relaxed text-ink">
                  {active.prompt}
                </p>

                <div className="mt-6 border-t border-line pt-6">
                  <MonoLabel className="text-signal">
                    While AI works · {active.kind}
                  </MonoLabel>
                  <p className="mt-2.5 text-[15px] leading-snug font-medium text-ink">
                    {active.question}
                  </p>

                  <ul className="mt-4 space-y-2">
                    {active.options.map((option, i) => (
                      <motion.li
                        key={option}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.28, delay: 0.08 + i * 0.07, ease: EASE }}
                        className="flex items-center gap-3 rounded-lg border border-line bg-overlay/40 px-3 py-2.5"
                      >
                        <span className="flex size-5 shrink-0 items-center justify-center rounded border border-line-strong font-mono text-[10px] text-ink-faint">
                          {String.fromCharCode(65 + i)}
                        </span>
                        <span className="min-w-0 text-[13.5px] text-ink-muted">
                          {option}
                        </span>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </Reveal>
    </section>
  )
}
