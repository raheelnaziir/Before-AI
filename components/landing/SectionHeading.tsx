import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface SectionHeadingProps {
  /** Mono micro-label above the heading. */
  eyebrow: string
  /** Wired to the section's `aria-labelledby`. */
  id: string
  children: ReactNode
  /** Supporting copy under the heading. */
  lede?: ReactNode
  align?: 'left' | 'center'
  className?: string
}

/**
 * Shared eyebrow + h2 + lede block.
 *
 * Every section on the route uses this, which is what keeps the vertical rhythm
 * identical from section to section. Type scales fluidly rather than in
 * breakpoint steps — the headline is the same optical size at 400px and 1600px.
 */
export function SectionHeading({
  eyebrow,
  id,
  children,
  lede,
  align = 'left',
  className,
}: SectionHeadingProps) {
  const centered = align === 'center'

  return (
    <div className={cn(centered && 'text-center', className)}>
      <p className="font-mono text-[11px] tracking-[0.22em] text-signal-dim uppercase">
        {eyebrow}
      </p>

      <h2
        id={id}
        className={cn(
          'mt-5 text-[clamp(1.75rem,1.15rem+2.6vw,3.25rem)] leading-[1.1]',
          'font-semibold tracking-[-0.03em] text-balance text-ink',
          centered && 'mx-auto max-w-3xl',
        )}
      >
        {children}
      </h2>

      {lede ? (
        <div
          className={cn(
            'mt-6 max-w-2xl space-y-3.5',
            'text-[clamp(0.95rem,0.9rem+0.25vw,1.0625rem)] leading-relaxed text-ink-muted',
            centered && 'mx-auto',
          )}
        >
          {lede}
        </div>
      ) : null}
    </div>
  )
}
