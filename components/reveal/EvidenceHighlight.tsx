'use client'

import { Fragment } from 'react'

interface EvidenceHighlightProps {
  text: string
  /** Already verified verbatim against `text`, or null when there is no quote. */
  quote: string | null
}

/**
 * The answer, with the evidence span marked inside it.
 *
 * The quote arrives pre-verified — `verifyEvidenceQuote` returns a slice of this
 * exact text or nothing — so the only work here is locating it. If the search
 * somehow fails, the answer renders unmarked rather than throwing; a missing
 * highlight is a cosmetic loss, and the answer itself is what matters.
 */
export function EvidenceHighlight({ text, quote }: EvidenceHighlightProps) {
  const at = quote === null ? -1 : text.indexOf(quote)

  if (quote === null || at === -1) {
    return <span className="whitespace-pre-wrap">{text}</span>
  }

  return (
    <Fragment>
      <span className="whitespace-pre-wrap">{text.slice(0, at)}</span>
      <mark className="rounded bg-signal/[0.14] px-0.5 text-ink shadow-[inset_0_-1px_0_0_var(--color-signal-dim)]">
        {quote}
      </mark>
      <span className="whitespace-pre-wrap">{text.slice(at + quote.length)}</span>
    </Fragment>
  )
}
