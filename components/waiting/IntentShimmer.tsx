'use client'

import { CATEGORY_LABEL } from '@/lib/intent'
import type { Category } from '@/types'

interface IntentShimmerProps {
  /** From the local classifier. null before `round.start` lands. */
  intent: Category | null
}

/**
 * Covers the ~900ms before the generated challenge exists.
 *
 * The category comes from a regex pass over the prompt with no network call, so
 * this can render at t≈50ms. It is a real signal — we did read the prompt and we
 * did classify it — which is why it can say something specific instead of
 * "loading". The generated challenge supersedes it.
 */
export function IntentShimmer({ intent }: IntentShimmerProps) {
  return (
    <div className="flex items-center gap-2 font-mono text-[10px] tracking-wider text-ink-faint uppercase">
      <span className="relative overflow-hidden">
        Reading your prompt
        <span
          aria-hidden
          className="absolute inset-0 bg-gradient-to-r from-transparent via-signal/25 to-transparent animate-[sweep_2.2s_cubic-bezier(0.4,0,0.2,1)_infinite]"
        />
      </span>
      {intent && (
        <>
          <span>·</span>
          <span className="text-ink-muted">{CATEGORY_LABEL[intent]}</span>
        </>
      )}
    </div>
  )
}
