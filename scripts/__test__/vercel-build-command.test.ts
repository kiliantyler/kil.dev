import { describe, expect, it, vi } from 'vitest'

import { runVercelBuildCommand, type VercelBuildCommandDeps } from '../vercel-build-command'

function createDeps(overrides: Partial<VercelBuildCommandDeps> = {}) {
  const deps = {
    verifyDeployEnv: vi.fn(),
    buildRuntimes: vi.fn(async () => {}),
    runNextBuild: vi.fn(async () => {}),
    ...overrides,
  } satisfies VercelBuildCommandDeps

  return deps
}

describe('runVercelBuildCommand', () => {
  it('runs deploy verification, runtime generation, then direct Next build', async () => {
    const deps = createDeps()

    await runVercelBuildCommand(deps)

    expect(deps.verifyDeployEnv).toHaveBeenCalledOnce()
    expect(deps.buildRuntimes).toHaveBeenCalledOnce()
    expect(deps.runNextBuild).toHaveBeenCalledOnce()
    const verifyOrder = vi.mocked(deps.verifyDeployEnv).mock.invocationCallOrder[0]!
    const runtimeOrder = vi.mocked(deps.buildRuntimes).mock.invocationCallOrder[0]!
    const nextBuildOrder = vi.mocked(deps.runNextBuild).mock.invocationCallOrder[0]!

    expect(verifyOrder).toBeLessThan(runtimeOrder)
    expect(runtimeOrder).toBeLessThan(nextBuildOrder)
  })

  it('short-circuits later steps when deploy verification fails', async () => {
    const error = new Error('missing deploy env')
    const deps = createDeps({
      verifyDeployEnv: vi.fn(() => {
        throw error
      }),
    })

    await expect(runVercelBuildCommand(deps)).rejects.toThrow(error)

    expect(deps.buildRuntimes).not.toHaveBeenCalled()
    expect(deps.runNextBuild).not.toHaveBeenCalled()
  })
})
