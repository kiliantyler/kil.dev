#!/usr/bin/env bun
import { execFileSync } from 'node:child_process'

const GAME_WRITE_SECRET = 'CONVEX_GAME_WRITE_SECRET'

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

function isPlaceholder(value: string) {
  return value.includes('placeholder') || value.startsWith('replace-with-')
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

  const vercelSecret = env[GAME_WRITE_SECRET]
  if (!vercelSecret) {
    throw new Error(`Missing ${GAME_WRITE_SECRET} in the Vercel build environment`)
  }
  if (isPlaceholder(vercelSecret)) {
    throw new Error(`Replace placeholder ${GAME_WRITE_SECRET} in the Vercel build environment`)
  }

  const deployment = getConvexDeploymentTarget(env)
  if (!deployment) {
    throw new Error('Missing Convex deployment target; cannot verify Convex game write secret')
  }

  if (env.CONVEX_DEPLOY_KEY) {
    log(
      `Verified ${GAME_WRITE_SECRET} in the Vercel build environment for Convex deployment ${deployment}. Convex deploy key will select the deployment during deploy.`,
    )
    return { checked: true as const, deployment }
  }

  let convexEnvList: string
  try {
    const convexCliEnv = { ...process.env, ...env }
    delete convexCliEnv.CONVEX_DEPLOYMENT
    convexEnvList = execFile('bunx', ['convex', 'env', 'list', '--deployment', deployment], {
      encoding: 'utf8',
      env: convexCliEnv,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  } catch {
    throw new Error(`Missing ${GAME_WRITE_SECRET} in Convex deployment ${deployment}`)
  }

  const convexSecret =
    convexEnvList
      .split('\n')
      .find(line => line.startsWith(`${GAME_WRITE_SECRET}=`))
      ?.slice(GAME_WRITE_SECRET.length + 1) ?? ''

  if (!convexSecret) {
    throw new Error(`Missing ${GAME_WRITE_SECRET} in Convex deployment ${deployment}`)
  }
  if (convexSecret !== vercelSecret) {
    throw new Error(`${GAME_WRITE_SECRET} does not match between Vercel and Convex deployment ${deployment}`)
  }

  log(`Verified ${GAME_WRITE_SECRET} in Vercel and Convex deployment ${deployment}.`)
  return { checked: true as const, deployment }
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
