/**
 * Where the Anthropic-compatible API lives.
 *
 * Requests are served by AgentRouter, which speaks the Anthropic Messages API,
 * so the SDK stays as-is and only its host changes. Without this the SDK falls
 * back to `https://api.anthropic.com`, which rejects an AgentRouter key with a
 * 401 — that was the authentication failure.
 *
 * Must be the bare host: the SDK appends `/v1/messages` itself, so a value
 * ending in `/v1` would request `/v1/v1/messages`. Trailing slashes are trimmed
 * because the SDK concatenates this with the path.
 *
 * `ANTHROPIC_BASE_URL` is the SDK's own variable name, reused rather than
 * invented so a native Anthropic key can point back at Anthropic unchanged.
 */
export const API_BASE_URL = (
  process.env.ANTHROPIC_BASE_URL?.trim() || 'https://co.agentrouter.org'
).replace(/\/+$/, '')

/**
 * Model IDs, per ARCHITECTURE.md §2.
 *
 * Overridable by env so a tier can be swapped without a code change.
 */
export const MODELS = {
  /** Main answer. Its longer turn is the runway the waiting experience runs on. */
  answer: process.env.MODEL_ANSWER ?? 'claude-opus-5',
  /** Challenge generation — latency-critical, so the fast tier. */
  challenge: process.env.MODEL_CHALLENGE ?? 'claude-haiku-4-5',
  /** Grading — runs underneath the reveal animation, so ~600ms is free. */
  grader: process.env.MODEL_GRADER ?? 'claude-haiku-4-5',
} as const

/**
 * 128K is the ceiling on Opus 5; 64K leaves plenty of headroom for a prose
 * answer while keeping the wait bounded. Streaming is required at this size.
 */
export const ANSWER_MAX_TOKENS = 64_000

/**
 * Challenge and grade are both a few hundred tokens of JSON. A tight ceiling is
 * the cheapest latency win available on the path that has to be fast — and Haiku
 * 4.5 predates adaptive thinking, so no thinking budget is in play here.
 */
export const STRUCTURED_MAX_TOKENS = 1_024
