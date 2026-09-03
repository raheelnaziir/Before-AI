import Anthropic from '@anthropic-ai/sdk'
import {
  type AIProvider,
  type AnswerChunk,
  RefusalError,
  requireApiKey,
} from './provider'
import { ANSWER_MAX_TOKENS, MODELS } from './models'
import { ANSWER_SYSTEM } from './prompts'

/**
 * Live provider.
 *
 * Server-only. `ANTHROPIC_API_KEY` is read here and never leaves this module —
 * nothing in this file is reachable from a client component.
 */
export function createAnthropicProvider(): AIProvider {
  const client = new Anthropic({ apiKey: requireApiKey(process.env.ANTHROPIC_API_KEY) })

  return {
    mode: 'live',

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
  }
}
