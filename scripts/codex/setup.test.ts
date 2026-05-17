import { execFileSync } from 'node:child_process'
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'

const tempRoots: string[] = []

afterEach(() => {
  for (const tempRoot of tempRoots.splice(0)) {
    rmSync(tempRoot, { recursive: true, force: true })
  }
})

function makeTempRoot() {
  const tempRoot = mkdtempSync(join(tmpdir(), 'kil-dev-setup-'))
  tempRoots.push(tempRoot)
  return tempRoot
}

describe('setup.sh', () => {
  test('runs Next typegen with env validation skipped after installing dependencies', async () => {
    const tempRoot = makeTempRoot()
    const repoRoot = join(tempRoot, 'repo')
    const scriptDir = join(repoRoot, 'scripts', 'codex')
    const binDir = join(tempRoot, 'bin')
    const logPath = join(tempRoot, 'commands.log')

    await mkdir(scriptDir, { recursive: true })
    await mkdir(binDir, { recursive: true })

    writeFileSync(join(repoRoot, '.env.example'), 'NEXT_PUBLIC_POSTHOG_KEY=\nNEXT_PUBLIC_POSTHOG_HOST=\n')
    writeFileSync(join(scriptDir, 'setup.sh'), readFileSync(new URL('./setup.sh', import.meta.url)))
    chmodSync(join(scriptDir, 'setup.sh'), 0o755)

    writeFileSync(join(binDir, 'bun'), '#!/usr/bin/env bash\nprintf "bun:%s\\n" "$*" >> "$SETUP_LOG"\n')
    writeFileSync(
      join(binDir, 'bunx'),
      '#!/usr/bin/env bash\nprintf "bunx:%s:SKIP=%s\\n" "$*" "${SKIP_ENV_VALIDATION:-}" >> "$SETUP_LOG"\n',
    )
    chmodSync(join(binDir, 'bun'), 0o755)
    chmodSync(join(binDir, 'bunx'), 0o755)

    execFileSync(join(scriptDir, 'setup.sh'), {
      env: {
        ...process.env,
        PATH: `${binDir}:/usr/bin:/bin`,
        SETUP_LOG: logPath,
      },
    })

    expect(readFileSync(join(repoRoot, '.env.local'), 'utf8')).toBe(
      'NEXT_PUBLIC_POSTHOG_KEY=\nNEXT_PUBLIC_POSTHOG_HOST=\n',
    )
    expect(readFileSync(logPath, 'utf8')).toContain('bun:install --frozen-lockfile\n')
    expect(readFileSync(logPath, 'utf8')).toContain('bunx:next typegen:SKIP=1\n')
  })
})
