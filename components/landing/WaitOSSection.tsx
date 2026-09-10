'use client'

import { motion } from 'framer-motion'
import { EASE, VIEWPORT } from './motion'
import { Reveal } from './Reveal'
import { SectionHeading } from './SectionHeading'
import { cn } from '@/lib/cn'

const NODES = [
  { label: 'AI agent', note: 'any model, any task' },
  { label: 'Waiting state', note: 'a second, or thirty' },
  { label: 'WaitOS', note: 'the contextual layer', key: true },
  { label: 'Contextual experience', note: 'derived from the prompt' },
  { label: 'User', note: 'resolved against the result' },
] as const

export function WaitOSSection() {
  return (
    <section
      id="waitos"
      aria-labelledby="waitos-heading"
      className="scroll-mt-24 py-20 sm:py-24 lg:py-32"
    >
      <Reveal>
        <SectionHeading
          eyebrow="The bigger vision"
          id="waitos-heading"
          lede={
            <>
              <p>Every AI agent has a waiting state.</p>
              <p>
                WaitOS is the idea of turning that state into contextual
                interaction: given a prompt and a pending result, generate an
                experience from that prompt and resolve it against that result.
              </p>
            </>
          }
        >
          Before AI is the experience. WaitOS is the layer underneath.
        </SectionHeading>
      </Reveal>

      <ol className="mt-16 grid gap-10 md:grid-cols-5 md:gap-5 lg:mt-20 lg:gap-6">
        {NODES.map((node, i) => {
          const last = i === NODES.length - 1
          const key = 'key' in node && node.key

          return (
            <motion.li
              key={node.label}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEWPORT}
              transition={{ duration: 0.45, delay: i * 0.09, ease: EASE }}
              className="relative"
            >
              <div
                className={cn(
                  'flex h-full flex-col justify-center rounded-xl border px-4 py-5 text-center md:min-h-[8.5rem]',
                  key
                    ? 'border-signal/40 bg-signal/[0.05] edge-light shadow-[0_0_50px_-22px_var(--color-signal)]'
                    : 'border-line bg-base',
                )}
              >
                <p
                  className={cn(
                    'font-mono text-[11px] leading-tight tracking-[0.16em] uppercase',
                    key ? 'text-signal' : 'text-ink',
                  )}
                >
                  {node.label}
                </p>
                <p className="mt-2 text-[12.5px] leading-snug text-ink-faint">
                  {node.note}
                </p>
              </div>

              {!last ? (
                <>
                  <span
                    aria-hidden
                    className="absolute -bottom-7 left-1/2 -translate-x-1/2 font-mono text-sm text-ink-faint md:hidden"
                  >
                    ↓
                  </span>
                  <span
                    aria-hidden
                    className="absolute top-1/2 -right-4 hidden -translate-y-1/2 font-mono text-sm text-ink-faint md:block lg:-right-[1.125rem]"
                  >
                    →
                  </span>
                </>
              ) : null}
            </motion.li>
          )
        })}
      </ol>

      <div className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:mt-20">
        <Reveal className="h-full">
          <div className="h-full bg-base p-6 lg:p-7">
            <p className="font-mono text-[10px] tracking-[0.18em] text-signal uppercase">
              Today
            </p>
            <h3 className="mt-4 text-[19px] font-medium tracking-tight text-ink">
              Before AI
            </h3>
            <p className="mt-2 text-[14.5px] leading-relaxed text-ink-muted">
              One waiting experience, built and playable. Prediction, commitment,
              reveal, calibration.
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.08} className="h-full">
          <div className="h-full bg-base p-6 lg:p-7">
            <p className="font-mono text-[10px] tracking-[0.18em] text-ink-faint uppercase">
              Tomorrow
            </p>
            <h3 className="mt-4 text-[19px] font-medium tracking-tight text-ink">
              A platform for AI waiting experiences
            </h3>
            <p className="mt-2 text-[14.5px] leading-relaxed text-ink-muted">
              Prediction is one shape the wait can take. The contract — prompt in,
              experience out, resolved against the result — should hold for
              others.
            </p>
          </div>
        </Reveal>
      </div>

      <Reveal delay={0.12}>
        <p className="mt-8 border-l-2 border-line-strong pl-5 text-[14px] leading-relaxed text-ink-faint">
          To be clear about what exists: WaitOS is not built. There is no SDK and
          no platform behind this page. Before AI is the first experience, and it
          is the part that has to prove the idea.
        </p>
      </Reveal>
    </section>
  )
}
