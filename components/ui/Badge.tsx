import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** Renders a pulsing signal dot. Use only while something is genuinely live. */
  dot?: boolean
}

export function Badge({ dot = false, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-line bg-raised',
        'px-3 py-1 font-mono text-[11px] tracking-wider text-ink-muted uppercase',
        className,
      )}
      {...props}
    >
      {dot ? (
        <span
          aria-hidden
          className="size-1.5 rounded-full bg-signal animate-[pulse-dot_1.6s_ease-in-out_infinite]"
        />
      ) : null}
      {children}
    </span>
  )
}
