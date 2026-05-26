import type { AuthConfig } from 'convex/server'

function readOptionalAuthConfigEnv(key: string) {
  const value = process.env[key]?.trim()
  return value || undefined
}

export function getWorkOSAuthConfigProviders(): AuthConfig['providers'] {
  const clientId = readOptionalAuthConfigEnv('WORKOS_CLIENT_ID')

  if (!clientId) return []

  return [
    {
      type: 'customJwt',
      issuer: 'https://api.workos.com/',
      algorithm: 'RS256',
      jwks: `https://api.workos.com/sso/jwks/${clientId}`,
      applicationID: clientId,
    },
    {
      type: 'customJwt',
      issuer: `https://api.workos.com/user_management/${clientId}`,
      algorithm: 'RS256',
      jwks: `https://api.workos.com/sso/jwks/${clientId}`,
    },
  ]
}
