import { describe, expect, it, vi } from 'vitest'

import { CONVEX_DEPLOY_BUILD_COMMAND, runVercelBuild, type VercelBuildDeps } from '../vercel-build'

function createDeps(overrides: Partial<VercelBuildDeps> = {}) {
  const deps = {
    runConvexDeploy: vi.fn(async () => {}),
    deploySyncAskKilianRag: vi.fn(async () => ({ skipped: true as const, reason: 'outside-vercel' as const })),
    ...overrides,
  } satisfies VercelBuildDeps

  return deps
}

describe('runVercelBuild', () => {
  it('runs Convex deploy before Ask Kilian deploy sync', async () => {
    const deps = createDeps()

    await runVercelBuild(deps)

    expect(deps.runConvexDeploy).toHaveBeenCalledOnce()
    expect(deps.runConvexDeploy).toHaveBeenCalledWith(CONVEX_DEPLOY_BUILD_COMMAND)
    expect(deps.deploySyncAskKilianRag).toHaveBeenCalledOnce()
    const convexDeployOrder = vi.mocked(deps.runConvexDeploy).mock.invocationCallOrder[0]!
    const deploySyncOrder = vi.mocked(deps.deploySyncAskKilianRag).mock.invocationCallOrder[0]!

    expect(convexDeployOrder).toBeLessThan(deploySyncOrder)
  })

  it('passes only the safe pre-push build command to Convex deploy', () => {
    expect(CONVEX_DEPLOY_BUILD_COMMAND).toBe('bun scripts/vercel-build-command.ts')
    expect(CONVEX_DEPLOY_BUILD_COMMAND).not.toContain('deploy-sync')
    expect(CONVEX_DEPLOY_BUILD_COMMAND).not.toContain('ask-kilian')
  })

  it('short-circuits deploy sync when Convex deploy fails', async () => {
    const error = new Error('convex deploy failed')
    const deps = createDeps({
      runConvexDeploy: vi.fn(() => {
        throw error
      }),
    })

    await expect(runVercelBuild(deps)).rejects.toThrow(error)

    expect(deps.deploySyncAskKilianRag).not.toHaveBeenCalled()
  })
})
