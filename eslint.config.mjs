import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'

/**
 * eslint-config-next 16 ships native flat config, so no FlatCompat shim is
 * needed. `core-web-vitals` already includes `next/typescript`.
 */
const eslintConfig = [
  ...nextCoreWebVitals,
  {
    ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts'],
  },
]

export default eslintConfig
