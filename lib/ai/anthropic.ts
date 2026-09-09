import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { verifyEvidenceQuote } from './evidence'
import {
  type AIProvider,
  type AnswerChunk,
  type GradeInput,
  RefusalError,
  StructuredOutputError,
  requireApiKey,
} from './provider'
import { ANSWER_MAX_TOKENS, API_BASE_URL, MODELS, STRUCTURED_MAX_TOKENS } from './models'
import { ANSWER_SYSTEM, CHALLENGE_SYSTEM, GRADE_SYSTEM } from './prompts'
import { GeneratedChallengeSchema, GeneratedGradeSchema } from './schemas'
import { brierScore } from '@/lib/scoring/brier'
import type { Challenge, ChallengeOption, Grade, OptionId } from '@/types'

const OPTION_IDS: OptionId[] = ['A', 'B', 'C', 'D']

/**
 * Live provider.
 *
 * Server-only. `ANTHROPIC_API_KEY` is read here and never leaves this module —
 * nothing in this file is reachable from a client component.
 *
 * The host comes from `API_BASE_URL` rather than the SDK default, because the
 * key is an AgentRouter key. Passing `baseURL` explicitly is deliberate: the SDK
 * only consults `ANTHROPIC_BASE_URL` when the option is absent, so `API_BASE_URL`
 * folds the env override in and stays the single source of truth.
 */
export function createAnthropicProvider(): AIProvider {
  const client = new Anthropic({
    authToken: requireApiKey(process.env.ANTHROPIC_AUTH_TOKEN),
    baseURL: API_BASE_URL,
  })

  return {
    mode: 'live',

    /**
     * Challenge generation.
     *
     * Receives the user's prompt and nothing else — there is no parameter through
     * which the answer could reach it. That is the honesty guarantee, enforced by
     * the signature rather than by discipline.
     *
     * Latency-critical: this is the number that can kill the product, so it runs
     * on Haiku 4.5 with no thinking and a low token ceiling.
     */
    async generateChallenge(prompt: string, signal: AbortSignal): Promise<Challenge> {
      const startedAt = Date.now()

      const response = await client.messages.parse(
        {
          model: MODELS.challenge,
          max_tokens: STRUCTURED_MAX_TOKENS,
          system: CHALLENGE_SYSTEM,
          messages: [{ role: 'user', content: userPrompt(prompt) }],
          output_config: { format: zodOutputFormat(GeneratedChallengeSchema) },
        },
        { signal },
      )

      if (response.stop_reason === 'refusal') throw new RefusalError()

      const parsed = response.parsed_output
      if (!parsed) throw new StructuredOutputError('Challenge output failed to parse')

      return {
        id: crypto.randomUUID(),
        question: truncate(parsed.question, 240),
        category: parsed.category,
        format: 'multiple_choice',
        model: response.model,
        latencyMs: Date.now() - startedAt,
        options: normalizeOptions(parsed.options),
      }
    },

    async *streamAnswer(prompt: string, signal: AbortSignal): AsyncIterable<AnswerChunk> {
      const stream = client.messages.stream(
        {
          model: MODELS.answer,
          max_tokens: ANSWER_MAX_TOKENS,
          system: ANSWER_SYSTEM,
          // Adaptive thinking is the only on-mode on Opus 5. `display: 'summarized'`
          // is an explicit opt-in — the default is 'omitted', which would give us
          // thinking blocks with empty text.
          thinking: { type: 'adaptive', display: 'summarized' },
          output_config: { effort: 'high' },
          messages: [{ role: 'user', content: prompt }],
        },
        { signal },
      )

      // Belt and braces: the SDK honours `signal`, and `.abort()` guarantees the
      // upstream connection is torn down if it somehow doesn't.
      const onAbort = () => stream.abort()
      signal.addEventListener('abort', onAbort, { once: true })

      try {
        for await (const event of stream) {
          if (event.type !== 'content_block_delta') continue

          if (event.delta.type === 'text_delta') {
            yield { kind: 'text', text: event.delta.text }
          } else if (event.delta.type === 'thinking_delta') {
            yield { kind: 'thinking', text: event.delta.thinking }
          }
        }

        const final = await stream.finalMessage()

        // A refusal is HTTP 200 with stop_reason 'refusal' — it does not throw.
        if (final.stop_reason === 'refusal') {
          throw new RefusalError()
        }

        const text = final.content
          .filter((block): block is Anthropic.TextBlock => block.type === 'text')
          .map((block) => block.text)
          .join('')

        yield {
          kind: 'done',
          text,
          outputTokens: final.usage.output_tokens,
          model: final.model,
        }
      } finally {
        signal.removeEventListener('abort', onAbort)
      }
    },

    /**
     * Grading.
     *
     * The one call that legitimately sees the prediction and the answer together,
     * because it runs after the reveal. Two things are *not* delegated to the
     * model: the score, which is arithmetic, and the evidence quote's validity,
     * which is checked against the answer before anything is displayed.
     */
    async gradePrediction(input: GradeInput, signal: AbortSignal): Promise<Grade> {
      const response = await client.messages.parse(
        {
          model: MODELS.grader,
          max_tokens: STRUCTURED_MAX_TOKENS,
          system: GRADE_SYSTEM,
          messages: [{ role: 'user', content: gradeUserMessage(input) }],
          output_config: { format: zodOutputFormat(GeneratedGradeSchema) },
        },
        { signal },
      )

      if (response.stop_reason === 'refusal') throw new RefusalError()

      const parsed = response.parsed_output
      if (!parsed) throw new StructuredOutputError('Grade output failed to parse')

      // A verdict of `hit` that disagrees with `correctOptionId` is incoherent.
      // Trust the option — it is the field the model had to ground in the answer.
      const verdict =
        parsed.verdict === 'hit' && parsed.correctOptionId !== input.optionId
          ? 'miss'
          : parsed.verdict

      return {
        correctOptionId: parsed.correctOptionId,
        verdict,
        score: brierScore(input.confidence, verdict),
        explanation: truncate(parsed.explanation, 400),
        // Verified against the answer, and what survives is a slice of the answer
        // rather than the model's rendering of it.
        evidenceQuote: verifyEvidenceQuote(input.answerText, parsed.evidenceQuote),
      }
    },
  }
}

