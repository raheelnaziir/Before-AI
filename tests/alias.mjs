import { registerHooks } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve as resolvePath } from 'node:path'
import { existsSync } from 'node:fs'

/**
 * Teach `node --test` the `@/*` path mapping from tsconfig.json.
 *
 * Node's ESM resolver has no notion of TypeScript path aliases, so a value import
 * of `@/lib/...` fails at runtime even though type-stripping handles the syntax.
 * The alternative — de-aliasing every value import inside `lib/` — would make the
 * source style depend on the test runner, which is backwards.
 *
 * Extensionless relative specifiers get the same treatment: TypeScript resolves
 * `./limits` to `./limits.ts`, and Node does not.
 */
const ROOT = resolvePath(dirname(fileURLToPath(import.meta.url)), '..')

/** Try the extensions TypeScript would, in its order. */
function withExtension(path) {
  if (existsSync(path)) return path
  for (const candidate of [`${path}.ts`, `${path}.tsx`, `${path}/index.ts`]) {
    if (existsSync(candidate)) return candidate
  }
  return null
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/')) {
      const resolved = withExtension(resolvePath(ROOT, specifier.slice(2)))
      if (resolved) {
        return { url: pathToFileURL(resolved).href, shortCircuit: true }
      }
    }

    if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) {
      const parent = dirname(fileURLToPath(context.parentURL))
      const direct = resolvePath(parent, specifier)
      // Only intervene when the specifier is extensionless and a .ts file exists;
      // anything Node can already resolve is left alone.
      if (!existsSync(direct)) {
        const resolved = withExtension(direct)
        if (resolved) {
          return { url: pathToFileURL(resolved).href, shortCircuit: true }
        }
      }
    }

    return nextResolve(specifier, context)
  },
})
