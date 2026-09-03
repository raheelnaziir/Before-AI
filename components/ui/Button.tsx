import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

const VARIANTS: Record<Variant, string> = {
  // Solid signal fill. Reserved for the single primary action on screen.
  primary: cn(
    'bg-signal text-void font-medium',
    'hover:brightness-110 active:brightness-95',
    'disabled:bg-line-strong disabled:text-ink-faint disabled:brightness-100',
  ),
  ghost: cn(
    'border border-line bg-raised text-ink-muted',
    'hover:border-line-strong hover:text-ink',
    'disabled:text-ink-faint',
  ),
}

export function Button({
  variant = 'primary',
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm',
        'transition-all duration-150',
        'disabled:cursor-not-allowed',
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  )
}
