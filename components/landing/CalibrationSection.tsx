'use client'

import { motion } from 'framer-motion'
import { CountUp } from './CountUp'
import { MonoLabel } from './demo-ui'
import { EASE, VIEWPORT } from './motion'
import { Reveal } from './Reveal'
import { SectionHeading } from './SectionHeading'
import { overconfidenceNote } from '@/lib/scoring/profile'

const ACCURACY = 75
const AVG_CONFIDENCE = 68
const ROUNDS = 12

/** The app's headline stat: average confidence minus accuracy. */
const OVERCONFIDENCE = AVG_CONFIDENCE - ACCURACY

/** Matches the meter in the round UI — beyond ±40 the sign is the message. */
const RANGE = 40

const CATEGORIES = [
  { label: 'Technical', value: 82 },
  { label: 'Research', value: 71 },
  { label: 'Recommendations', value: 64 },
] as const

function Stat({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <div>
      <dt className="font-mono text-[10px] tracking-[0.14em] text-ink-faint uppercase">
        {label}
      </dt>
      <dd className="mt-1.5 font-mono text-[clamp(1.5rem,1.3rem+0.8vw,2rem)] tabular-nums text-ink">
        <CountUp value={value} suffix={suffix} />
      </dd>
    </div>
  )
}

function CategoryBar({
  label,
  value,
  delay,
}: {
  label: string
  value: number
  delay: number
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-[7.5rem] shrink-0 truncate text-[13px] text-ink-muted">
        {label}
      </span>

      <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-line">
        <motion.div
          className="h-full rounded-full bg-signal-dim"
          initial={{ width: 0 }}
          whileInView={{ width: `${value}%` }}
          viewport={VIEWPORT}
          transition={{ duration: 0.8, delay, ease: EASE }}
        />
      </div>

      <span className="w-10 shrink-0 text-right font-mono text-[11px] tabular-nums text-ink-faint">
        <CountUp value={value} suffix="%" delay={delay} />
      </span>
    </div>
  )
}

/**
 * The calibration dashboard.
 *
 * Numbers are illustrative, but they are internally consistent and the
 * overconfidence reading comes from the same function the product uses — so the
 * page never claims something the app would score differently.
 */
export function CalibrationSection() {
  const extent = (Math.min(Math.abs(OVERCONFIDENCE), RANGE) / RANGE) * 50
  const over = OVERCONFIDENCE >= 0

  return (
    <section
      aria-labelledby="calibration-heading"
      className="py-20 sm:py-24 lg:py-32"
    >
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <Reveal>
          <SectionHeading
            eyebrow="Human × AI calibration"
            id="calibration-heading"
            lede={
              <>
                <p>
                  Before AI doesn&apos;t just tell you whether you were right. It
                  measures how your confidence compares with reality.
                </p>
                <p>
                  Over time, you learn where your intuition is strong — and where
                  AI consistently surprises you.
                </p>
              </>
            }
          >
            More than a score.
          </SectionHeading>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="overflow-hidden rounded-2xl border border-line bg-raised edge-light">
            <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
              <MonoLabel className="text-ink-muted">Human × AI calibration</MonoLabel>
              <MonoLabel className="text-signal">Sample profile</MonoLabel>
            </div>

            <div className="px-5 py-6">
              <dl className="grid grid-cols-3 gap-4">
                <Stat label="Accuracy" value={ACCURACY} suffix="%" />
                <Stat label="Avg confidence" value={AVG_CONFIDENCE} suffix="%" />
                <Stat label="Rounds" value={ROUNDS} />
              </dl>

              <div className="mt-6 border-t border-line pt-6">
                <div className="flex items-baseline justify-between gap-3">
                  <MonoLabel className="text-ink-faint">Overconfidence</MonoLabel>
                  <span className="font-mono text-sm tabular-nums text-ink-muted">
                    {over ? '+' : ''}
                    {OVERCONFIDENCE}
                  </span>
                </div>

                <div className="relative mt-3 h-1.5 w-full rounded-full bg-line">
                  <span
                    aria-hidden
                    className="absolute top-1/2 left-1/2 h-3 w-px -translate-x-1/2 -translate-y-1/2 bg-line-strong"
                  />
                  <motion.div
                    className="absolute top-0 h-full rounded-full bg-signal/60"
                    initial={{ width: 0, left: '50%' }}
                    whileInView={{
                      width: `${extent}%`,
                      left: over ? '50%' : `${50 - extent}%`,
                    }}
                    viewport={VIEWPORT}
                    transition={{ duration: 0.7, delay: 0.35, ease: EASE }}
                  />
                </div>

                <p className="mt-3 text-[13px] text-ink-muted">
                  {overconfidenceNote(OVERCONFIDENCE)} — you back yourself a
                  little less than the results justify.
                </p>
              </div>

              <div className="mt-6 border-t border-line pt-6">
                <MonoLabel className="text-ink-faint">By category</MonoLabel>
                <div className="mt-3.5 space-y-2.5">
                  {CATEGORIES.map((category, i) => (
                    <CategoryBar
                      key={category.label}
                      label={category.label}
                      value={category.value}
                      delay={0.35 + i * 0.12}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <p className="mt-4 text-center font-mono text-[10px] tracking-[0.14em] text-ink-faint uppercase">
            Illustrative figures · your profile is built from your own rounds
          </p>
        </Reveal>
      </div>
    </section>
  )
}
