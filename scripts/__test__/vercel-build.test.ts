import { describe, expect, it, vi } from 'vitest'

import { runVercelBuild, type VercelBuildDeps } from '../vercel-build'

function createDeps(overrides: Partial<VercelBuildDeps> = {}) {
  const deps = {
    verifyDeployEnv: vi.fn(),
    buildRuntimes: vi.fn(async () => {}),
    deploySyncAskKilianRag: vi.fn(async () => ({ skipped: true as const, reason: 'outside-vercel' as const })),
    runNextBuild: vi.fn(async () => {}),
    ...overrides,
  } satisfies VercelBuildDeps

  return deps
}

describe('runVercelBuild', () => {
  it('runs deploy verification, runtime generation, deploy sync, then direct Next build', async () => {
    const deps = createDeps()

    await runVercelBuild(deps)

    expect(deps.verifyDeployEnv).toHaveBeenCalledOnce()
    expect(deps.buildRuntimes).toHaveBeenCalledOnce()
    expect(deps.deploySyncAskKilianRag).toHaveBeenCalledOnce()
    expect(deps.runNextBuild).toHaveBeenCalledOnce()
    const verifyOrder = vi.mocked(deps.verifyDeployEnv).mock.invocationCallOrder[0]!
    const runtimeOrder = vi.mocked(deps.buildRuntimes).mock.invocationCallOrder[0]!
    const deploySyncOrder = vi.mocked(deps.deploySyncAskKilianRag).mock.invocationCallOrder[0]!
    const nextBuildOrder = vi.mocked(deps.runNextBuild).mock.invocationCallOrder[0]!

    expect(verifyOrder).toBeLessThan(runtimeOrder)
    expect(runtimeOrder).toBeLessThan(deploySyncOrder)
    expect(deploySyncOrder).toBeLessThan(nextBuildOrder)
  })

  it('short-circuits later steps when deploy verification fails', async () => {
    const error = new Error('missing deploy env')
    const deps = createDeps({
      verifyDeployEnv: vi.fn(() => {
        throw error
      }),
    })

    await expect(runVercelBuild(deps)).rejects.toThrow(error)

    expect(deps.buildRuntimes).not.toHaveBeenCalled()
    expect(deps.deploySyncAskKilianRag).not.toHaveBeenCalled()
    expect(deps.runNextBuild).not.toHaveBeenCalled()
  })
})
