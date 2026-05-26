import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, test } from 'vitest'

const __dirname = dirname(fileURLToPath(import.meta.url))
const scriptPath = resolve(__dirname, 'setup-worktree-local-config.sh')
const hookPath = resolve(__dirname, '..', '..', '.githooks', 'post-checkout')

const tempRoots: string[] = []

afterEach(() => {
  for (const tempRoot of tempRoots.splice(0)) {
    rmSync(tempRoot, { recursive: true, force: true })
  }
})

function makeTempRoot() {
  const tempRoot = mkdtempSync(join(tmpdir(), 'kil-dev-codex-'))
  tempRoots.push(tempRoot)
  return tempRoot
}

function run(command: string, cwd: string, env: Record<string, string | undefined> = {}) {
  return spawnSync(command, {
    cwd,
    env: { ...process.env, ...env },
    shell: true,
    encoding: 'utf8',
  })
}

describe('setup-worktree-local-config.sh', () => {
  test('copies ignored env files and skips tracked examples', async () => {
    const tempRoot = makeTempRoot()
    const sourceRoot = join(tempRoot, 'source')
    const worktreeRoot = join(tempRoot, 'worktree')

    await mkdir(join(sourceRoot, 'nested'), { recursive: true })
    await mkdir(worktreeRoot, { recursive: true })

    expect(run('git init', sourceRoot).status).toBe(0)
    writeFileSync(join(sourceRoot, '.gitignore'), '.env*\n*.env\n!.env.example\n')
    writeFileSync(join(sourceRoot, '.env.local'), 'LOCAL=1\n')
    writeFileSync(join(sourceRoot, '.env.example'), 'EXAMPLE=1\n')
    writeFileSync(join(sourceRoot, 'nested', 'tool.env'), 'TOOL=1\n')

    execFileSync(scriptPath, {
      env: {
        ...process.env,
        CODEX_SOURCE_TREE_PATH: sourceRoot,
        CODEX_WORKTREE_PATH: worktreeRoot,
      },
    })

    expect(readFileSync(join(worktreeRoot, '.env.local'), 'utf8')).toBe('LOCAL=1\n')
    expect(readFileSync(join(worktreeRoot, 'nested', 'tool.env'), 'utf8')).toBe('TOOL=1\n')
    expect(() => readFileSync(join(worktreeRoot, '.env.example'), 'utf8')).toThrow()
  })

  test('git worktree creation runs the post-checkout hook and copies env files', () => {
    const tempRoot = makeTempRoot()
    const repoRoot = join(tempRoot, 'repo')
    const branchRoot = join(tempRoot, 'branch')

    expect(run('git init repo', tempRoot).status).toBe(0)
    expect(run('git config user.email test@example.com', repoRoot).status).toBe(0)
    expect(run('git config user.name Test', repoRoot).status).toBe(0)
    expect(run('git config commit.gpgsign false', repoRoot).status).toBe(0)
    expect(run('git config core.hooksPath .githooks', repoRoot).status).toBe(0)
    expect(run('mkdir -p scripts/codex .githooks', repoRoot).status).toBe(0)

    writeFileSync(join(repoRoot, 'README.md'), '# Test\n')
    writeFileSync(join(repoRoot, '.gitignore'), '.env*\n')
    writeFileSync(join(repoRoot, '.env.local'), 'LOCAL=1\n')
    writeFileSync(join(repoRoot, 'scripts/codex/setup-worktree-local-config.sh'), readFileSync(scriptPath))
    writeFileSync(join(repoRoot, '.githooks/post-checkout'), readFileSync(hookPath))

    expect(run('chmod +x scripts/codex/setup-worktree-local-config.sh .githooks/post-checkout', repoRoot).status).toBe(
      0,
    )
    expect(
      run('git add README.md .gitignore scripts/codex/setup-worktree-local-config.sh .githooks/post-checkout', repoRoot)
        .status,
    ).toBe(0)
    expect(run('git commit -m init', repoRoot).status).toBe(0)
    expect(run(`git worktree add "${branchRoot}" -b test-branch`, repoRoot).status).toBe(0)

    expect(readFileSync(join(branchRoot, '.env.local'), 'utf8')).toBe('LOCAL=1\n')
  })
})
