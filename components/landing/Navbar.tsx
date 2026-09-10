'use client'

import { motion, useMotionValueEvent, useScroll } from 'framer-motion'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/cn'

const LINKS = [
  { href: '#how-it-works', label: 'How It Works' },
  { href: '#why-it-matters', label: 'Why It Matters' },
  { href: '#waitos', label: 'WaitOS' },
] as const

/**
 * Route navigation.
 *
 * Starts transparent over the hero and resolves into a glass bar with a
 * hairline once the page has moved — the only place on the route that uses
 * blur, so it stays a signal rather than a texture. The progress rule is driven
 * straight off a motion value, so scrolling never triggers a React render for it.
 */
export function Navbar() {
  const { scrollY, scrollYProgress } = useScroll()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const toggleRef = useRef<HTMLButtonElement>(null)

  useMotionValueEvent(scrollY, 'change', (value) => setScrolled(value > 12))

  const close = useCallback(() => setOpen(false), [])

  // Escape closes the sheet and hands focus back to the control that opened it.
  useEffect(() => {
    if (!open) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      setOpen(false)
      toggleRef.current?.focus()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,box-shadow] duration-300',
        'border-b',
        scrolled || open
          ? 'glass border-line shadow-[0_1px_0_0_color-mix(in_oklab,white_4%,transparent)]'
          : 'border-transparent bg-transparent',
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-[76rem] items-center justify-between gap-4 px-5 sm:px-8 lg:h-[4.5rem]">
        <Link
          href="/"
          onClick={close}
          className="group flex shrink-0 items-center gap-2.5 rounded-sm"
        >
          <span
            aria-hidden
            className="size-1.5 rounded-full bg-signal transition-[box-shadow] duration-300 group-hover:shadow-[0_0_10px_1px_var(--color-signal)]"
          />
          <span className="font-mono text-[12px] tracking-[0.2em] text-ink uppercase">
            Before&nbsp;AI
          </span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-[13.5px] text-ink-muted transition-colors duration-150 hover:text-ink"
            >
              {link.label}
            </a>
          ))}

          <Link
            href="/play"
            className={cn(
              'ml-3 inline-flex items-center gap-2 rounded-lg bg-signal px-4 py-2',
              'text-[13.5px] font-medium text-void',
              'transition-[filter,box-shadow] duration-200',
              'hover:brightness-110 hover:shadow-[0_0_24px_-6px_var(--color-signal)]',
            )}
          >
            Try Before AI
          </Link>
        </nav>

        <button
          ref={toggleRef}
          type="button"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((v) => !v)}
          className="-mr-2 inline-flex size-10 items-center justify-center rounded-lg text-ink-muted transition-colors hover:text-ink md:hidden"
        >
          <span aria-hidden className="relative block h-3 w-4">
            <span
              className={cn(
                'absolute left-0 block h-px w-full bg-current transition-transform duration-300',
                open ? 'top-1.5 rotate-45' : 'top-0',
              )}
            />
            <span
              className={cn(
                'absolute left-0 block h-px w-full bg-current transition-transform duration-300',
                open ? 'top-1.5 -rotate-45' : 'top-3',
              )}
            />
          </span>
        </button>
      </div>

      {/* Scroll progress. Motion value straight to scaleX — no re-render. */}
      <motion.div
        aria-hidden
        style={{ scaleX: scrollYProgress }}
        className="h-px origin-left bg-signal/50"
      />

      <div
        id="mobile-nav"
        hidden={!open}
        className="border-t border-line md:hidden"
      >
        <nav aria-label="Primary" className="px-5 pt-2 pb-5 sm:px-8">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={close}
              className="block border-b border-line py-3.5 text-[15px] text-ink-muted transition-colors hover:text-ink"
            >
              {link.label}
            </a>
          ))}

          <Link
            href="/play"
            onClick={close}
            className="mt-5 flex items-center justify-center gap-2 rounded-lg bg-signal px-4 py-3 text-sm font-medium text-void transition-[filter] hover:brightness-110"
          >
            Try Before AI
            <span aria-hidden>→</span>
          </Link>
        </nav>
      </div>
    </header>
  )
}
