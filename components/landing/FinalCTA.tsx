'use client'

import Link from 'next/link'
import { Reveal } from './Reveal'
import { cn } from '@/lib/cn'

export function FinalCTA() {
  return (
    <section aria-labelledby="final-cta-heading" className="pt-16 pb-24 sm:pt-20 lg:pt-24 lg:pb-32">
      <Reveal>
        <div className="relative overflow-hidden rounded-3xl border border-line bg-base px-6 py-20 text-center sm:px-10 sm:py-24 lg:py-32">
          {/* Contained ambience — the grid converges on the button. */}
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="grid-lines absolute inset-0 opacity-50" />
            <div
              className="absolute bottom-[-14rem] left-1/2 h-[30rem] w-[min(56rem,150%)] -translate-x-1/2"
              style={{
                background:
                  'radial-gradient(50% 50% at 50% 50%, color-mix(in oklab, var(--color-signal) 15%, transparent), transparent 70%)',
              }}
            />
            <div className="noise-layer absolute inset-0" />
          </div>

          <div className="relative">
            <h2
              id="final-cta-heading"
              className={cn(
                'mx-auto max-w-4xl text-[clamp(2rem,1.3rem+3.4vw,4rem)] leading-[1.05]',
                'text-fade font-semibold tracking-[-0.04em] text-balance',
              )}
            >
              Every AI request has a waiting state.
            </h2>

            <p className="mx-auto mt-7 max-w-xl text-[clamp(1rem,0.95rem+0.4vw,1.25rem)] leading-relaxed text-balance text-ink-muted">
              We think waiting should be part of the experience.
            </p>

            <div className="mt-11">
              <Link
                href="/play"
                className={cn(
                  'group inline-flex items-center gap-3 rounded-xl bg-signal',
                  'px-7 py-4 text-[clamp(0.9375rem,0.9rem+0.3vw,1.0625rem)] font-medium text-void sm:px-9 sm:py-5',
                  'shadow-[0_0_40px_-12px_var(--color-signal)]',
                  'transition-[filter,box-shadow,transform] duration-200',
                  'hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_0_56px_-10px_var(--color-signal)]',
                  'active:translate-y-0 active:brightness-95',
                )}
              >
                Try Before AI
                <span
                  aria-hidden
                  className="transition-transform duration-200 group-hover:translate-x-1"
                >
                  →
                </span>
              </Link>
            </div>

            <p className="mt-8 font-mono text-[11px] tracking-[0.2em] text-ink-faint uppercase">
              Think before the machine does
            </p>
          </div>
        </div>
      </Reveal>
    </section>
  )
}
