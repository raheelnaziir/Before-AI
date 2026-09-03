/**
 * Model IDs, per ARCHITECTURE.md §2.
 *
 * Overridable by env so the answer tier can be swapped without a code change.
 * `challenge` and `grader` are declared now but unused until Task 3/4.
 */
export const MODELS = {
  /** Main answer. Its longer turn is the runway the waiting experience runs on. */
  answer: process.env.MODEL_ANSWER ?? 'claude-opus-5',
  /** Challenge generation — latency-critical. Unused until the real generator lands. */
  challenge: process.env.MODEL_CHALLENGE ?? 'claude-haiku-4-5',
  /** Grading — runs under the reveal animation. Unused until grading lands. */
  grader: process.env.MODEL_GRADER ?? 'claude-haiku-4-5',
} as const

/**
 * 128K is the ceiling on Opus 5; 64K leaves plenty of headroom for a prose
 * answer while keeping the wait bounded. Streaming is required at this size.
 */
export const ANSWER_MAX_TOKENS = 64_000
