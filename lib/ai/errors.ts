import Anthropic from '@anthropic-ai/sdk'
import { ConfigurationError, RefusalError, StructuredOutputError } from './provider'

/**
 * Map an internal failure to something safe to show a user.
 *
 * Upstream messages are never forwarded — they can carry request details, and a
 * stack trace is never the user's problem. The real error is logged server-side.
 *
 * Shared by both route handlers so the two lanes can't drift into describing the
 * same failure differently.
 */
export function safeMessage(error: unknown): string {
  if (error instanceof ConfigurationError) {
    return 'The AI provider is not configured on this server.'
  }
  if (error instanceof RefusalError) {
    return 'The model declined this prompt. Try rephrasing it.'
  }
  if (error instanceof StructuredOutputError) {
    return 'The model returned an unusable response.'
  }
  if (error instanceof Anthropic.AuthenticationError) {
    return 'The AI provider rejected this server’s credentials.'
  }
  if (error instanceof Anthropic.RateLimitError) {
    return 'The AI provider is rate limiting us. Give it a moment.'
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return 'Could not reach the AI provider. Check the connection and retry.'
  }
  if (error instanceof Anthropic.APIError) {
    return 'The AI provider returned an error.'
  }
  return 'Something went wrong.'
}
