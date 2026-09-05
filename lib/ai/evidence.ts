/**
 * Evidence quote verification.
 *
 * The grader is asked for a span copied character-for-character out of the
 * answer. Models are unreliable about that in one specific, benign way: they
 * re-wrap whitespace. They are also occasionally unreliable in a way that is not
 * benign at all — quoting something the answer never said.
 *
 * This module refuses to distinguish between the two by intent. A candidate is
 * accepted only if a real span of the answer can be located for it, and what the
 * caller gets back is *that span, sliced out of the answer* — never the model's
 * version of it. So the quote rendered under the verdict is, by construction,
 * text the answer actually contains.
 */

/** Below this a "quote" carries no evidentiary weight. */
const MIN_QUOTE_LENGTH = 8
/** Above this it stops being a quote and starts being the answer again. */
const MAX_QUOTE_LENGTH = 400

/** Straight and curly quote marks, plus the ellipses models like to add. */
const WRAPPING = /^[\s"'“”‘’`]+|[\s"'“”‘’`]+$/g
const EDGE_ELLIPSIS = /^\s*(?:\.\.\.|…)\s*|\s*(?:\.\.\.|…)\s*$/g

/**
 * Strip the decorations a model adds around a quote without touching its
 * interior. Interior edits would be paraphrasing, which is the thing we're
 * guarding against.
 */
function clean(candidate: string): string {
  return candidate.replace(EDGE_ELLIPSIS, '').replace(WRAPPING, '').trim()
}

/**
 * Locate `needle` in `haystack` ignoring differences in whitespace runs, and
 * return the matching span of `haystack` verbatim.
 *
 * Built on an index map rather than a regex because the return value has to be a
 * real slice of the original text — a regex match on a normalised copy would
 * give back normalised text, which is exactly what we must not display.
 */
function findWhitespaceInsensitive(haystack: string, needle: string): string | null {
  const flat: string[] = []
  // flat[i] came from haystack[origin[i]].
  const origin: number[] = []

  let pendingSpace = false
  for (let i = 0; i < haystack.length; i++) {
    const char = haystack[i] as string
    if (/\s/.test(char)) {
      pendingSpace = flat.length > 0
      continue
    }
    if (pendingSpace) {
      flat.push(' ')
      origin.push(i)
      pendingSpace = false
    }
    flat.push(char)
    origin.push(i)
  }

  const flatHaystack = flat.join('')
  const flatNeedle = needle.replace(/\s+/g, ' ').trim()
  if (flatNeedle.length === 0) return null

  const at = flatHaystack.indexOf(flatNeedle)
  if (at === -1) return null

  const start = origin[at]
  const end = origin[at + flatNeedle.length - 1]
  if (start === undefined || end === undefined) return null

  return haystack.slice(start, end + 1)
}

/**
 * Verify a model-supplied evidence quote against the answer.
 *
 * Returns the verbatim span from `answerText`, or `null` if the quote cannot be
 * found. `null` is a normal outcome — the reveal falls back to showing the
 * explanation alone rather than a quote we cannot stand behind.
 */
export function verifyEvidenceQuote(
  answerText: string,
  candidate: string,
): string | null {
  const quote = clean(candidate)

  if (quote.length < MIN_QUOTE_LENGTH) return null
  if (quote.length > MAX_QUOTE_LENGTH) return null

  // The common case: the model did what it was told.
  if (answerText.includes(quote)) return quote

  return findWhitespaceInsensitive(answerText, quote)
}
