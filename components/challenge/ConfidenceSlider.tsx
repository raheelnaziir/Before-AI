'use client'

import { cn } from '@/lib/cn'

interface ConfidenceSliderProps {
  value: number
  disabled: boolean
  onChange: (value: number) => void
}

/**
 * Live language for the current confidence.
 *
 * The number alone is abstract — 72% doesn't feel like anything. A word attached
 * to it makes the commitment legible, which is the point: the score punishes
 * overconfidence, so the user needs to *feel* how much they're claiming.
 */
function confidenceWord(value: number): string {
  if (value >= 90) return 'Certain'
  if (value >= 75) return 'Confident'
  if (value >= 60) return 'Fairly sure'
  if (value >= 40) return 'A hunch'
  if (value >= 20) return 'Leaning, barely'
  return 'Almost a coin flip'
}

export function ConfidenceSlider({ value, disabled, onChange }: ConfidenceSliderProps) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label
          htmlFor="confidence"
          className="font-mono text-[10px] tracking-wider text-ink-faint uppercase"
        >
          Confidence
        </label>
        <div className="flex items-baseline gap-2">
          <span
            className={cn(
              'font-mono text-sm tabular-nums transition-colors',
              disabled ? 'text-ink-muted' : 'text-signal',
            )}
          >
            {value}%
          </span>
          <span className="text-[13px] text-ink-faint">{confidenceWord(value)}</span>
        </div>
      </div>

      <input
        id="confidence"
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-describedby="confidence-scale"
        className={cn(
          'mt-3 h-1.5 w-full appearance-none rounded-full outline-none',
          // The filled portion is drawn with a gradient stop at `value` — one
          // background, no second element to keep in sync.
          'bg-line',
          disabled ? 'cursor-default opacity-60' : 'cursor-pointer',
          // Thumb styling has to be per-engine; there is no cross-browser selector.
          '[&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none',
          '[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-signal',
          '[&::-webkit-slider-thumb]:shadow-[0_0_12px_-2px_var(--color-signal)]',
          '[&::-webkit-slider-thumb]:transition-transform',
          !disabled && '[&::-webkit-slider-thumb]:hover:scale-110',
          '[&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:appearance-none',
          '[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0',
          '[&::-moz-range-thumb]:bg-signal',
        )}
        style={{
          backgroundImage: `linear-gradient(to right, var(--color-signal-dim) ${value}%, transparent ${value}%)`,
        }}
      />

      <div
        id="confidence-scale"
        className="mt-2 flex justify-between font-mono text-[10px] tracking-wider text-ink-faint uppercase"
      >
        <span>Not sure</span>
        <span>Very sure</span>
      </div>
    </div>
  )
}
