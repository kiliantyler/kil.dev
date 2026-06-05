#!/usr/bin/env bun
import { spawn } from 'node:child_process'

import { buildRuntimes } from './build-runtimes'
import { deploySyncAskKilianRag } from './deploy-sync-ask-kilian-rag'
import { verifyDeployEnv } from './verify-deploy-env'

type BuildStep = () => unknown | Promise<unknown>

export type VercelBuildDeps = {
  verifyDeployEnv: BuildStep
  buildRuntimes: BuildStep
  deploySyncAskKilianRag: BuildStep
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

function createDefaultDeps(): VercelBuildDeps {
  return {
    verifyDeployEnv,
    buildRuntimes,
    deploySyncAskKilianRag,
    runNextBuild,
  }
}

export async function runVercelBuild(deps: VercelBuildDeps = createDefaultDeps()) {
  await deps.verifyDeployEnv()
  await deps.buildRuntimes()
  await deps.deploySyncAskKilianRag()
  await deps.runNextBuild()
}

if (import.meta.main) {
  await runVercelBuild().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
