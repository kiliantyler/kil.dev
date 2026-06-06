import { describe, expect, it, vi } from 'vitest'

import { captureConvexDeployUrl, runVercelBuildCommand, type VercelBuildCommandDeps } from '../vercel-build-command'
import { CONVEX_DEPLOY_URL_CAPTURE_ENV, CONVEX_DEPLOY_URL_ENV_VAR_NAME } from '../vercel-build-shared'

function createDeps(overrides: Partial<VercelBuildCommandDeps> = {}) {
  const deps = {
    captureConvexDeployUrl: vi.fn(async () => {}),
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

    expect(deps.captureConvexDeployUrl).toHaveBeenCalledOnce()
    expect(deps.verifyDeployEnv).toHaveBeenCalledOnce()
    expect(deps.buildRuntimes).toHaveBeenCalledOnce()
    expect(deps.runNextBuild).toHaveBeenCalledOnce()
    const captureOrder = vi.mocked(deps.captureConvexDeployUrl).mock.invocationCallOrder[0]!
    const verifyOrder = vi.mocked(deps.verifyDeployEnv).mock.invocationCallOrder[0]!
    const runtimeOrder = vi.mocked(deps.buildRuntimes).mock.invocationCallOrder[0]!
    const nextBuildOrder = vi.mocked(deps.runNextBuild).mock.invocationCallOrder[0]!

    expect(captureOrder).toBeLessThan(verifyOrder)
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

  it('captures the Convex URL injected by convex deploy --cmd when a capture path is provided', async () => {
    const writeFileText = vi.fn(async () => {})

    await captureConvexDeployUrl({
      env: {
        [CONVEX_DEPLOY_URL_CAPTURE_ENV]: '/tmp/convex-url.txt',
        [CONVEX_DEPLOY_URL_ENV_VAR_NAME]: 'https://captured-preview.convex.cloud',
      },
      writeFileText,
    })

    expect(writeFileText).toHaveBeenCalledWith('/tmp/convex-url.txt', 'https://captured-preview.convex.cloud\n', {
      encoding: 'utf8',
    })
  })

  it('does nothing when no Convex URL capture path is provided', async () => {
    const writeFileText = vi.fn(async () => {})

    await captureConvexDeployUrl({
      env: {
        [CONVEX_DEPLOY_URL_ENV_VAR_NAME]: 'https://captured-preview.convex.cloud',
      },
      writeFileText,
    })

    expect(writeFileText).not.toHaveBeenCalled()
  })

  it('fails closed when a capture path is provided without an injected Convex URL', async () => {
    await expect(
      captureConvexDeployUrl({
        env: {
          [CONVEX_DEPLOY_URL_CAPTURE_ENV]: '/tmp/convex-url.txt',
        },
        writeFileText: vi.fn(async () => {}),
      }),
    ).rejects.toThrow(`Missing ${CONVEX_DEPLOY_URL_ENV_VAR_NAME} while ${CONVEX_DEPLOY_URL_CAPTURE_ENV} is set`)
  })
})
