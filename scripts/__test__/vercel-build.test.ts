import { describe, expect, it, vi } from 'vitest'

import { runVercelBuild, type VercelBuildDeps } from '../vercel-build'
import {
  CONVEX_DEPLOY_BUILD_COMMAND,
  CONVEX_DEPLOY_URL_CAPTURE_ENV,
  CONVEX_DEPLOY_URL_ENV_VAR_NAME,
} from '../vercel-build-shared'

function createDeps(overrides: Partial<VercelBuildDeps> = {}) {
  const deps = {
    mkdtemp: vi.fn(async () => '/tmp/kil-dev-vercel-build-test'),
    rm: vi.fn(async () => {}),
    readFile: vi.fn(async () => 'https://captured-preview.convex.cloud\n'),
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
    expect(deps.runConvexDeploy).toHaveBeenCalledWith(
      CONVEX_DEPLOY_BUILD_COMMAND,
      expect.objectContaining({
        env: expect.objectContaining({
          [CONVEX_DEPLOY_URL_CAPTURE_ENV]: '/tmp/kil-dev-vercel-build-test/convex-url.txt',
        }),
      }),
    )
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

  it('passes the Convex URL captured inside --cmd into post-deploy sync', async () => {
    const deps = createDeps({
      readFile: vi.fn(async () => 'https://captured-preview.convex.cloud\n'),
    })

    await runVercelBuild(deps)

    expect(deps.deploySyncAskKilianRag).toHaveBeenCalledWith({
      env: expect.objectContaining({
        [CONVEX_DEPLOY_URL_ENV_VAR_NAME]: 'https://captured-preview.convex.cloud',
      }),
    })
  })

  it('short-circuits deploy sync when Convex deploy fails', async () => {
    const error = new Error('convex deploy failed')
    const deps = createDeps({
      runConvexDeploy: vi.fn(async () => {
        throw error
      }),
    })

    await expect(runVercelBuild(deps)).rejects.toThrow(error)

    expect(deps.deploySyncAskKilianRag).not.toHaveBeenCalled()
    expect(deps.rm).toHaveBeenCalledWith('/tmp/kil-dev-vercel-build-test', { recursive: true, force: true })
  })

  it('short-circuits deploy sync when Convex deploy does not capture a URL', async () => {
    const deps = createDeps({
      readFile: vi.fn(async () => '\n'),
    })

    await expect(runVercelBuild(deps)).rejects.toThrow(
      `Convex deploy did not capture ${CONVEX_DEPLOY_URL_ENV_VAR_NAME}`,
    )

    expect(deps.deploySyncAskKilianRag).not.toHaveBeenCalled()
    expect(deps.rm).toHaveBeenCalledWith('/tmp/kil-dev-vercel-build-test', { recursive: true, force: true })
  })
})
