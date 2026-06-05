import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

type PackageJson = {
  scripts: Record<string, string>
}

const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as PackageJson

describe('package scripts', () => {
  it.each(['check', 'test', 'test:watch', 'knip', 'knip:deps'])(
    '%s generates runtime bundles before running',
    scriptName => {
      expect(packageJson.scripts[scriptName]).toMatch(/^bun run build:runtimes && /)
    },
  )

  it('test:all reuses the generated-runtime-aware test script', () => {
    expect(packageJson.scripts['test:all']).toBe('bun run test && playwright test')
  })

  it('prebuild does not sync pet gallery media into production builds', () => {
    expect(packageJson.scripts.prebuild).toBe('bun scripts/verify-deploy-env.ts && bun run build:runtimes')
    expect(packageJson.scripts.prebuild).not.toContain('sync:pet-gallery')
  })

  it('prebuild verifies deploy environment before production builds', () => {
    expect(packageJson.scripts.prebuild).toContain('bun scripts/verify-deploy-env.ts')
  })

  it('includes Ask Kilian knowledge sync scripts', () => {
    expect(packageJson.scripts['ask-kilian:sync']).toBe('bun scripts/sync-ask-kilian-knowledge.ts')
    expect(packageJson.scripts['ask-kilian:sync:dry-run']).toBe('bun scripts/sync-ask-kilian-knowledge.ts --dry-run')
    expect(packageJson.scripts['ask-kilian:sync-if-changed']).toBe(
      'bun scripts/sync-ask-kilian-knowledge.ts --if-changed',
    )
  })
})
