#!/usr/bin/env bun
import { spawn } from 'node:child_process'

import { buildRuntimes } from './build-runtimes'
import { verifyDeployEnv } from './verify-deploy-env'

type BuildStep = () => unknown | Promise<unknown>

export type VercelBuildCommandDeps = {
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

function createDefaultDeps(): VercelBuildCommandDeps {
  return {
    verifyDeployEnv,
    buildRuntimes,
    runNextBuild,
  }
}

export async function runVercelBuildCommand(deps: VercelBuildCommandDeps = createDefaultDeps()) {
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
