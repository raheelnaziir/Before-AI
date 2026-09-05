import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'
import Anthropic from '@anthropic-ai/sdk'
import { safeMessage } from '../lib/ai/errors.ts'
import { ConfigurationError, RefusalError, StructuredOutputError } from '../lib/ai/provider.ts'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** Every source file under the given directories, recursively. */
function sourceFiles(dirs: string[]): string[] {
  const files: string[] = []

  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      if (entry === 'node_modules' || entry.startsWith('.')) continue
      const path = join(dir, entry)
      if (statSync(path).isDirectory()) {
        walk(path)
        continue
      }
      if (['.ts', '.tsx'].includes(extname(path))) files.push(path)
    }
  }

  for (const dir of dirs) walk(join(ROOT, dir))
  return files
}

const read = (path: string) => readFileSync(path, 'utf8')

describe('security — the API key never reaches the client', () => {
  it('no client component reads ANTHROPIC_API_KEY', () => {
    for (const path of sourceFiles(['app', 'components', 'lib', 'types'])) {
      const source = read(path)
      if (!source.includes('ANTHROPIC_API_KEY')) continue

      assert.equal(
        source.includes("'use client'"),
        false,
        `${path} reads the API key inside a client component`,
      )
    }
  })

  it('only two server modules touch the key, and only one uses its value', () => {
    const readers = sourceFiles(['app', 'components', 'lib', 'types'])
      .filter((path) => read(path).includes('process.env.ANTHROPIC_API_KEY'))
      .map((path) => path.slice(ROOT.length + 1).replace(/\\/g, '/'))

    // `lib/ai/index.ts` tests for presence to pick a provider; `lib/ai/anthropic.ts`
    // is the only place the value is used. Any third reader is a new surface for
    // the key to escape through.
    assert.deepEqual(readers.sort(), ['lib/ai/anthropic.ts', 'lib/ai/index.ts'])

    const factory = read(join(ROOT, 'lib/ai/index.ts'))
    assert.match(factory, /\?\.trim\(\) \? 'live' : 'demo'/, 'the factory must only test presence')
    assert.equal(
      factory.includes('apiKey'),
      false,
      'the factory must not pass the key value anywhere',
    )
  })

  it('no client component imports the live adapter or the provider factory', () => {
    for (const path of sourceFiles(['app', 'components'])) {
      const source = read(path)
      if (!source.includes("'use client'")) continue

      assert.doesNotMatch(source, /from '@\/lib\/ai\/anthropic'/, `${path} imports the live adapter`)
      assert.doesNotMatch(source, /from '@\/lib\/ai'/, `${path} imports getProvider()`)
    }
  })

  it('no key material is hardcoded anywhere in source', () => {
    for (const path of sourceFiles(['app', 'components', 'lib', 'types', 'tests'])) {
      // The real prefix, split so this assertion is not itself a secret-scanner hit.
      assert.doesNotMatch(read(path), new RegExp(`sk-${'ant'}-[A-Za-z0-9]`), `${path}`)
    }
  })

  it('the health endpoint reports a mode, never a key', () => {
    const source = read(join(ROOT, 'app/api/health/route.ts'))
    assert.equal(source.includes('ANTHROPIC_API_KEY'), false)
    assert.ok(source.includes('resolveMode()'))
  })
})

describe('security — errors are safe to show a user', () => {
  it('maps every known failure to a message with no internals', () => {
    const cases: unknown[] = [
      new ConfigurationError(),
      new RefusalError(),
      new StructuredOutputError(),
      new Error('ECONNREFUSED 10.0.0.1:443 while calling https://api.anthropic.com/v1/messages'),
      { unexpected: 'shape' },
      null,
    ]

    for (const error of cases) {
      const message = safeMessage(error)
      assert.ok(message.length > 0)
      // No upstream detail, no host, no key, no stack.
      assert.doesNotMatch(message, /ECONNREFUSED|api\.anthropic\.com|10\.0\.0\.1|at \w+ \(/)
      assert.doesNotMatch(message, /sk-|ANTHROPIC_API_KEY/)
    }
  })

  it('does not forward an upstream message verbatim', () => {
    const upstream = new Error('invalid x-api-key: sk-REDACTED-abcdef')
    const message = safeMessage(upstream)
    assert.notEqual(message, upstream.message)
    assert.doesNotMatch(message, /x-api-key|REDACTED/)
  })

  it('distinguishes the failures a user can act on', () => {
    const configuration = safeMessage(new ConfigurationError())
    const refusal = safeMessage(new RefusalError())
    const unknown = safeMessage(new Error('boom'))

    assert.notEqual(configuration, refusal)
    assert.notEqual(refusal, unknown)
    assert.match(refusal, /rephras/i, 'a refusal should tell the user what to do')
  })

  it('names rate limiting without exposing the retry internals', () => {
    const error = new Anthropic.RateLimitError(
      429,
      { error: { message: 'rate_limit_error: 40000 input tokens per minute' } },
      'rate limited',
      new Headers({ 'retry-after': '30' }),
    )
    const message = safeMessage(error)
    assert.match(message, /rate limit/i)
    assert.doesNotMatch(message, /40000|retry-after/)
  })
})

describe('security — the answer is not leaked through logs', () => {
  it('the stream route never logs the answer buffer or a delta', () => {
    const source = read(join(ROOT, 'app/api/round/stream/route.ts'))
    const logLines = source
      .split('\n')
      .filter((line) => line.includes('console.'))

    assert.ok(logLines.length > 0, 'the route does log failures')
    for (const line of logLines) {
      assert.doesNotMatch(line, /chunk\.text|answerBuffer|answer\.text|\bprompt\b/, line.trim())
    }
  })

  it('the grade route never logs the answer text', () => {
    const source = read(join(ROOT, 'app/api/round/grade/route.ts'))
    for (const line of source.split('\n').filter((l) => l.includes('console.'))) {
      assert.doesNotMatch(line, /answerText|prompt/, line.trim())
    }
  })

  it('no component reads the hidden buffers directly', () => {
    for (const path of sourceFiles(['components'])) {
      const source = read(path)
      assert.equal(
        source.includes('answerBuffer'),
        false,
        `${path} reaches around the Commitment Gate into the hidden buffer`,
      )
      assert.equal(source.includes('thinkingBuffer'), false, `${path} reads the reasoning buffer`)
    }
  })

  it('revealedAnswer is the only exported path to the answer text', () => {
    const machine = read(join(ROOT, 'lib/round/machine.ts'))
    // One function returns the buffer, and it is the gate.
    const returnsBuffer = machine
      .split('\n')
      .filter((line) => /return .*answerBuffer/.test(line))
    assert.equal(returnsBuffer.length, 1, 'exactly one place may return the buffer')
  })
})

describe('security — request validation', () => {
  it('both routes validate the body before doing any work', () => {
    for (const route of ['app/api/round/stream/route.ts', 'app/api/round/grade/route.ts']) {
      const source = read(join(ROOT, route))
      assert.match(source, /safeParse/, `${route} must validate its body`)
      assert.match(source, /status: 400/, `${route} must reject an invalid body`)
    }
  })

  it('the prompt length bound is enforced server-side, not just in the UI', () => {
    const schemas = read(join(ROOT, 'lib/ai/schemas.ts'))
    assert.match(schemas, /MAX_PROMPT_LENGTH/)
    assert.match(read(join(ROOT, 'app/api/round/stream/route.ts')), /StreamRequestSchema/)
  })
})
