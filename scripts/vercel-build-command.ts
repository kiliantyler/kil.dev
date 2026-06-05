#!/usr/bin/env bun
import { spawn } from 'node:child_process'
import { writeFile } from 'node:fs/promises'

import { buildRuntimes } from './build-runtimes'
import { CONVEX_DEPLOY_URL_CAPTURE_ENV, CONVEX_DEPLOY_URL_ENV_VAR_NAME } from './vercel-build-shared'
import { verifyDeployEnv } from './verify-deploy-env'

type BuildStep = () => unknown | Promise<unknown>

export type VercelBuildCommandDeps = {
  captureConvexDeployUrl: BuildStep
  verifyDeployEnv: BuildStep
  buildRuntimes: BuildStep
  runNextBuild: BuildStep
}

export function runNextBuild() {
  return new Promise<void>((resolve, reject) => {
    const child = spawn('bunx', ['next', 'build'], { stdio: 'inherit' })

    child.once('error', reject)
    child.once('exit', (code, signal) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(signal ? `next build exited with signal ${signal}` : `next build exited with code ${code}`))
    })
  })
}

export async function captureConvexDeployUrl({
  env = process.env,
  writeFileText = writeFile,
}: {
  env?: Record<string, string | undefined>
  writeFileText?: (path: string, data: string, options: { encoding: BufferEncoding }) => Promise<void>
} = {}) {
  const capturePath = env[CONVEX_DEPLOY_URL_CAPTURE_ENV]?.trim()
  if (!capturePath) return

  const convexUrl = env[CONVEX_DEPLOY_URL_ENV_VAR_NAME]?.trim()
  if (!convexUrl) {
    throw new Error(`Missing ${CONVEX_DEPLOY_URL_ENV_VAR_NAME} while ${CONVEX_DEPLOY_URL_CAPTURE_ENV} is set`)
  }

  await writeFileText(capturePath, `${convexUrl}\n`, { encoding: 'utf8' })
}

function createDefaultDeps(): VercelBuildCommandDeps {
  return {
    captureConvexDeployUrl,
    verifyDeployEnv,
    buildRuntimes,
    runNextBuild,
  }
}

export async function runVercelBuildCommand(deps: VercelBuildCommandDeps = createDefaultDeps()) {
  await deps.captureConvexDeployUrl()
  await deps.verifyDeployEnv()
  await deps.buildRuntimes()
  await deps.runNextBuild()
}

if (import.meta.main) {
  await runVercelBuildCommand().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
