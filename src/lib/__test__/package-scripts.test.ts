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
    expect(packageJson.scripts.prebuild).toBe('bun run build:runtimes')
    expect(packageJson.scripts.prebuild).not.toContain('sync:pet-gallery')
  })
})
