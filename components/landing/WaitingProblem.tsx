'use client'

import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { EASE, VIEWPORT } from './motion'
import { Reveal } from './Reveal'
import { SectionHeading } from './SectionHeading'
import { cn } from '@/lib/cn'

interface Step {
  label: string
  /** Renders the step as part of the user's own time rather than dead air. */
  live?: boolean
  /** Small trailing note. */
  note?: ReactNode
}

const TRADITIONAL: Step[] = [
  { label: 'Prompt' },
  { label: '"Thinking…"' },
  { label: 'Spinner', note: 'spinner' },
  { label: 'Answer' },
]

const BEFORE_AI: Step[] = [
  { label: 'Prompt' },
  { label: 'AI starts working' },
  { label: '"Your turn."', live: true },
  { label: 'Make a prediction', live: true },
  { label: 'Answer' },
  { label: 'Compare', live: true },
]

function Chain({ steps, tone }: { steps: Step[]; tone: 'dead' | 'live' }) {
  return (
    <ol className="relative">
      {steps.map((step, i) => {
        const last = i === steps.length - 1
        const lit = tone === 'live' && step.live

        return (
          <motion.li
            key={step.label}
            initial={{ opacity: 0, x: -6 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={VIEWPORT}
            transition={{ duration: 0.4, delay: 0.08 * i, ease: EASE }}
            className="relative flex gap-4 pb-5 last:pb-0"
          >
            {/* Connector */}
            {!last ? (
              <span
                aria-hidden
                className={cn(
                  'absolute top-5 bottom-0 left-[7px] w-px',
                  tone === 'live' ? 'bg-line-strong' : 'bg-line',
                )}
              />
            ) : null}

            <span
              aria-hidden
              className={cn(
                'relative z-10 mt-1 size-3.5 shrink-0 rounded-full border-2 bg-base',
                lit
                  ? 'border-signal shadow-[0_0_12px_-2px_var(--color-signal)]'
                  : tone === 'live'
                    ? 'border-line-strong'
                    : 'border-line',
              )}
            />

            <span className="min-w-0 flex-1 pb-px">
              <span
                className={cn(
                  'block text-[14.5px] leading-tight',
                  lit ? 'font-medium text-ink' : tone === 'live' ? 'text-ink-muted' : 'text-ink-faint',
                )}
              >
                {step.label}
              </span>
              {step.note === 'spinner' ? (
                <span
                  aria-hidden
                  className="mt-2 block size-3.5 animate-spin rounded-full border-2 border-line-strong border-t-ink-faint"
                />
              ) : null}
            </span>
          </motion.li>
        )
      })}
    </ol>
  )
}

function Panel({
  kind,
  title,
  caption,
  steps,
  children,
}: {
  kind: 'dead' | 'live'
  title: string
  caption: string
  steps: Step[]
  children?: ReactNode
}) {
  const live = kind === 'live'

  return (
    <div
      className={cn(
        'relative flex h-full flex-col rounded-2xl border p-6 sm:p-7',
        live
          ? 'border-signal/25 bg-raised edge-light shadow-[0_0_60px_-30px_var(--color-signal)]'
          : 'border-line bg-base',
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3
          className={cn(
            'font-mono text-[11px] tracking-[0.18em] uppercase',
            live ? 'text-signal' : 'text-ink-faint',
          )}
        >
          {title}
        </h3>
        <span className="font-mono text-[10px] tracking-wider text-ink-faint uppercase">
          {caption}
        </span>
      </div>

      <div className="mt-7 flex-1">
        <Chain steps={steps} tone={kind} />
      </div>

      {children}
    </div>
  )
}

export function WaitingProblem() {
  return (
    <section
      id="why-it-matters"
      aria-labelledby="why-it-matters-heading"
      className="scroll-mt-24 py-20 sm:py-24 lg:py-32"
    >
      <Reveal>
        <SectionHeading
          eyebrow="The waiting problem"
          id="why-it-matters-heading"
          lede={
            <>
              <p>
                Every AI interaction has a waiting state. Sometimes it&apos;s a
                second. Sometimes it&apos;s thirty. Sometimes it&apos;s much
                longer.
              </p>
              <p>
                Today, that time is usually represented by a spinner, a progress
                bar, or &ldquo;Thinking&hellip;&rdquo;.
              </p>
            </>
          }
        >
          The most boring part of AI is the part between.
        </SectionHeading>
      </Reveal>

      <Reveal delay={0.08}>
        <p className="mt-8 text-[clamp(1.5rem,1.15rem+1.6vw,2.5rem)] font-semibold tracking-[-0.03em] text-ink-faint">
          That&apos;s dead time.
        </p>
      </Reveal>

      <div className="mt-14 grid gap-5 lg:mt-16 lg:grid-cols-2 lg:gap-6">
        <Reveal className="h-full">
          <Panel
            kind="dead"
            title="Traditional AI"
            caption="4 states"
            steps={TRADITIONAL}
          >
            <p className="mt-7 border-t border-line pt-5 text-[13px] leading-relaxed text-ink-faint">
              Three of these four states are the same state wearing different
              clothes: waiting, described back to you.
            </p>
          </Panel>
        </Reveal>

        <Reveal delay={0.1} className="h-full">
          <Panel
            kind="live"
            title="Before AI"
            caption="6 states"
            steps={BEFORE_AI}
          >
            <p className="mt-7 border-t border-line pt-5 text-[13px] leading-relaxed text-ink-muted">
              Same request. Same latency. The difference is that three of these
              states belong to you.
            </p>
          </Panel>
        </Reveal>
      </div>
    </section>
  )
}
