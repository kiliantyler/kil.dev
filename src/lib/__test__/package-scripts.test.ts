import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

type PackageJson = {
  scripts: Record<string, string>
}

type VercelJson = {
  buildCommand?: string
}

const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as PackageJson
const vercelJson = JSON.parse(readFileSync(join(process.cwd(), 'vercel.json'), 'utf8')) as VercelJson

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

  it('uses a dedicated Vercel build orchestrator without recursive build script calls', () => {
    expect(packageJson.scripts['vercel-build']).toBe('bun scripts/vercel-build.ts')
    expect(packageJson.scripts['vercel-build']).not.toContain('bun run build')
  })

  it('tracks the Vercel build command through the top-level orchestrator', () => {
    expect(vercelJson.buildCommand).toBe('bun run vercel-build')
    expect(vercelJson.buildCommand).not.toContain('bun run build')
    expect(packageJson.scripts['vercel-build']).toContain('scripts/vercel-build.ts')
  })

  it('includes Ask Kilian knowledge sync scripts', () => {
    expect(packageJson.scripts['ask-kilian:deploy-sync']).toBe('bun scripts/deploy-sync-ask-kilian-rag.ts')
    expect(packageJson.scripts['ask-kilian:sync']).toBe('bun scripts/sync-ask-kilian-knowledge.ts')
    expect(packageJson.scripts['ask-kilian:sync:dry-run']).toBe('bun scripts/sync-ask-kilian-knowledge.ts --dry-run')
    expect(packageJson.scripts['ask-kilian:sync-if-changed']).toBe(
      'bun scripts/sync-ask-kilian-knowledge.ts --if-changed',
    )
  })
})
