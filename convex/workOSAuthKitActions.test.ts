import { afterEach, describe, expect, it, vi } from 'vitest'

describe('WorkOS AuthKit action handler', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
  })

  async function importActions() {
    vi.resetModules()
    vi.stubEnv('WORKOS_CLIENT_ID', 'client_test_valid')
    vi.stubEnv('WORKOS_API_KEY', 'sk_test_valid')
    vi.stubEnv('WORKOS_WEBHOOK_SECRET', 'whsec_test_valid')
    vi.stubEnv('WORKOS_ACTION_SECRET', 'action_secret_test_valid')
    vi.stubEnv('ADMIN_EMAIL', 'admin@example.com')
    vi.stubEnv('WORKOS_ORG_ID', 'org_admin')
    return import('./workOSAuthKitActions')
  }

  function createResponse(type: 'authentication' | 'user_registration') {
    return {
      allow: () => ({
        type,
        timestamp: Date.now(),
        verdict: 'Allow',
      }),
      deny: (errorMessage: string) => ({
        type,
        timestamp: Date.now(),
        verdict: 'Deny',
        errorMessage,
      }),
    }
  }

  it('is safe to import when WorkOS AuthKit environment is missing', async () => {
    vi.resetModules()
    vi.stubEnv('WORKOS_CLIENT_ID', '')
    vi.stubEnv('WORKOS_API_KEY', '')
    vi.stubEnv('WORKOS_WEBHOOK_SECRET', '')
    vi.stubEnv('WORKOS_ACTION_SECRET', '')

    await expect(import('./workOSAuthKitActions')).resolves.toHaveProperty('authKitAction')
  })

  it('allows authentication actions for the configured admin email and organization', async () => {
    vi.setSystemTime(new Date('2026-05-17T12:00:00.000Z'))
    const { allowWorkOSAction } = await importActions()

    expect(
      allowWorkOSAction(
        {
          user: { email: 'ADMIN@example.com' },
          organization: { id: 'org_admin' },
        },
        createResponse('authentication'),
      ),
    ).toEqual({
      type: 'authentication',
      timestamp: Date.parse('2026-05-17T12:00:00.000Z'),
      verdict: 'Allow',
    })
  })

  it('allows user registration actions for the configured admin email and invitation organization', async () => {
    vi.setSystemTime(new Date('2026-05-17T12:00:00.000Z'))
    const { allowWorkOSAction } = await importActions()

    expect(
      allowWorkOSAction(
        {
          userData: { email: 'admin@example.com' },
          invitation: { organizationId: 'org_admin' },
        },
        createResponse('user_registration'),
      ),
    ).toEqual({
      type: 'user_registration',
      timestamp: Date.parse('2026-05-17T12:00:00.000Z'),
      verdict: 'Allow',
    })
  })

  it('denies authentication actions for a non-admin email', async () => {
    vi.setSystemTime(new Date('2026-05-17T12:00:00.000Z'))
    const { allowWorkOSAction } = await importActions()

    expect(
      allowWorkOSAction(
        {
          user: { email: 'someone@example.com' },
          organization: { id: 'org_admin' },
        },
        createResponse('authentication'),
      ),
    ).toEqual({
      type: 'authentication',
      timestamp: Date.parse('2026-05-17T12:00:00.000Z'),
      verdict: 'Deny',
      errorMessage: 'This account is not allowed to access the pet gallery admin.',
    })
  })

  it('denies user registration actions for a different organization', async () => {
    vi.setSystemTime(new Date('2026-05-17T12:00:00.000Z'))
    const { allowWorkOSAction } = await importActions()

    expect(
      allowWorkOSAction(
        {
          userData: { email: 'admin@example.com' },
          invitation: { organizationId: 'org_other' },
        },
        createResponse('user_registration'),
      ),
    ).toEqual({
      type: 'user_registration',
      timestamp: Date.parse('2026-05-17T12:00:00.000Z'),
      verdict: 'Deny',
      errorMessage: 'This organization is not allowed to access the pet gallery admin.',
    })
  })
})
