'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { HeroFlow } from './HeroFlow'
import { EASE } from './motion'
import { cn } from '@/lib/cn'

/** Entrance stagger. The copy lands first, the interface a beat behind it. */
const CONTAINER = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.09, delayChildren: 0.06 } },
}

const ITEM = {
  hidden: { opacity: 0, y: 18 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
}

export function Hero() {
  return (
    <section className="relative pt-28 pb-20 sm:pt-32 lg:pt-40 lg:pb-28">
      <motion.div
        variants={CONTAINER}
        initial="hidden"
        animate="shown"
        className="grid items-center gap-14 lg:grid-cols-12 lg:gap-12 xl:gap-16"
      >
        <div className="lg:col-span-5">
          <motion.div variants={ITEM}>
            <span className="inline-flex items-center gap-2.5 rounded-full border border-line bg-raised px-3 py-1 font-mono text-[10px] tracking-[0.18em] text-ink-muted uppercase">
              <span aria-hidden className="animate-pulse-dot size-1.5 rounded-full bg-signal" />
              WaitOS · Experience 01
            </span>
          </motion.div>

          <motion.h1
            variants={ITEM}
            className={cn(
              'mt-7 text-[clamp(2.15rem,1.35rem+3.9vw,4.6rem)] leading-[1.02]',
              'font-semibold tracking-[-0.04em] text-balance text-ink',
            )}
          >
            Think before the machine does.
          </motion.h1>

          <motion.p
            variants={ITEM}
            className="mt-7 text-[clamp(1.0625rem,1rem+0.5vw,1.375rem)] leading-snug text-balance text-ink"
          >
            AI is getting faster. But while it thinks, we wait.
          </motion.p>

          <motion.p
            variants={ITEM}
            className="mt-4 max-w-lg text-[clamp(0.9375rem,0.9rem+0.25vw,1.0625rem)] leading-relaxed text-ink-muted"
          >
            Before AI turns that waiting time into an interactive prediction — so
            every second before an answer becomes part of the experience.
          </motion.p>

          <motion.div variants={ITEM} className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="/play"
              className={cn(
                'group inline-flex items-center gap-2.5 rounded-lg bg-signal px-5 py-3',
                'text-[15px] font-medium text-void',
                'transition-[filter,box-shadow] duration-200',
                'hover:brightness-110 hover:shadow-[0_0_32px_-6px_var(--color-signal)]',
                'active:brightness-95',
              )}
            >
              Try Before AI
              <span
                aria-hidden
                className="transition-transform duration-200 group-hover:translate-x-0.5"
              >
                →
              </span>
            </Link>

            <a
              href="#how-it-works"
              className={cn(
                'inline-flex items-center gap-2 rounded-lg border border-line bg-raised px-5 py-3',
                'text-[15px] text-ink-muted transition-colors duration-200',
                'hover:border-line-strong hover:text-ink',
              )}
            >
              See how it works
            </a>
          </motion.div>
        </div>

        <motion.div
          variants={ITEM}
          className="min-w-0 lg:col-span-7"
        >
          <HeroFlow />
          <p className="mt-3 text-center font-mono text-[10px] tracking-[0.14em] text-ink-faint uppercase lg:text-left">
            A scripted preview of one round · the real thing runs live
          </p>
        </motion.div>
      </motion.div>
    </section>
  )
}
