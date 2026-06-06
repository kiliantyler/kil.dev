#!/usr/bin/env bun
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { deploySyncAskKilianRag } from './deploy-sync-ask-kilian-rag'
import {
  CONVEX_DEPLOY_BUILD_COMMAND,
  CONVEX_DEPLOY_URL_CAPTURE_ENV,
  CONVEX_DEPLOY_URL_ENV_VAR_NAME,
} from './vercel-build-shared'

type DeploySyncEnv = Record<string, string | undefined>
type DeploySyncStep = (options?: { env?: DeploySyncEnv }) => unknown | Promise<unknown>

export type VercelBuildDeps = {
  mkdtemp: (prefix: string) => Promise<string>
  rm: (path: string, options: { recursive: true; force: true }) => Promise<void>
  readFile: (path: string, encoding: BufferEncoding) => Promise<string>
  runConvexDeploy: (buildCommand: string, options: { env: NodeJS.ProcessEnv }) => unknown | Promise<unknown>
  deploySyncAskKilianRag: DeploySyncStep
}

export function runConvexDeploy(
  buildCommand = CONVEX_DEPLOY_BUILD_COMMAND,
  { env = process.env }: { env?: NodeJS.ProcessEnv } = {},
) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(
      'bunx',
      ['convex', 'deploy', '--cmd-url-env-var-name', CONVEX_DEPLOY_URL_ENV_VAR_NAME, '--cmd', buildCommand],
      { env, stdio: 'inherit' },
    )

    child.once('error', reject)
    child.once('exit', (code, signal) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(
        new Error(signal ? `convex deploy exited with signal ${signal}` : `convex deploy exited with code ${code}`),
      )
    })
  })
}

function createDefaultDeps(): VercelBuildDeps {
  return {
    mkdtemp,
    rm,
    readFile,
    runConvexDeploy,
    deploySyncAskKilianRag,
  }
}

export async function runVercelBuild(deps: VercelBuildDeps = createDefaultDeps()) {
  const tempDir = await deps.mkdtemp(path.join(tmpdir(), 'kil-dev-vercel-build-'))
  const convexUrlCapturePath = path.join(tempDir, 'convex-url.txt')

  try {
    await deps.runConvexDeploy(CONVEX_DEPLOY_BUILD_COMMAND, {
      env: {
        ...process.env,
        [CONVEX_DEPLOY_URL_CAPTURE_ENV]: convexUrlCapturePath,
      },
    })

    const convexUrl = (await deps.readFile(convexUrlCapturePath, 'utf8')).trim()
    if (!convexUrl) {
      throw new Error(`Convex deploy did not capture ${CONVEX_DEPLOY_URL_ENV_VAR_NAME}`)
    }

    await deps.deploySyncAskKilianRag({
      env: {
        ...process.env,
        [CONVEX_DEPLOY_URL_ENV_VAR_NAME]: convexUrl,
      },
    })
  } finally {
    await deps.rm(tempDir, { recursive: true, force: true })
  }
}

if (import.meta.main) {
  await runVercelBuild().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
