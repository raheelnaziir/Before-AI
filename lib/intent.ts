import type { Category } from '@/types'

/**
 * Zero-latency prompt classifier.
 *
 * Runs on the server before either model call and, in demo mode, picks the
 * challenge fixture. Its real job is the ~900ms of dead air before the generated
 * challenge exists: with a category in hand at t≈0 the UI can say something true
 * ("Reading your prompt · debugging") instead of showing a bare spinner.
 *
 * Keyword matching on purpose. It is wrong sometimes, which is why nothing that
 * matters depends on it — the authoritative category comes from the challenge
 * generator, which has actually read the prompt.
 */

/** Checked in order; first hit wins, so the more specific patterns come first. */
const RULES: [Category, RegExp][] = [
  [
    'debugging',
    /\b(why (?:does|is|are|do|am|isn'?t|doesn'?t)|bug|broken|error|crash|fail(?:s|ing|ed)?|exception|stack ?trace|not work|doesn'?t work|undefined|null pointer|infinite loop|rerender|re-render|memory leak|timeout|debug|fix)\b/i,
  ],
  [
    'recommendation',
    /\b(should i|recommend|suggest|best (?:way|place|tool|option|choice)|which (?:one|should)|worth (?:it|buying)|under \$?\d|budget|itinerary|what (?:to|should i) (?:buy|use|pick|do)|looking for)\b/i,
  ],
  [
    'research',
    /\b(what does the (?:research|evidence|literature)|studies|evidence|meta-?analys|consensus|causes? of|summari[sz]e|history of|how common|statistics|survey)\b/i,
  ],
  [
    'planning',
    /\b(plan|roadmap|schedule|timeline|milestone|how (?:long|many) (?:will|would) it take|steps to|prioriti[sz]e|sprint|launch)\b/i,
  ],
  [
    'creative',
    /\b(write (?:me )?a|story|poem|lyrics|slogan|tagline|name (?:for|ideas)|brainstorm|creative|character|plot|headline|copy for)\b/i,
  ],
  [
    'analysis',
    /\b(analy[sz]e|compare|trade-?offs?|pros and cons|implications|explain why|critique|review this|assess|evaluate|what'?s wrong with)\b/i,
  ],
  [
    'technical',
    /\b(api|database|postgres|mongo|sql|typescript|javascript|python|rust|react|next\.?js|docker|kubernetes|architecture|schema|index|query|latency|throughput|cache|deploy|server|migration|library|framework|algorithm|function|component|regex|type ?error)\b/i,
  ],
]

/** Best-effort category for a prompt. Never throws, always returns something. */
export function classifyPrompt(prompt: string): Category {
  for (const [category, pattern] of RULES) {
    if (pattern.test(prompt)) return category
  }
  return 'other'
}

/**
 * Human label for a category. Used in the shimmer and the profile breakdown, so
 * it has to read as a noun phrase rather than a slug.
 */
export const CATEGORY_LABEL: Record<Category, string> = {
  technical: 'Technical',
  debugging: 'Debugging',
  research: 'Research',
  recommendation: 'Recommendation',
  creative: 'Creative',
  analysis: 'Analysis',
  planning: 'Planning',
  other: 'General',
}
