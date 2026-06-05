#!/usr/bin/env bun
import { spawn } from 'node:child_process'

import { deploySyncAskKilianRag } from './deploy-sync-ask-kilian-rag'

export const CONVEX_DEPLOY_BUILD_COMMAND = 'bun scripts/vercel-build-command.ts'

export type VercelBuildDeps = {
  runConvexDeploy: (buildCommand: string) => unknown | Promise<unknown>
  deploySyncAskKilianRag: BuildStep
}

type BuildStep = () => unknown | Promise<unknown>

export function runConvexDeploy(buildCommand = CONVEX_DEPLOY_BUILD_COMMAND) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn('bunx', ['convex', 'deploy', '--cmd', buildCommand], { stdio: 'inherit' })

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
    runConvexDeploy,
    deploySyncAskKilianRag,
  }
}

export async function runVercelBuild(deps: VercelBuildDeps = createDefaultDeps()) {
  await deps.runConvexDeploy(CONVEX_DEPLOY_BUILD_COMMAND)
  await deps.deploySyncAskKilianRag()
}

if (import.meta.main) {
  await runVercelBuild().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
