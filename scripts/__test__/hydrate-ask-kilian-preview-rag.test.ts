import { describe, expect, it, vi } from 'vitest'

import {
  ASK_KILIAN_APP_TABLES,
  ASK_KILIAN_RAG_TABLES,
} from '../ask-kilian-rag-tables'
import {
  hydrateAskKilianPreviewRag,
  type HydrateAskKilianPreviewRagDeps,
} from '../hydrate-ask-kilian-preview-rag'

const sourceKey = 'dev:test-source-123|source-secret'
const targetKey = 'preview:test-team:test-project|target-secret'

function previewEnv(overrides: Record<string, string | undefined> = {}) {
  return {
    VERCEL_ENV: 'preview',
    NEXT_PUBLIC_CONVEX_URL: 'https://test-preview-123.convex.cloud',
    ASK_KILIAN_RAG_SOURCE_CONVEX_DEPLOY_KEY: sourceKey,
    CONVEX_DEPLOY_KEY: targetKey,
    ...overrides,
  }
}

function createDeps(overrides: Partial<HydrateAskKilianPreviewRagDeps> = {}) {
  const deps = {
    mkdtemp: vi.fn(async () => '/tmp/ask-kilian-preview-rag-test'),
    rm: vi.fn(async () => {}),
    extractSnapshotTable: vi.fn(async (_snapshotZip: string, table: string, options?: { component?: string }) => ({
      filePath: `/tmp/ask-kilian-preview-rag-test/${options?.component ? `${options.component}-` : ''}${table}.jsonl`,
      rowCount: 3,
    })),
    run: vi.fn(async () => ''),
    log: vi.fn(),
    ...overrides,
  } satisfies HydrateAskKilianPreviewRagDeps

  return deps
}

function runCommands(deps: HydrateAskKilianPreviewRagDeps) {
  return vi.mocked(deps.run).mock.calls.map(([command]) => command)
}

describe('hydrateAskKilianPreviewRag', () => {
  it('copies app and RAG component tables from dev into preview without logging secrets', async () => {
    const deps = createDeps()

    const result = await hydrateAskKilianPreviewRag({ env: previewEnv() }, deps)

    expect(result).toEqual({ hydrated: true, targetDeployment: 'test-preview-123' })

    const commands = runCommands(deps)
    expect(commands.some(command => command.includes('convex export'))).toBe(true)
    expect(commands).not.toEqual(expect.arrayContaining([expect.stringContaining('convex data')]))
    expect(commands).toEqual(
      expect.arrayContaining([
        expect.stringContaining('convex import --replace -y --table askKilianKnowledgeEntries'),
        expect.stringContaining('convex import --replace -y --component rag --table namespaces'),
      ]),
    )

    const importCommands = commands.filter(command => command.includes('convex import'))
    expect(importCommands).toHaveLength(ASK_KILIAN_APP_TABLES.length + ASK_KILIAN_RAG_TABLES.length)
    expect(deps.extractSnapshotTable).toHaveBeenCalledTimes(importCommands.length)

    const logText = vi.mocked(deps.log).mock.calls.flat().join('\n')
    expect(logText).not.toContain('source-secret')
    expect(logText).not.toContain('target-secret')
  })

  it('uses the dev key only for source reads and the preview key only for target imports', async () => {
    const deps = createDeps()

    await hydrateAskKilianPreviewRag({ env: previewEnv() }, deps)

    const runCalls = vi.mocked(deps.run).mock.calls
    const exportCalls = runCalls.filter(([command]) => command.includes('convex export'))
    const importCalls = runCalls.filter(([command]) => command.includes('convex import'))

    expect(exportCalls).toHaveLength(1)
    expect(exportCalls[0]?.[1].env.CONVEX_DEPLOY_KEY).toBe(sourceKey)
    expect(exportCalls[0]?.[1].env.ASK_KILIAN_RAG_SOURCE_CONVEX_DEPLOY_KEY).toBeUndefined()
    for (const [, options] of importCalls) {
      expect(options.env.CONVEX_DEPLOY_KEY).toBe(targetKey)
      expect(options.env.ASK_KILIAN_RAG_SOURCE_CONVEX_DEPLOY_KEY).toBeUndefined()
    }
  })

  it.each([
    ['missing source key', { ASK_KILIAN_RAG_SOURCE_CONVEX_DEPLOY_KEY: undefined }, 'dev-scoped Convex deploy key'],
    ['non-dev source key', { ASK_KILIAN_RAG_SOURCE_CONVEX_DEPLOY_KEY: targetKey }, 'dev-scoped Convex deploy key'],
    ['non-preview target key', { CONVEX_DEPLOY_KEY: sourceKey }, 'preview-scoped Convex deploy key'],
    ['non-preview Vercel env', { VERCEL_ENV: 'production' }, 'only runs for Vercel preview deployments'],
  ] as const)('fails closed before commands for %s', async (_label, overrides, message) => {
    const deps = createDeps()

    await expect(hydrateAskKilianPreviewRag({ env: previewEnv(overrides) }, deps)).rejects.toThrow(message)

    expect(deps.mkdtemp).not.toHaveBeenCalled()
    expect(deps.run).not.toHaveBeenCalled()
    expect(deps.extractSnapshotTable).not.toHaveBeenCalled()
    expect(deps.rm).not.toHaveBeenCalled()
  })

  it('includes replace and yes flags on every import command', async () => {
    const deps = createDeps()

    await hydrateAskKilianPreviewRag({ env: previewEnv() }, deps)

    const importCommands = runCommands(deps).filter(command => command.includes('convex import'))
    expect(importCommands).not.toEqual([])
    expect(importCommands.every(command => command.includes('--replace -y'))).toBe(true)
  })

  it('extracts app tables without component options and RAG tables with component options', async () => {
    const deps = createDeps()

    await hydrateAskKilianPreviewRag({ env: previewEnv() }, deps)

    for (const table of ASK_KILIAN_APP_TABLES) {
      expect(deps.extractSnapshotTable).toHaveBeenCalledWith(
        expect.stringMatching(/source\.zip$/),
        table,
        expect.not.objectContaining({ component: expect.any(String) }),
      )
    }
    for (const table of ASK_KILIAN_RAG_TABLES) {
      expect(deps.extractSnapshotTable).toHaveBeenCalledWith(
        expect.stringMatching(/source\.zip$/),
        table,
        expect.objectContaining({ component: 'rag' }),
      )
    }
  })

  it('cleans up the temp directory even if an import fails', async () => {
    const deps = createDeps({
      run: vi.fn(async command => {
        if (command.includes('convex import')) throw new Error('import failed')
        return ''
      }),
    })

    await expect(hydrateAskKilianPreviewRag({ env: previewEnv() }, deps)).rejects.toThrow('import failed')

    expect(deps.rm).toHaveBeenCalledWith('/tmp/ask-kilian-preview-rag-test', { recursive: true, force: true })
  })
})
