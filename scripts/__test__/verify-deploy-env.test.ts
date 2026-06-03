import { describe, expect, it, vi } from 'vitest'
import { getConvexDeploymentTarget, shouldVerifyDeployEnv, verifyDeployEnv } from '../verify-deploy-env'

const secret = 'shared-game-write-secret'

function createExecFile(value: string) {
  return vi.fn(() => `OTHER=value\nCONVEX_GAME_WRITE_SECRET=${value}\n`)
}

describe('verify deploy env', () => {
  it('skips outside Vercel unless explicitly enforced', () => {
    const log = vi.fn()
    const execFile = createExecFile(`${secret}\n`)

    const result = verifyDeployEnv({ env: {}, execFile, log })

    expect(result).toEqual({ checked: false })
    expect(execFile).not.toHaveBeenCalled()
    expect(log).toHaveBeenCalledWith('Skipping deploy environment verification outside Vercel.')
  })

  it('enforces verification in Vercel', () => {
    expect(shouldVerifyDeployEnv({ VERCEL: '1' })).toBe(true)
  })

  it('enforces verification when explicitly requested', () => {
    expect(shouldVerifyDeployEnv({ KIL_DEV_ENFORCE_DEPLOY_ENV: '1' })).toBe(true)
  })

  it('uses CONVEX_DEPLOYMENT when present', () => {
    expect(getConvexDeploymentTarget({ CONVEX_DEPLOYMENT: 'preview-deployment' })).toBe('preview-deployment')
  })

  it('falls back to prod for production Vercel builds', () => {
    expect(getConvexDeploymentTarget({ VERCEL_ENV: 'production' })).toBe('prod')
  })

  it('fails when the Vercel build secret is missing', () => {
    expect(() =>
      verifyDeployEnv({
        env: { VERCEL: '1', CONVEX_DEPLOYMENT: 'preview-deployment' },
        execFile: createExecFile(`${secret}\n`),
        log: vi.fn(),
      }),
    ).toThrow('Missing CONVEX_GAME_WRITE_SECRET in the Vercel build environment')
  })

  it('fails when the Vercel build secret is still a placeholder', () => {
    expect(() =>
      verifyDeployEnv({
        env: {
          VERCEL: '1',
          CONVEX_DEPLOYMENT: 'preview-deployment',
          CONVEX_GAME_WRITE_SECRET: 'replace-with-game-write-secret',
        },
        execFile: createExecFile(`${secret}\n`),
        log: vi.fn(),
      }),
    ).toThrow('Replace placeholder CONVEX_GAME_WRITE_SECRET in the Vercel build environment')
  })

  it('fails when the Convex deployment target cannot be determined', () => {
    expect(() =>
      verifyDeployEnv({
        env: { VERCEL: '1', CONVEX_GAME_WRITE_SECRET: secret },
        execFile: createExecFile(`${secret}\n`),
        log: vi.fn(),
      }),
    ).toThrow('Missing CONVEX_DEPLOYMENT; cannot verify Convex game write secret')
  })

  it('fails when the Convex deployment secret is missing', () => {
    const execFile = vi.fn(() => {
      throw new Error('not found')
    })

    expect(() =>
      verifyDeployEnv({
        env: {
          VERCEL: '1',
          CONVEX_DEPLOYMENT: 'preview-deployment',
          CONVEX_GAME_WRITE_SECRET: secret,
        },
        execFile,
        log: vi.fn(),
      }),
    ).toThrow('Missing CONVEX_GAME_WRITE_SECRET in Convex deployment preview-deployment')
  })

  it('fails when the Convex and Vercel secrets differ', () => {
    expect(() =>
      verifyDeployEnv({
        env: {
          VERCEL: '1',
          CONVEX_DEPLOYMENT: 'preview-deployment',
          CONVEX_GAME_WRITE_SECRET: secret,
        },
        execFile: createExecFile('different-secret\n'),
        log: vi.fn(),
      }),
    ).toThrow('CONVEX_GAME_WRITE_SECRET does not match between Vercel and Convex deployment preview-deployment')
  })

  it('passes when Vercel and Convex secrets match', () => {
    const log = vi.fn()
    const execFile = createExecFile(`${secret}\n`)

    const result = verifyDeployEnv({
      env: {
        VERCEL: '1',
        CONVEX_DEPLOYMENT: 'preview-deployment',
        CONVEX_GAME_WRITE_SECRET: secret,
      },
      execFile,
      log,
    })

    expect(result).toEqual({ checked: true, deployment: 'preview-deployment' })
    expect(execFile).toHaveBeenCalledWith(
      'bunx',
      ['convex', 'env', 'list', '--deployment', 'preview-deployment'],
      expect.objectContaining({
        encoding: 'utf8',
        env: expect.not.objectContaining({ CONVEX_DEPLOYMENT: expect.any(String) }),
      }),
    )
    expect(log).toHaveBeenCalledWith(
      'Verified CONVEX_GAME_WRITE_SECRET in Vercel and Convex deployment preview-deployment.',
    )
  })
})
