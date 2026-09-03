'use client'

import { cn } from '@/lib/cn'
import type { ChallengeOption, OptionId } from '@/types'

interface OptionButtonProps {
  option: ChallengeOption
  selected: boolean
  /** Locked options are read-only — the choice is irreversible by design. */
  locked: boolean
  onSelect: (id: OptionId) => void
}

export function OptionButton({ option, selected, locked, onSelect }: OptionButtonProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={locked}
      onClick={() => onSelect(option.id)}
      className={cn(
        'group flex w-full items-start gap-3.5 rounded-xl border p-4 text-left transition-all duration-150',
        selected
          ? 'border-signal/60 bg-signal/[0.06]'
          : 'border-line bg-overlay/40 hover:border-line-strong',
        locked ? 'cursor-default' : 'cursor-pointer',
        locked && !selected && 'opacity-40',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'mt-px flex size-6 shrink-0 items-center justify-center rounded-md border font-mono text-[11px] transition-colors',
          selected
            ? 'border-signal/60 bg-signal text-void'
            : 'border-line-strong text-ink-faint group-hover:text-ink-muted',
        )}
      >
        {option.id}
      </span>

      <span className="min-w-0">
        <span
          className={cn(
            'block text-sm font-medium transition-colors',
            selected ? 'text-ink' : 'text-ink-muted group-hover:text-ink',
          )}
        >
          {option.label}
        </span>
        <span className="mt-1 block text-[13px] leading-relaxed text-ink-faint">
          {option.blurb}
        </span>
      </span>
    </button>
  )
}
