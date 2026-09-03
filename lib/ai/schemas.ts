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

const OptionIdSchema = z.enum(['A', 'B', 'C', 'D'])

export const ChallengeOptionSchema = z.object({
  id: OptionIdSchema,
  label: z.string().min(1).max(120),
  blurb: z.string().min(1).max(240),
})

/**
 * Prediction challenge.
 *
 * Defined now so the placeholder challenge is validated by the same schema the
 * model will be constrained to once `generateChallenge` exists. That way the
 * client is already written against the real shape.
 */
export const ChallengeSchema = z.object({
  id: z.string().min(1),
  question: z.string().min(1).max(240),
  category: z.enum([
    'technical',
    'debugging',
    'research',
    'recommendation',
    'creative',
    'analysis',
    'planning',
    'other',
  ]),
  options: z.array(ChallengeOptionSchema).min(3).max(4),
  format: z.literal('multiple_choice'),
  model: z.string(),
  latencyMs: z.number().int().nonnegative(),
  /** True while this is the hardcoded stand-in rather than a generated challenge. */
  isPlaceholder: z.boolean(),
})
