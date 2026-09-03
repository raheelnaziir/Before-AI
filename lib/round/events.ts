import type { AnswerResult, Challenge, ProviderMode } from '@/types'

/**
 * The round event log.
 *
 * One ordered stream drives the client state machine (ARCHITECTURE §4). Errors
 * are typed per-lane so a challenge failure can never kill the answer.
 *
 * `answer.thinking` carries the model's own summarized reasoning. It is real,
 * but it is not rendered anywhere in this build — the client uses it only to
 * flip a boolean status. The reasoning ticker is a later task.
 */
export type RoundEvent =
  | { t: 'round.start'; roundId: string; startedAt: number; mode: ProviderMode }
  | { t: 'challenge.ready'; challenge: Challenge }
  | { t: 'challenge.error'; message: string }
  | { t: 'answer.thinking'; text: string }
  | { t: 'answer.delta'; text: string }
  | { t: 'answer.progress'; chars: number; deltas: number; elapsedMs: number }
  | { t: 'answer.done'; answer: AnswerResult }
  | { t: 'answer.error'; message: string }
  | { t: 'round.end' }

/** Serialise one event as an SSE frame. */
export function encodeEvent(event: RoundEvent): string {
  return `event: ${event.t}\ndata: ${JSON.stringify(event)}\n\n`
}

/** Comment frame. Keeps proxies from closing an idle connection. */
export const HEARTBEAT = ': keep-alive\n\n'

/**
 * Parse an SSE response body into events.
 *
 * Hand-rolled rather than using EventSource because EventSource cannot issue a
 * POST. Handles partial frames across chunk boundaries and skips comments.
 */
export async function* readEvents(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<RoundEvent> {
  // A manual decoder rather than TextDecoderStream: the DOM lib types the latter
  // as WritableStream<BufferSource>, which will not unify with
  // ReadableStream<Uint8Array> under strict variance.
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      // Frames are separated by a blank line. A trailing partial frame stays in
      // the buffer until the rest of it arrives.
      let split = buffer.indexOf('\n\n')
      while (split !== -1) {
        const frame = buffer.slice(0, split)
        buffer = buffer.slice(split + 2)
        split = buffer.indexOf('\n\n')

        const dataLine = frame
          .split('\n')
          .find((line) => line.startsWith('data:'))
        if (!dataLine) continue // comment / heartbeat

        try {
          yield JSON.parse(dataLine.slice(5).trim()) as RoundEvent
        } catch {
          // A malformed frame is not worth tearing the round down for.
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}
