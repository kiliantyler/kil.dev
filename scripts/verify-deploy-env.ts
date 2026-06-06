#!/usr/bin/env bun
import { execFileSync } from 'node:child_process'

import { isPlaceholderSecret } from '../src/lib/env-secrets'

const GAME_WRITE_SECRET = 'CONVEX_GAME_WRITE_SECRET'
const AI_GATEWAY_API_KEY = 'AI_GATEWAY_API_KEY'
const ASK_KILIAN_ACCESS_TOKEN = 'ASK_KILIAN_CONVEX_ACCESS_TOKEN'
const ASK_KILIAN_GATEWAY_ENV = 'ASK_KILIAN_GATEWAY_ENV'
const VERCEL_PROJECT_ID = 'VERCEL_PROJECT_ID'
const REQUIRED_ADMIN_AUTH_ENV_KEYS = [
  'WORKOS_API_KEY',
  'WORKOS_CLIENT_ID',
  'WORKOS_COOKIE_PASSWORD',
  'WORKOS_ORG_ID',
  'ADMIN_EMAIL',
] as const
const REQUIRED_SHARED_ENV_KEYS = [
  GAME_WRITE_SECRET,
  AI_GATEWAY_API_KEY,
  ASK_KILIAN_ACCESS_TOKEN,
  ASK_KILIAN_GATEWAY_ENV,
  VERCEL_PROJECT_ID,
] as const

type Env = Record<string, string | undefined>
type ExecFile = (
  file: string,
  args: string[],
  options: {
    encoding: 'utf8'
    env: NodeJS.ProcessEnv
    stdio: ['ignore', 'pipe', 'pipe']
  },
) => string

type VerifyDeployEnvOptions = {
  env?: Env
  execFile?: ExecFile
  log?: (message: string) => void
}

function formatRequiredKeys() {
  return `${REQUIRED_SHARED_ENV_KEYS.slice(0, -1).join(', ')}, and ${REQUIRED_SHARED_ENV_KEYS.at(-1)}`
}

function formatRequiredKeysForError() {
  return REQUIRED_SHARED_ENV_KEYS.join(' and ')
}

function formatAdminAuthKeys() {
  return REQUIRED_ADMIN_AUTH_ENV_KEYS.join(', ')
}

function createConvexCliEnv(env: Env) {
  const convexCliEnv = { ...process.env, ...env }
  delete convexCliEnv.CONVEX_DEPLOYMENT
  return convexCliEnv
}

export function shouldVerifyDeployEnv(env: Env = process.env) {
  return env.KIL_DEV_ENFORCE_DEPLOY_ENV === '1' || env.VERCEL === '1'
}

function getDeploymentFromConvexUrl(url: string | undefined) {
  if (!url) return
  try {
    const hostname = new URL(url).hostname
    const suffix = hostname.endsWith('.convex.cloud') ? '.convex.cloud' : '.convex.site'
    if (!hostname.endsWith(suffix)) return
    return hostname.slice(0, -suffix.length)
  } catch {
    return
  }
}

export function getConvexDeploymentTarget(env: Env = process.env) {
  if (env.CONVEX_DEPLOYMENT) return env.CONVEX_DEPLOYMENT
  const deploymentFromUrl =
    getDeploymentFromConvexUrl(env.NEXT_PUBLIC_CONVEX_URL) ??
    getDeploymentFromConvexUrl(env.NEXT_PUBLIC_CONVEX_SITE_URL)
  if (deploymentFromUrl) return deploymentFromUrl
  if (env.VERCEL_ENV === 'production') return 'prod'
  return
}

export function verifyDeployEnv(options: VerifyDeployEnvOptions = {}) {
  const env = options.env ?? process.env
  const execFile: ExecFile = options.execFile ?? ((file, args, execOptions) => execFileSync(file, args, execOptions))
  const log = options.log ?? console.log

  if (!shouldVerifyDeployEnv(env)) {
    log('Skipping deploy environment verification outside Vercel.')
    return { checked: false as const }
  }

  const vercelSecrets = new Map<string, string>()
  for (const key of REQUIRED_SHARED_ENV_KEYS) {
    const value = env[key]?.trim()
    if (!value) {
      throw new Error(`Missing ${key} in the Vercel build environment`)
    }
    if (isPlaceholderSecret(value)) {
      throw new Error(`Replace placeholder ${key} in the Vercel build environment`)
    }
    vercelSecrets.set(key, value)
  }

  const shouldVerifyAdminAuthEnv = env.VERCEL_ENV === 'preview' || env.VERCEL_ENV === 'production'
  if (shouldVerifyAdminAuthEnv) {
    for (const key of REQUIRED_ADMIN_AUTH_ENV_KEYS) {
      const value = env[key]?.trim()
      if (!value) {
        throw new Error(`Missing ${key} in the Vercel build environment`)
      }
      if (isPlaceholderSecret(value)) {
        throw new Error(`Replace placeholder ${key} in the Vercel build environment`)
      }
      vercelSecrets.set(key, value)
    }
  }

  const convexRuntimeKeys = shouldVerifyAdminAuthEnv
    ? [...REQUIRED_SHARED_ENV_KEYS, ...REQUIRED_ADMIN_AUTH_ENV_KEYS]
    : REQUIRED_SHARED_ENV_KEYS

  const deployment = getConvexDeploymentTarget(env)
  if (!deployment) {
    throw new Error('Missing Convex deployment target; cannot verify Convex environment secrets')
  }

  if (env.CONVEX_DEPLOY_KEY) {
    const adminAuthSummary = shouldVerifyAdminAuthEnv
      ? ` and admin auth environment variables (${formatAdminAuthKeys()})`
      : ''
    log(
      `Verified ${formatRequiredKeys()}${adminAuthSummary} in the Vercel build environment for Convex deployment ${deployment}. Convex deploy key will select the deployment during deploy; Convex runtime secrets were not compared.`,
    )
    return { checked: true as const, convexRuntimeChecked: false as const, deployment }
  }

  let convexEnvList: string
  try {
    convexEnvList = execFile('bunx', ['convex', 'env', 'list', '--deployment', deployment], {
      encoding: 'utf8',
      env: createConvexCliEnv(env),
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  } catch {
    throw new Error(`Missing ${formatRequiredKeysForError()} in Convex deployment ${deployment}`)
  }

  for (const key of convexRuntimeKeys) {
    const convexSecret =
      convexEnvList
        .split('\n')
        .find(line => line.startsWith(`${key}=`))
        ?.slice(key.length + 1)
        .trim() ?? ''

    if (!convexSecret) {
      throw new Error(`Missing ${key} in Convex deployment ${deployment}`)
    }
    if (isPlaceholderSecret(convexSecret)) {
      throw new Error(`Replace placeholder ${key} in Convex deployment ${deployment}`)
    }
    if (convexSecret !== vercelSecrets.get(key)) {
      throw new Error(`${key} does not match between Vercel and Convex deployment ${deployment}`)
    }
  }

  const adminAuthSummary = shouldVerifyAdminAuthEnv
    ? ` and admin auth environment variables (${formatAdminAuthKeys()})`
    : ''
  log(`Verified ${formatRequiredKeys()}${adminAuthSummary} in Vercel and Convex deployment ${deployment}.`)
  return { checked: true as const, convexRuntimeChecked: true as const, deployment }
}

if (import.meta.main) {
  try {
    verifyDeployEnv()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(message)
    process.exit(1)
  }
}
