import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { ConfigurationError, RefusalError, requireApiKey } from '../lib/ai/provider.ts'

describe('provider configuration guard', () => {
  it('throws ConfigurationError when the key is missing', () => {
    assert.throws(() => requireApiKey(undefined), ConfigurationError)
  })

  it('throws when the key is empty or whitespace', () => {
    assert.throws(() => requireApiKey(''), ConfigurationError)
    assert.throws(() => requireApiKey('   '), ConfigurationError)
    assert.throws(() => requireApiKey('\n\t'), ConfigurationError)
  })

  it('carries no key material in the error message', () => {
    try {
      requireApiKey(undefined)
      assert.fail('should have thrown')
    } catch (error) {
      assert.ok(error instanceof ConfigurationError)
      assert.equal(error.message, 'AI provider is not configured')
      assert.doesNotMatch(error.message, /sk-ant|ANTHROPIC_API_KEY/)
    }
  })

  it('returns a trimmed key when one is present', () => {
    // Deliberately not shaped like a real key, so secret scanners stay quiet.
    assert.equal(requireApiKey('  fake-test-credential  '), 'fake-test-credential')
  })

  it('error classes are distinguishable for message mapping', () => {
    assert.equal(new ConfigurationError().name, 'ConfigurationError')
    assert.equal(new RefusalError().name, 'RefusalError')
    assert.ok(new RefusalError() instanceof Error)
    assert.ok(!(new RefusalError() instanceof ConfigurationError))
  })
})
