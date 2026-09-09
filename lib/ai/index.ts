import { createAnthropicProvider } from './anthropic'
import { createMockProvider } from './mock'
import type { AIProvider } from './provider'
import type { ProviderMode } from '@/types'

/** Would a round run live right now? Cheap enough to call per request. */
export function resolveMode(): ProviderMode {
  return process.env.ANTHROPIC_API_KEY ? "live" : "demo";
}

export function getProvider(): AIProvider {
  return resolveMode() === 'live' ? createAnthropicProvider() : createMockProvider()
}
