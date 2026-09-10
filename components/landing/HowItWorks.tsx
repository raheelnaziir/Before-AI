'use client'

import { motion } from 'framer-motion'
import { EASE, VIEWPORT } from './motion'
import { Reveal } from './Reveal'
import { SectionHeading } from './SectionHeading'

const STEPS = [
  { n: '01', title: 'Ask', body: 'Give AI a real task.' },
  { n: '02', title: 'Predict', body: 'While AI works, make your prediction.' },
  { n: '03', title: 'Reveal', body: 'See what the AI actually came up with.' },
  {
    n: '04',
    title: 'Calibrate',
    body: 'Learn how closely your intuition matches AI.',
  },
] as const

/**
 * Four steps.
 *
 * Horizontal rail on desktop, stacked timeline on mobile. The dividers come
 * from `gap-px` over a line-coloured grid, so they flip axis with the layout
 * instead of needing a second set of rules per breakpoint.
 */
export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-it-works-heading"
      className="scroll-mt-24 py-20 sm:py-24 lg:py-32"
    >
      <Reveal>
        <SectionHeading
          eyebrow="How it works"
          id="how-it-works-heading"
          lede={
            <p>
              One round, start to finish. The request is real, and it runs the
              whole time you are thinking.
            </p>
          }
        >
          Four steps, and none of them is a spinner.
        </SectionHeading>
      </Reveal>

      <ol className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-2 lg:mt-16 lg:grid-cols-4">
        {STEPS.map((step, i) => (
          <motion.li
            key={step.n}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT}
            transition={{ duration: 0.5, delay: i * 0.08, ease: EASE }}
            className="group relative flex flex-col bg-base p-6 transition-colors duration-300 hover:bg-raised lg:p-7"
          >
            <div className="flex items-center gap-3">
              <span className="font-mono text-[11px] tracking-[0.18em] text-signal-dim transition-colors duration-300 group-hover:text-signal">
                {step.n}
              </span>
              <span
                aria-hidden
                className="h-px flex-1 bg-line transition-colors duration-300 group-hover:bg-line-strong"
              />
            </div>

            <h3 className="mt-6 text-[17px] font-medium tracking-tight text-ink">
              {step.title}
            </h3>
            <p className="mt-2 flex-1 text-[14.5px] leading-relaxed text-ink-muted">
              {step.body}
            </p>

            {/* Travel indicator — fills along the direction of the flow. */}
            <span
              aria-hidden
              className="mt-6 block h-px w-full origin-left scale-x-0 bg-signal/60 transition-transform duration-500 group-hover:scale-x-100"
            />
          </motion.li>
        ))}
      </ol>
    </section>
  )
}
