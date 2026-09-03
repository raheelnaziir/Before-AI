import type { Challenge } from '@/types'

/**
 * Stand-in prediction challenge.
 *
 * NOT the product. The real challenge is generated per-prompt by a fast model
 * and asks about the answer's *content* — "what will it blame?", "what will it
 * recommend?". This one asks about the answer's *shape*, which is the only thing
 * a static challenge can honestly ask, and it exists purely to prove the
 * Commitment Gate.
 *
 * It ships flagged as a placeholder so the UI can label it as such, and it is
 * validated by the same `ChallengeSchema` the model will be constrained to.
 */
export function placeholderChallenge(): Challenge {
  return {
    id: 'placeholder',
    question: 'Before you see the answer — how will the AI open?',
    category: 'other',
    format: 'multiple_choice',
    model: 'placeholder',
    latencyMs: 0,
    isPlaceholder: true,
    options: [
      {
        id: 'A',
        label: 'Straight to the verdict',
        blurb: 'Commits to a position in the first sentence, then defends it.',
      },
      {
        id: 'B',
        label: 'Caveats first',
        blurb: 'Opens by qualifying the question or listing what it depends on.',
      },
      {
        id: 'C',
        label: 'Structure first',
        blurb: 'Leads with a framework, a numbered list, or a breakdown.',
      },
    ],
  }
}
