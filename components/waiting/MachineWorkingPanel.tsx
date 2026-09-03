'use client'

import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/cn'

interface MachineWorkingPanelProps {
  /** Real elapsed time since submit, in ms. Counted client-side. */
  elapsedMs: number
  /** Contextual status line. Replaced by real stream phases on Day 8. */
  status?: string
  /**
   * Output tokens received so far. Omit while unknown — the meter then renders
   * an indeterminate sweep rather than inventing a number.
   */
  tokens?: number
  /**
   * Whether a real model request is behind this panel. False renders an
   * explicit notice so the shell is never mistaken for live inference.
   */
  connected?: boolean
}

function formatElapsed(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`
}

/**
 * MachineWorkingPanel — the waiting surface.
 *
 * Design rule from PRODUCT_SPEC: every signal here must be real. The elapsed
 * timer is real. The token meter is indeterminate until real token counts
 * arrive over SSE. Nothing simulates model reasoning.
 *
 * Looping ambient motion is CSS, not Framer Motion — infinite JS-driven
 * animation costs main-thread time we'll want for the reveal later.
 */
export function MachineWorkingPanel({
  elapsedMs,
  status = 'Waiting for the model',
  tokens,
  connected = false,
}: MachineWorkingPanelProps) {
  const hasTokens = typeof tokens === 'number'

  return (
    <Card className="overflow-hidden">
      {/* Header — live indicator + real elapsed clock */}
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="size-1.5 rounded-full bg-signal animate-[pulse-dot_1.6s_ease-in-out_infinite]"
          />
          <span className="font-mono text-[11px] tracking-wider text-ink-muted uppercase">
            Machine working
          </span>
        </div>

        <span
          className="font-mono text-[11px] tabular-nums text-ink-faint"
          aria-live="off"
        >
          {formatElapsed(elapsedMs)}
        </span>
      </div>

      <div className="px-5 py-6">
        {/* Status line + orbit dots */}
        <div className="flex items-center gap-3">
          <div className="flex items-end gap-1" aria-hidden>
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="size-1.5 rounded-full bg-signal-dim animate-[drift_3s_ease-in-out_infinite]"
                style={{ animationDelay: `${i * 0.22}s` }}
              />
            ))}
          </div>

          <p className="text-sm text-ink" role="status">
            {status}
          </p>
        </div>

        {/* Progress track — indeterminate sweep until real token counts exist */}
        <div className="mt-5 h-px w-full overflow-hidden bg-line">
          {hasTokens ? (
            <div
              className="h-full bg-signal transition-[width] duration-300 ease-out"
              style={{ width: `${Math.min(100, tokens)}%` }}
            />
          ) : (
            <div className="h-full w-1/3 bg-gradient-to-r from-transparent via-signal to-transparent animate-[sweep_2.2s_cubic-bezier(0.4,0,0.2,1)_infinite]" />
          )}
        </div>

        {/* Metrics — the token slot stays empty until it's real */}
        <dl className="mt-5 grid grid-cols-2 gap-4">
          <div>
            <dt className="font-mono text-[10px] tracking-wider text-ink-faint uppercase">
              Elapsed
            </dt>
            <dd className="mt-1 font-mono text-lg tabular-nums text-ink">
              {formatElapsed(elapsedMs)}
            </dd>
          </div>

          <div>
            <dt className="font-mono text-[10px] tracking-wider text-ink-faint uppercase">
              Output tokens
            </dt>
            <dd
              className={cn(
                'mt-1 font-mono text-lg tabular-nums',
                hasTokens ? 'text-ink' : 'text-ink-faint',
              )}
            >
              {hasTokens ? tokens.toLocaleString() : '—'}
            </dd>
          </div>
        </dl>
      </div>

      {/* Where the prediction challenge lands next. Reserving the space now
          means no layout shift when it arrives. */}
      <div className="border-t border-dashed border-line px-5 py-4">
        <p className="font-mono text-[10px] tracking-wider text-ink-faint uppercase">
          {connected
            ? 'Prediction challenge incoming'
            : 'UI shell — no model request is running'}
        </p>
      </div>
    </Card>
  )
}
