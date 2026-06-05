import { describe, expect, it, vi } from 'vitest'
import { getConvexDeploymentTarget, shouldVerifyDeployEnv, verifyDeployEnv } from '../verify-deploy-env'

const secret = 'shared-game-write-secret'
const aiGatewayApiKey = 'shared-ai-gateway-api-key'
const askKilianAccessToken = 'shared-ask-kilian-access-token'
const askKilianGatewayEnv = 'preview'
const vercelProjectId = 'prj_test_project'

function createExecFile(
  value: string,
  aiKey = aiGatewayApiKey,
  askKilianToken = askKilianAccessToken,
  gatewayEnv = askKilianGatewayEnv,
  projectId = vercelProjectId,
) {
  return vi.fn(
    () =>
      `OTHER=value\nCONVEX_GAME_WRITE_SECRET=${value}\nAI_GATEWAY_API_KEY=${aiKey}\nASK_KILIAN_CONVEX_ACCESS_TOKEN=${askKilianToken}\nASK_KILIAN_GATEWAY_ENV=${gatewayEnv}\nVERCEL_PROJECT_ID=${projectId}\n`,
  )
}

function expectedDeployKeyLog(deployment: string) {
  return `Verified CONVEX_GAME_WRITE_SECRET, AI_GATEWAY_API_KEY, ASK_KILIAN_CONVEX_ACCESS_TOKEN, ASK_KILIAN_GATEWAY_ENV, and VERCEL_PROJECT_ID in the Vercel build environment for Convex deployment ${deployment}. Convex deploy key will select the deployment during deploy; Convex runtime secrets were not compared.`
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

  it('uses the Convex cloud URL injected by convex deploy', () => {
    expect(getConvexDeploymentTarget({ NEXT_PUBLIC_CONVEX_URL: 'https://warm-squid-123.convex.cloud' })).toBe(
      'warm-squid-123',
    )
  })

  it('uses the Convex site URL injected by convex deploy when the cloud URL is missing', () => {
    expect(getConvexDeploymentTarget({ NEXT_PUBLIC_CONVEX_SITE_URL: 'https://warm-squid-123.convex.site' })).toBe(
      'warm-squid-123',
    )
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
        env: {
          VERCEL: '1',
          CONVEX_GAME_WRITE_SECRET: secret,
          AI_GATEWAY_API_KEY: aiGatewayApiKey,
          ASK_KILIAN_CONVEX_ACCESS_TOKEN: askKilianAccessToken,
          ASK_KILIAN_GATEWAY_ENV: askKilianGatewayEnv,
          VERCEL_PROJECT_ID: vercelProjectId,
        },
        execFile: createExecFile(`${secret}\n`),
        log: vi.fn(),
      }),
    ).toThrow('Missing Convex deployment target; cannot verify Convex environment secrets')
  })

  it('fails when the Convex deployment required secrets cannot be read', () => {
    const execFile = vi.fn(() => {
      throw new Error('not found')
    })

    expect(() =>
      verifyDeployEnv({
        env: {
          VERCEL: '1',
          CONVEX_DEPLOYMENT: 'preview-deployment',
          CONVEX_GAME_WRITE_SECRET: secret,
          AI_GATEWAY_API_KEY: aiGatewayApiKey,
          ASK_KILIAN_CONVEX_ACCESS_TOKEN: askKilianAccessToken,
          ASK_KILIAN_GATEWAY_ENV: askKilianGatewayEnv,
          VERCEL_PROJECT_ID: vercelProjectId,
        },
        execFile,
        log: vi.fn(),
      }),
    ).toThrow(
      'Missing CONVEX_GAME_WRITE_SECRET and AI_GATEWAY_API_KEY and ASK_KILIAN_CONVEX_ACCESS_TOKEN and ASK_KILIAN_GATEWAY_ENV and VERCEL_PROJECT_ID in Convex deployment preview-deployment',
    )
  })

  it('fails when the Convex and Vercel secrets differ', () => {
    expect(() =>
      verifyDeployEnv({
        env: {
          VERCEL: '1',
          CONVEX_DEPLOYMENT: 'preview-deployment',
          CONVEX_GAME_WRITE_SECRET: secret,
          AI_GATEWAY_API_KEY: aiGatewayApiKey,
          ASK_KILIAN_CONVEX_ACCESS_TOKEN: askKilianAccessToken,
          ASK_KILIAN_GATEWAY_ENV: askKilianGatewayEnv,
          VERCEL_PROJECT_ID: vercelProjectId,
        },
        execFile: createExecFile('different-secret\n'),
        log: vi.fn(),
      }),
    ).toThrow('CONVEX_GAME_WRITE_SECRET does not match between Vercel and Convex deployment preview-deployment')
  })

  it('fails when the Vercel build AI Gateway key is missing', () => {
    expect(() =>
      verifyDeployEnv({
        env: {
          VERCEL: '1',
          CONVEX_DEPLOYMENT: 'preview-deployment',
          CONVEX_GAME_WRITE_SECRET: secret,
        },
        execFile: createExecFile(secret),
        log: vi.fn(),
      }),
    ).toThrow('Missing AI_GATEWAY_API_KEY in the Vercel build environment')
  })

  it('fails when the Vercel build AI Gateway key is still a placeholder', () => {
    expect(() =>
      verifyDeployEnv({
        env: {
          VERCEL: '1',
          CONVEX_DEPLOYMENT: 'preview-deployment',
          CONVEX_GAME_WRITE_SECRET: secret,
          AI_GATEWAY_API_KEY: 'replace-with-ai-gateway-api-key',
        },
        execFile: createExecFile(secret),
        log: vi.fn(),
      }),
    ).toThrow('Replace placeholder AI_GATEWAY_API_KEY in the Vercel build environment')
  })

  it('fails when the Convex deployment AI Gateway key is missing', () => {
    const execFile = vi.fn(() => `OTHER=value\nCONVEX_GAME_WRITE_SECRET=${secret}\n`)

    expect(() =>
      verifyDeployEnv({
        env: {
          VERCEL: '1',
          CONVEX_DEPLOYMENT: 'preview-deployment',
          CONVEX_GAME_WRITE_SECRET: secret,
          AI_GATEWAY_API_KEY: aiGatewayApiKey,
          ASK_KILIAN_CONVEX_ACCESS_TOKEN: askKilianAccessToken,
          ASK_KILIAN_GATEWAY_ENV: askKilianGatewayEnv,
          VERCEL_PROJECT_ID: vercelProjectId,
        },
        execFile,
        log: vi.fn(),
      }),
    ).toThrow('Missing AI_GATEWAY_API_KEY in Convex deployment preview-deployment')
  })

  it('fails when the Convex deployment AI Gateway key is still a placeholder', () => {
    expect(() =>
      verifyDeployEnv({
        env: {
          VERCEL: '1',
          CONVEX_DEPLOYMENT: 'preview-deployment',
          CONVEX_GAME_WRITE_SECRET: secret,
          AI_GATEWAY_API_KEY: aiGatewayApiKey,
          ASK_KILIAN_CONVEX_ACCESS_TOKEN: askKilianAccessToken,
          ASK_KILIAN_GATEWAY_ENV: askKilianGatewayEnv,
          VERCEL_PROJECT_ID: vercelProjectId,
        },
        execFile: createExecFile(secret, 'placeholder-ai-gateway-api-key'),
        log: vi.fn(),
      }),
    ).toThrow('Replace placeholder AI_GATEWAY_API_KEY in Convex deployment preview-deployment')
  })

  it('fails when the Convex and Vercel AI Gateway keys differ', () => {
    expect(() =>
      verifyDeployEnv({
        env: {
          VERCEL: '1',
          CONVEX_DEPLOYMENT: 'preview-deployment',
          CONVEX_GAME_WRITE_SECRET: secret,
          AI_GATEWAY_API_KEY: aiGatewayApiKey,
          ASK_KILIAN_CONVEX_ACCESS_TOKEN: askKilianAccessToken,
          ASK_KILIAN_GATEWAY_ENV: askKilianGatewayEnv,
          VERCEL_PROJECT_ID: vercelProjectId,
        },
        execFile: createExecFile(secret, 'different-ai-key'),
        log: vi.fn(),
      }),
    ).toThrow('AI_GATEWAY_API_KEY does not match between Vercel and Convex deployment preview-deployment')
  })

  it('fails before deploy-key skip when the Vercel Ask Kilian access token is missing', () => {
    const execFile = vi.fn(() => {
      throw new Error('nested Convex env reads should not run when CONVEX_DEPLOY_KEY is present')
    })

    expect(() =>
      verifyDeployEnv({
        env: {
          VERCEL: '1',
          CONVEX_DEPLOYMENT: 'preview-deployment',
          CONVEX_DEPLOY_KEY: 'preview:ktyler:kil-dev|preview-deploy-key',
          CONVEX_GAME_WRITE_SECRET: secret,
          AI_GATEWAY_API_KEY: aiGatewayApiKey,
        },
        execFile,
        log: vi.fn(),
      }),
    ).toThrow('Missing ASK_KILIAN_CONVEX_ACCESS_TOKEN in the Vercel build environment')
    expect(execFile).not.toHaveBeenCalled()
  })

  it('fails before deploy-key skip when the Vercel Ask Kilian access token is still a placeholder', () => {
    const execFile = vi.fn(() => {
      throw new Error('nested Convex env reads should not run when CONVEX_DEPLOY_KEY is present')
    })

    expect(() =>
      verifyDeployEnv({
        env: {
          VERCEL: '1',
          CONVEX_DEPLOYMENT: 'preview-deployment',
          CONVEX_DEPLOY_KEY: 'preview:ktyler:kil-dev|preview-deploy-key',
          CONVEX_GAME_WRITE_SECRET: secret,
          AI_GATEWAY_API_KEY: aiGatewayApiKey,
          ASK_KILIAN_CONVEX_ACCESS_TOKEN: 'replace-with-ask-kilian-convex-access-token',
        },
        execFile,
        log: vi.fn(),
      }),
    ).toThrow('Replace placeholder ASK_KILIAN_CONVEX_ACCESS_TOKEN in the Vercel build environment')
    expect(execFile).not.toHaveBeenCalled()
  })

  it('fails before deploy-key skip when the Vercel project id is missing', () => {
    const execFile = vi.fn(() => {
      throw new Error('nested Convex env reads should not run when CONVEX_DEPLOY_KEY is present')
    })

    expect(() =>
      verifyDeployEnv({
        env: {
          VERCEL: '1',
          CONVEX_DEPLOYMENT: 'preview-deployment',
          CONVEX_DEPLOY_KEY: 'preview:ktyler:kil-dev|preview-deploy-key',
          CONVEX_GAME_WRITE_SECRET: secret,
          AI_GATEWAY_API_KEY: aiGatewayApiKey,
          ASK_KILIAN_CONVEX_ACCESS_TOKEN: askKilianAccessToken,
          ASK_KILIAN_GATEWAY_ENV: askKilianGatewayEnv,
        },
        execFile,
        log: vi.fn(),
      }),
    ).toThrow('Missing VERCEL_PROJECT_ID in the Vercel build environment')
    expect(execFile).not.toHaveBeenCalled()
  })

  it('fails before deploy-key skip when the Ask Kilian Gateway reporting env is missing', () => {
    const execFile = vi.fn(() => {
      throw new Error('nested Convex env reads should not run when CONVEX_DEPLOY_KEY is present')
    })

    expect(() =>
      verifyDeployEnv({
        env: {
          VERCEL: '1',
          CONVEX_DEPLOYMENT: 'preview-deployment',
          CONVEX_DEPLOY_KEY: 'preview:ktyler:kil-dev|preview-deploy-key',
          CONVEX_GAME_WRITE_SECRET: secret,
          AI_GATEWAY_API_KEY: aiGatewayApiKey,
          ASK_KILIAN_CONVEX_ACCESS_TOKEN: askKilianAccessToken,
        },
        execFile,
        log: vi.fn(),
      }),
    ).toThrow('Missing ASK_KILIAN_GATEWAY_ENV in the Vercel build environment')
    expect(execFile).not.toHaveBeenCalled()
  })

  it('fails when the Convex deployment Ask Kilian access token is missing', () => {
    const execFile = vi.fn(
      () => `OTHER=value\nCONVEX_GAME_WRITE_SECRET=${secret}\nAI_GATEWAY_API_KEY=${aiGatewayApiKey}\n`,
    )

    expect(() =>
      verifyDeployEnv({
        env: {
          VERCEL: '1',
          CONVEX_DEPLOYMENT: 'preview-deployment',
          CONVEX_GAME_WRITE_SECRET: secret,
          AI_GATEWAY_API_KEY: aiGatewayApiKey,
          ASK_KILIAN_CONVEX_ACCESS_TOKEN: askKilianAccessToken,
          ASK_KILIAN_GATEWAY_ENV: askKilianGatewayEnv,
          VERCEL_PROJECT_ID: vercelProjectId,
        },
        execFile,
        log: vi.fn(),
      }),
    ).toThrow('Missing ASK_KILIAN_CONVEX_ACCESS_TOKEN in Convex deployment preview-deployment')
  })

  it('fails when the Convex deployment Ask Kilian access token is still a placeholder', () => {
    expect(() =>
      verifyDeployEnv({
        env: {
          VERCEL: '1',
          CONVEX_DEPLOYMENT: 'preview-deployment',
          CONVEX_GAME_WRITE_SECRET: secret,
          AI_GATEWAY_API_KEY: aiGatewayApiKey,
          ASK_KILIAN_CONVEX_ACCESS_TOKEN: askKilianAccessToken,
          ASK_KILIAN_GATEWAY_ENV: askKilianGatewayEnv,
          VERCEL_PROJECT_ID: vercelProjectId,
        },
        execFile: createExecFile(secret, aiGatewayApiKey, 'placeholder-ask-kilian-convex-access-token'),
        log: vi.fn(),
      }),
    ).toThrow('Replace placeholder ASK_KILIAN_CONVEX_ACCESS_TOKEN in Convex deployment preview-deployment')
  })

  it('fails when the Convex and Vercel Ask Kilian access tokens differ', () => {
    expect(() =>
      verifyDeployEnv({
        env: {
          VERCEL: '1',
          CONVEX_DEPLOYMENT: 'preview-deployment',
          CONVEX_GAME_WRITE_SECRET: secret,
          AI_GATEWAY_API_KEY: aiGatewayApiKey,
          ASK_KILIAN_CONVEX_ACCESS_TOKEN: askKilianAccessToken,
          ASK_KILIAN_GATEWAY_ENV: askKilianGatewayEnv,
          VERCEL_PROJECT_ID: vercelProjectId,
        },
        execFile: createExecFile(secret, aiGatewayApiKey, 'different-ask-kilian-token'),
        log: vi.fn(),
      }),
    ).toThrow('ASK_KILIAN_CONVEX_ACCESS_TOKEN does not match between Vercel and Convex deployment preview-deployment')
  })

  it('passes when Vercel and Convex secrets match', () => {
    const log = vi.fn()
    const execFile = createExecFile(`${secret}\n`)

    const result = verifyDeployEnv({
      env: {
        VERCEL: '1',
        CONVEX_DEPLOYMENT: 'preview-deployment',
        CONVEX_GAME_WRITE_SECRET: secret,
        AI_GATEWAY_API_KEY: aiGatewayApiKey,
        ASK_KILIAN_CONVEX_ACCESS_TOKEN: askKilianAccessToken,
        ASK_KILIAN_GATEWAY_ENV: askKilianGatewayEnv,
        VERCEL_PROJECT_ID: vercelProjectId,
      },
      execFile,
      log,
    })

    expect(result).toEqual({ checked: true, convexRuntimeChecked: true, deployment: 'preview-deployment' })
    expect(execFile).toHaveBeenCalledWith(
      'bunx',
      ['convex', 'env', 'list', '--deployment', 'preview-deployment'],
      expect.objectContaining({
        encoding: 'utf8',
        env: expect.not.objectContaining({ CONVEX_DEPLOYMENT: expect.any(String) }),
      }),
    )
    expect(log).toHaveBeenCalledWith(
      'Verified CONVEX_GAME_WRITE_SECRET, AI_GATEWAY_API_KEY, ASK_KILIAN_CONVEX_ACCESS_TOKEN, ASK_KILIAN_GATEWAY_ENV, and VERCEL_PROJECT_ID in Vercel and Convex deployment preview-deployment.',
    )
  })

  it('does not require preview RAG source key as a shared Vercel and Convex runtime secret', () => {
    const log = vi.fn()
    const execFile = vi.fn(() =>
      [
        `CONVEX_GAME_WRITE_SECRET=${secret}`,
        `AI_GATEWAY_API_KEY=${aiGatewayApiKey}`,
        `ASK_KILIAN_CONVEX_ACCESS_TOKEN=${askKilianAccessToken}`,
        `ASK_KILIAN_GATEWAY_ENV=${askKilianGatewayEnv}`,
        `VERCEL_PROJECT_ID=${vercelProjectId}`,
      ].join('\n'),
    )

    expect(() =>
      verifyDeployEnv({
        env: {
          VERCEL: '1',
          CONVEX_DEPLOYMENT: 'preview-deployment',
          CONVEX_GAME_WRITE_SECRET: secret,
          AI_GATEWAY_API_KEY: aiGatewayApiKey,
          ASK_KILIAN_CONVEX_ACCESS_TOKEN: askKilianAccessToken,
          ASK_KILIAN_GATEWAY_ENV: askKilianGatewayEnv,
          VERCEL_PROJECT_ID: vercelProjectId,
        },
        execFile,
        log,
      }),
    ).not.toThrow()

    expect(execFile).toHaveBeenCalledWith(
      'bunx',
      ['convex', 'env', 'list', '--deployment', 'preview-deployment'],
      expect.objectContaining({
        env: expect.not.objectContaining({
          ASK_KILIAN_RAG_SOURCE_CONVEX_DEPLOY_KEY: expect.any(String),
        }),
      }),
    )
    expect(JSON.stringify(execFile.mock.calls)).not.toContain('ASK_KILIAN_RAG_SOURCE_CONVEX_DEPLOY_KEY')
  })

  it('passes for Convex deploy preview builds that provide only injected Convex URLs', () => {
    const log = vi.fn()
    const execFile = createExecFile(`${secret}\n`)

    const result = verifyDeployEnv({
      env: {
        VERCEL: '1',
        VERCEL_ENV: 'preview',
        NEXT_PUBLIC_CONVEX_URL: 'https://warm-squid-123.convex.cloud',
        CONVEX_GAME_WRITE_SECRET: secret,
        AI_GATEWAY_API_KEY: aiGatewayApiKey,
        ASK_KILIAN_CONVEX_ACCESS_TOKEN: askKilianAccessToken,
        ASK_KILIAN_GATEWAY_ENV: askKilianGatewayEnv,
        VERCEL_PROJECT_ID: vercelProjectId,
      },
      execFile,
      log,
    })

    expect(result).toEqual({ checked: true, convexRuntimeChecked: true, deployment: 'warm-squid-123' })
    expect(execFile).toHaveBeenCalledWith(
      'bunx',
      ['convex', 'env', 'list', '--deployment', 'warm-squid-123'],
      expect.objectContaining({ encoding: 'utf8' }),
    )
    expect(log).toHaveBeenCalledWith(
      'Verified CONVEX_GAME_WRITE_SECRET, AI_GATEWAY_API_KEY, ASK_KILIAN_CONVEX_ACCESS_TOKEN, ASK_KILIAN_GATEWAY_ENV, and VERCEL_PROJECT_ID in Vercel and Convex deployment warm-squid-123.',
    )
  })

  it('does not run nested Convex env reads when CONVEX_DEPLOY_KEY selects the deployment', () => {
    const log = vi.fn()
    const execFile = vi.fn(() => {
      throw new Error('nested Convex env reads should not run when CONVEX_DEPLOY_KEY is present')
    })

    const result = verifyDeployEnv({
      env: {
        VERCEL: '1',
        VERCEL_ENV: 'production',
        CONVEX_DEPLOY_KEY: 'prod:resolute-ptarmigan-441|prod-deploy-key',
        NEXT_PUBLIC_CONVEX_URL: 'https://resolute-ptarmigan-441.convex.cloud',
        CONVEX_GAME_WRITE_SECRET: secret,
        AI_GATEWAY_API_KEY: aiGatewayApiKey,
        ASK_KILIAN_CONVEX_ACCESS_TOKEN: askKilianAccessToken,
        ASK_KILIAN_GATEWAY_ENV: askKilianGatewayEnv,
        VERCEL_PROJECT_ID: vercelProjectId,
      },
      execFile,
      log,
    })

    expect(result).toEqual({ checked: true, convexRuntimeChecked: false, deployment: 'resolute-ptarmigan-441' })
    expect(execFile).not.toHaveBeenCalled()
    expect(log).toHaveBeenCalledWith(expectedDeployKeyLog('resolute-ptarmigan-441'))
  })

  it('uses the production deployment target for project deploy keys in production builds without nested reads', () => {
    const log = vi.fn()
    const execFile = vi.fn(() => {
      throw new Error('nested Convex env reads should not run when CONVEX_DEPLOY_KEY is present')
    })

    const result = verifyDeployEnv({
      env: {
        VERCEL: '1',
        VERCEL_ENV: 'production',
        CONVEX_DEPLOY_KEY: 'project:ktyler:kil-dev|project-deploy-key',
        NEXT_PUBLIC_CONVEX_URL: 'https://resolute-ptarmigan-441.convex.cloud',
        CONVEX_GAME_WRITE_SECRET: secret,
        AI_GATEWAY_API_KEY: aiGatewayApiKey,
        ASK_KILIAN_CONVEX_ACCESS_TOKEN: askKilianAccessToken,
        ASK_KILIAN_GATEWAY_ENV: askKilianGatewayEnv,
        VERCEL_PROJECT_ID: vercelProjectId,
      },
      execFile,
      log,
    })

    expect(result).toEqual({ checked: true, convexRuntimeChecked: false, deployment: 'resolute-ptarmigan-441' })
    expect(execFile).not.toHaveBeenCalled()
    expect(log).toHaveBeenCalledWith(expectedDeployKeyLog('resolute-ptarmigan-441'))
  })

  it('uses the URL-derived deployment target for preview deploy keys without nested reads', () => {
    const log = vi.fn()
    const execFile = vi.fn(() => {
      throw new Error('nested Convex env reads should not run when CONVEX_DEPLOY_KEY is present')
    })

    const result = verifyDeployEnv({
      env: {
        VERCEL: '1',
        VERCEL_ENV: 'preview',
        CONVEX_DEPLOY_KEY: 'preview:ktyler:kil-dev|preview-deploy-key',
        NEXT_PUBLIC_CONVEX_URL: 'https://preview-squid-123.convex.cloud',
        CONVEX_GAME_WRITE_SECRET: secret,
        AI_GATEWAY_API_KEY: aiGatewayApiKey,
        ASK_KILIAN_CONVEX_ACCESS_TOKEN: askKilianAccessToken,
        ASK_KILIAN_GATEWAY_ENV: askKilianGatewayEnv,
        VERCEL_PROJECT_ID: vercelProjectId,
      },
      execFile,
      log,
    })

    expect(result).toEqual({ checked: true, convexRuntimeChecked: false, deployment: 'preview-squid-123' })
    expect(execFile).not.toHaveBeenCalled()
    expect(log).toHaveBeenCalledWith(expectedDeployKeyLog('preview-squid-123'))
  })
})
