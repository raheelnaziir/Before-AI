'use client'

import { cn } from '@/lib/cn'

interface LockButtonProps {
  disabled: boolean
  /** True once the answer is finished and waiting behind the gate. */
  answerReady: boolean
  onLock: () => void
}

/**
 * The commitment. Deliberately the heaviest control on screen — this is the
 * moment the round becomes real, and it should not feel casual.
 */
export function LockButton({ disabled, answerReady, onLock }: LockButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onLock}
      className={cn(
        'group relative w-full overflow-hidden rounded-xl px-6 py-4',
        'font-mono text-[13px] tracking-[0.14em] uppercase',
        'transition-all duration-200',
        disabled
          ? 'cursor-not-allowed border border-line bg-overlay/40 text-ink-faint'
          : 'cursor-pointer bg-signal text-void hover:brightness-110 active:brightness-95',
        !disabled && answerReady && 'shadow-[0_0_28px_-6px_var(--color-signal)]',
      )}
    >
      Lock it in
      {!disabled && (
        <span aria-hidden className="ml-2 inline-block transition-transform group-hover:translate-x-0.5">
          →
        </span>
      )}
    </button>
  )
}
