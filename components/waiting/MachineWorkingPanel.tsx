'use client'

import { IntentShimmer } from './IntentShimmer'
import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/cn'
import type { Category } from '@/types'

interface MachineWorkingPanelProps {
  /** Real elapsed time since round start, in ms. */
  elapsedMs: number
  /** Contextual status line. */
  status: string
  /** Characters of answer received. Exact count, safe to display. */
  chars: number
  /** Has any real model reasoning arrived? The text itself is never shown. */
  reasoning?: boolean
  /** Answer finished and withheld behind the Commitment Gate. */
  held?: boolean
  /** Running against the demo replay rather than the live API. */
  demo?: boolean
  /** Local classifier's category. Shown until the challenge arrives. */
  intent?: Category | null
  /** Has the challenge landed? Retires the shimmer. */
  challengeReady?: boolean
}

function formatElapsed(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`
}

/**
 * MachineWorkingPanel — the waiting surface.
 *
 * Every signal is real: elapsed time is measured, the character count is the
 * exact size of the hidden buffer, and `reasoning` reflects actual thinking
 * deltas. Nothing here simulates model output, and the answer text itself is
 * never rendered — that is what the Commitment Gate is for.
 *
 * Looping ambient motion is CSS, not Framer Motion — infinite JS-driven
 * animation costs main-thread time the reveal will want.
 */
export function MachineWorkingPanel({
  elapsedMs,
  status,
  chars,
  reasoning = false,
  held = false,
  demo = false,
  intent = null,
  challengeReady = false,
}: MachineWorkingPanelProps) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            className={cn(
              'size-1.5 rounded-full',
              held
                ? 'bg-signal'
                : 'bg-signal animate-[pulse-dot_1.6s_ease-in-out_infinite]',
            )}
          />
          <span className="font-mono text-[11px] tracking-wider text-ink-muted uppercase">
            {held ? 'Answer held' : 'Machine working'}
          </span>
          {demo && (
            <span className="rounded border border-line-strong px-1.5 py-0.5 font-mono text-[9px] tracking-wider text-ink-faint uppercase">
              Demo
            </span>
          )}
        </div>

        <span className="font-mono text-[11px] tabular-nums text-ink-faint">
          {formatElapsed(elapsedMs)}
        </span>
      </div>

      <div className="px-5 py-6">
        <div className="flex items-center gap-3">
          <div className="flex items-end gap-1" aria-hidden>
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className={cn(
                  'size-1.5 rounded-full',
                  held
                    ? 'bg-signal-dim'
                    : 'bg-signal-dim animate-[drift_3s_ease-in-out_infinite]',
                )}
                style={held ? undefined : { animationDelay: `${i * 0.22}s` }}
              />
            ))}
          </div>

          <p className="text-sm text-ink" role="status">
            {status}
          </p>
        </div>

        {/* Retired the moment the real challenge exists — it has done its job. */}
        {!challengeReady && !held && (
          <div className="mt-3 pl-[38px]">
            <IntentShimmer intent={intent} />
          </div>
        )}

        {/* Indeterminate by design: the total length of an answer is unknowable
            mid-stream, so a percentage bar would be a fiction. */}
        <div className="mt-5 h-px w-full overflow-hidden bg-line">
          {held ? (
            <div className="h-full w-full bg-signal/50" />
          ) : (
            <div className="h-full w-1/3 bg-gradient-to-r from-transparent via-signal to-transparent animate-[sweep_2.2s_cubic-bezier(0.4,0,0.2,1)_infinite]" />
          )}
        </div>

        <dl className="mt-5 grid grid-cols-3 gap-4">
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
              Streamed
            </dt>
            <dd
              className={cn(
                'mt-1 font-mono text-lg tabular-nums',
                chars > 0 ? 'text-ink' : 'text-ink-faint',
              )}
            >
              {chars > 0 ? chars.toLocaleString() : '—'}
              {chars > 0 && (
                <span className="ml-1 text-[10px] text-ink-faint">chars</span>
              )}
            </dd>
          </div>

          <div>
            <dt className="font-mono text-[10px] tracking-wider text-ink-faint uppercase">
              Reasoning
            </dt>
            <dd
              className={cn(
                'mt-1 font-mono text-lg',
                reasoning ? 'text-ink' : 'text-ink-faint',
              )}
            >
              {reasoning ? 'active' : '—'}
            </dd>
          </div>
        </dl>

        {/* Reassurance that the buffer exists and is deliberately sealed. */}
        <p className="mt-5 border-t border-dashed border-line pt-4 font-mono text-[10px] leading-relaxed tracking-wider text-ink-faint uppercase">
          {held
            ? 'Answer complete and sealed · lock your prediction to open it'
            : 'Answer streaming into a sealed buffer · hidden until you commit'}
        </p>
      </div>
    </Card>
  )
}
