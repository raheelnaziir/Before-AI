/**
 * Seeded example prompts.
 *
 * Per DEVELOPMENT_PLAN Day 2 these are chosen once and then left alone — the
 * same set becomes the demo-mode fixtures on Day 12. Each covers a different
 * category so the prediction challenge visibly changes shape between rounds.
 */
export interface ExamplePrompt {
  /** Shown on the chip. */
  label: string
  /** Category label — mirrors the `Category` union in types/index.ts. */
  category: string
  /** Written into the textarea on click. */
  prompt: string
}

export const EXAMPLE_PROMPTS: readonly ExamplePrompt[] = [
  {
    label: 'Why does my useEffect run twice?',
    category: 'debugging',
    prompt:
      'My useEffect hook is firing twice on mount in my React app, but only in development. Why is this happening and should I be worried about it?',
  },
  {
    label: 'Postgres vs MongoDB for an event log',
    category: 'technical',
    prompt:
      "I'm building an append-heavy event log that needs occasional range queries by timestamp. Should I use Postgres or MongoDB, and why?",
  },
  {
    label: 'Three days in Lisbon',
    category: 'recommendation',
    prompt:
      "I have three days in Lisbon in October and I care more about food and architecture than nightlife. What should I actually do, day by day?",
  },
  {
    label: 'Does remote work reduce productivity?',
    category: 'research',
    prompt:
      'What does the current research actually say about remote work and productivity? Summarise where the evidence agrees and where it conflicts.',
  },
] as const
