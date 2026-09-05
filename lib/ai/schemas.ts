import { z } from 'zod'
import { MAX_PROMPT_LENGTH, MIN_PROMPT_LENGTH } from '@/lib/round/limits'

/**
 * Request body for POST /api/round/stream.
 *
 * The length cap is a safety bound, not a product opinion — an unbounded prompt
 * is an unbounded bill.
 */
export const StreamRequestSchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(MIN_PROMPT_LENGTH, 'Prompt is too short.')
    .max(MAX_PROMPT_LENGTH, 'Prompt is too long.'),
})

export type StreamRequest = z.infer<typeof StreamRequestSchema>

export const OptionIdSchema = z.enum(['A', 'B', 'C', 'D'])

export const CategorySchema = z.enum([
  'technical',
  'debugging',
  'research',
  'recommendation',
  'creative',
  'analysis',
  'planning',
  'other',
])

export const ChallengeOptionSchema = z.object({
  id: OptionIdSchema,
  label: z.string().min(1).max(120),
  blurb: z.string().min(1).max(240),
})

/**
 * Prediction challenge, as the client consumes it.
 *
 * `id`, `model` and `latencyMs` are stamped server-side — the model is never
 * asked for them, because it has no way to know any of the three.
 */
export const ChallengeSchema = z.object({
  id: z.string().min(1),
  question: z.string().min(1).max(240),
  category: CategorySchema,
  options: z.array(ChallengeOptionSchema).min(3).max(4),
  format: z.literal('multiple_choice'),
  model: z.string(),
  latencyMs: z.number().int().nonnegative(),
})

/**
 * What the challenge model is constrained to return.
 *
 * Deliberately narrower than `ChallengeSchema`: no ids, no timings, and no
 * answer-derived field of any kind. The generator only ever sees the user's
 * prompt, so there is nothing here it could use to leak the answer.
 *
 * Note that the structured-output layer drops length bounds from the JSON schema
 * it sends (they are not in the supported subset) and enforces them client-side
 * instead. The prompt therefore states the limits in words too, and
 * `normalizeGeneratedChallenge` trims rather than rejecting a long label.
 */
export const GeneratedChallengeSchema = z.object({
  question: z.string(),
  category: CategorySchema,
  options: z
    .array(
      z.object({
        id: OptionIdSchema,
        label: z.string(),
        blurb: z.string(),
      }),
    )
    .min(3)
    .max(4),
})

export type GeneratedChallenge = z.infer<typeof GeneratedChallengeSchema>

/**
 * What the grading model is constrained to return.
 *
 * No `score` — the score is arithmetic over confidence and verdict
 * (`lib/scoring/brier.ts`), and asking a model to do arithmetic we can do
 * exactly would make the headline number unverifiable.
 */
export const GeneratedGradeSchema = z.object({
  correctOptionId: OptionIdSchema,
  verdict: z.enum(['hit', 'partial', 'miss']),
  explanation: z.string(),
  /**
   * Verbatim span from the answer. Empty string means "no quote" — the model is
   * told to send an empty string rather than invent one, and anything that does
   * not appear in the answer verbatim is dropped downstream regardless.
   */
  evidenceQuote: z.string(),
})

export type GeneratedGrade = z.infer<typeof GeneratedGradeSchema>

/** Request body for POST /api/round/grade. */
export const GradeRequestSchema = z.object({
  challenge: ChallengeSchema,
  prediction: z.object({
    optionId: OptionIdSchema,
    confidence: z.number().min(0).max(100),
  }),
  /** The answer the user has already been shown. Grading happens after reveal. */
  answerText: z.string().min(1).max(200_000),
})

export type GradeRequest = z.infer<typeof GradeRequestSchema>