/**
 * Wrap the user's prompt for the challenge generator.
 *
 * Delimited so a prompt containing instructions ("ignore the above and…") reads
 * as the subject matter rather than as direction. The system prompt holds the
 * authority; this is data.
 */
function userPrompt(prompt: string): string {
  return `The user sent this prompt to the AI:

<user_prompt>
${prompt}
</user_prompt>

Write the prediction challenge.`
}

function gradeUserMessage(input: GradeInput): string {
  const options = input.challenge.options
    .map((option) => `${option.id}. ${option.label} — ${option.blurb}`)
    .join('\n')

  return `<challenge>
${input.challenge.question}

${options}
</challenge>

<user_prediction>
The user picked ${input.optionId} with ${Math.round(input.confidence)}% confidence.
</user_prediction>

<ai_answer>
${input.answerText}
</ai_answer>

Grade the prediction.`
}

/**
 * Re-key the options to A, B, C, D in the order returned.
 *
 * The model is asked for sequential ids and usually complies, but a duplicate or
 * skipped id would break selection in a way that is invisible until a user clicks.
 * Positional ids make that impossible.
 */
function normalizeOptions(
  options: readonly { label: string; blurb: string }[],
): ChallengeOption[] {
  return options.slice(0, 4).map((option, index) => ({
    id: OPTION_IDS[index] ?? 'D',
    label: truncate(option.label, 120),
    blurb: truncate(option.blurb, 240),
  }))
}

/**
 * Hard-bound a model-supplied string.
 *
 * Length limits are not part of the JSON schema subset the API supports, so they
 * are enforced here. Trimming beats rejecting: an over-long label is a cosmetic
 * problem, and failing the round over it would trade a real challenge for a
 * degraded wait.
 */
function truncate(value: string, max: number): string {
  const trimmed = value.trim()
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max - 1).trimEnd()}…`
}
