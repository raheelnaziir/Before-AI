import { createAnthropicProvider } from './anthropic'
import { createMockProvider } from './mock'
import type { AIProvider } from './provider'
import type { ProviderMode } from '@/types'

/** Would a round run live right now? Cheap enough to call per request. */
export function resolveMode(): ProviderMode {
  return process.env.ANTHROPIC_API_KEY?.trim() ? 'live' : 'demo'
}

/**
 * Pick a provider.
 *
 * No key means demo mode rather than a hard failure — a judge must be able to
 * open the deployed URL and get the full experience. The UI carries an
 * unmissable DEMO badge so demo is never mistaken for live.
 *
 * Server-only. Never import this from a client component.
 */
export function getProvider(): AIProvider {
  return resolveMode() === 'live' ? createAnthropicProvider() : createMockProvider()
}
