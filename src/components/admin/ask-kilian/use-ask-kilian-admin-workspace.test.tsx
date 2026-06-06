import { chromium, type Page } from '@playwright/test'
import { build } from 'esbuild'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '../../../..')

type WorkspaceHarnessGlobal = typeof globalThis & {
  askKilianActionMocks: {
    detailResolvers: Array<(value: unknown) => void>
    retrievalResolvers: Array<(value: unknown) => void>
    nextState: { entries: Array<Record<string, unknown>> }
  }
  askKilianWorkspace: {
    selectedDetail?: { text?: string }
    selectedEntry?: { title?: string }
    retrievalPreview?: { contextPreview?: string; results?: unknown[] }
    actions: {
      loadEntryDetail: (stableKey: string) => Promise<unknown>
      previewRetrieval: (input: {
        prompt: string
        tier: number
        includeSpoilers: boolean
        categories: string[]
        limit: number
      }) => void
      refresh: () => void
    }
  }
}

async function buildWorkspaceHookTestPage() {
  const tempDir = await mkdtemp(path.join(tmpdir(), 'ask-kilian-workspace-hook-'))
  const actionsPath = path.join(tempDir, 'actions.ts')
  const entryPath = path.join(tempDir, 'entry.tsx')

  await writeFile(
    actionsPath,
    `
      const detailResolvers = []
      const retrievalResolvers = []

      const entry = {
        stableKey: 'admin:manual',
        source: 'admin',
        status: 'active',
        category: 'fun',
        title: 'Manual entry',
        sourcePath: 'admin:/admin/ask-kilian',
        contentHash: 'hash-manual',
        minTier: 0,
        spoilerLevel: 'none',
        importance: 0.7,
        updatedAt: 200,
        textSummary: 'Manual entry summary',
      }

      globalThis.askKilianActionMocks = {
        detailResolvers,
        retrievalResolvers,
        nextState: {
          entries: [{ ...entry, title: 'Manual entry refreshed', updatedAt: 300 }],
          selectedStableKey: 'admin:manual',
          runtimeStatus: { label: 'Runtime', level: 'ready', reason: 'Runtime ready' },
          ragStatus: { label: 'RAG', level: 'ready', reason: 'RAG ready' },
        },
      }

      export async function getAskKilianAdminWorkspaceStateAction() {
        return globalThis.askKilianActionMocks.nextState
      }

      export async function getAskKilianKnowledgeEntryAction() {
        return new Promise(resolve => detailResolvers.push(resolve))
      }

      export async function previewAskKilianRetrievalAction() {
        return new Promise(resolve => retrievalResolvers.push(resolve))
      }

      export async function applyAskKilianRepoSyncAction() {
        throw new Error('not used')
      }

      export async function disableAskKilianAdminEntryAction() {
        throw new Error('not used')
      }

      export async function previewAskKilianRepoSyncAction() {
        throw new Error('not used')
      }

      export async function reenableAskKilianAdminEntryAction() {
        throw new Error('not used')
      }

      export async function saveAskKilianAdminEntryAction() {
        throw new Error('not used')
      }
    `,
  )

  await writeFile(
    entryPath,
    `
      import { createElement, useEffect } from 'react'
      import { createRoot } from 'react-dom/client'
      import { useAskKilianAdminWorkspace } from '${path
        .join(__dirname, 'use-ask-kilian-admin-workspace.ts')
        .replaceAll('\\', '/')}'

      const initialState = {
        entries: [{
          stableKey: 'admin:manual',
          source: 'admin',
          status: 'active',
          category: 'fun',
          title: 'Manual entry',
          sourcePath: 'admin:/admin/ask-kilian',
          contentHash: 'hash-manual',
          minTier: 0,
          spoilerLevel: 'none',
          importance: 0.7,
          updatedAt: 200,
          textSummary: 'Manual entry summary',
        }],
        selectedStableKey: 'admin:manual',
        runtimeStatus: { label: 'Runtime', level: 'ready', reason: 'Runtime ready' },
        ragStatus: { label: 'RAG', level: 'ready', reason: 'RAG ready' },
      }

      function TestHarness() {
        const workspace = useAskKilianAdminWorkspace(initialState)
        useEffect(() => {
          globalThis.askKilianWorkspace = workspace
        })
        return createElement('div', null, workspace.selectedDetail?.text ?? 'No source text loaded.')
      }

      createRoot(document.getElementById('root')).render(createElement(TestHarness))
    `,
  )

  const bundle = await build({
    absWorkingDir: repoRoot,
    bundle: true,
    define: {
      'process.env.NODE_ENV': '"test"',
    },
    entryPoints: [entryPath],
    format: 'iife',
    jsx: 'automatic',
    nodePaths: [path.join(repoRoot, 'node_modules')],
    platform: 'browser',
    plugins: [
      {
        name: 'ask-kilian-action-stub',
        setup(buildApi) {
          buildApi.onResolve({ filter: /^@\/app\/admin\/ask-kilian\/actions$/ }, () => ({
            path: actionsPath,
          }))
        },
      },
    ],
    write: false,
  })

  return `<!doctype html><html><body><div id="root"></div><script>${bundle.outputFiles[0]?.text ?? ''}</script></body></html>`
}

async function openWorkspaceHookPage(page: Page, html: string) {
  await page.route('https://kil.test/admin/ask-kilian-hook', route =>
    route.fulfill({ body: html, contentType: 'text/html' }),
  )
  await page.goto('https://kil.test/admin/ask-kilian-hook')
  await page.waitForFunction(() => Boolean((globalThis as WorkspaceHarnessGlobal).askKilianWorkspace))
}

describe('useAskKilianAdminWorkspace', () => {
  it('loads full detail for the initially selected entry', async () => {
    const html = await buildWorkspaceHookTestPage()
    const browser = await chromium.launch()
    const page = await browser.newPage()

    try {
      await openWorkspaceHookPage(page, html)
      await page.waitForFunction(
        () => (globalThis as WorkspaceHarnessGlobal).askKilianActionMocks.detailResolvers.length === 1,
      )

      await page.evaluate(() => {
        ;(globalThis as WorkspaceHarnessGlobal).askKilianActionMocks.detailResolvers.shift()?.({
          stableKey: 'admin:manual',
          source: 'admin',
          status: 'active',
          category: 'fun',
          title: 'Manual entry',
          sourcePath: 'admin:/admin/ask-kilian',
          contentHash: 'hash-manual',
          minTier: 0,
          spoilerLevel: 'none',
          importance: 0.7,
          updatedAt: 200,
          text: 'Initial full detail text',
        })
      })

      await page.waitForFunction(
        () =>
          (globalThis as WorkspaceHarnessGlobal).askKilianWorkspace.selectedDetail?.text === 'Initial full detail text',
      )
    } finally {
      await page.close()
      await browser.close()
    }
  })

  it('does not let an older same-key detail response repopulate detail after refresh', async () => {
    const html = await buildWorkspaceHookTestPage()
    const browser = await chromium.launch()
    const page = await browser.newPage()

    try {
      await openWorkspaceHookPage(page, html)
      await page.waitForFunction(
        () => (globalThis as WorkspaceHarnessGlobal).askKilianActionMocks.detailResolvers.length === 1,
      )

      await page.evaluate(() => {
        ;(globalThis as WorkspaceHarnessGlobal).askKilianWorkspace.actions.refresh()
      })
      await page.waitForFunction(
        () =>
          (globalThis as WorkspaceHarnessGlobal).askKilianWorkspace.selectedEntry?.title === 'Manual entry refreshed',
      )

      await page.evaluate(() => {
        const globalScope = globalThis as WorkspaceHarnessGlobal
        globalScope.askKilianActionMocks.detailResolvers.shift()?.({
          ...globalScope.askKilianActionMocks.nextState.entries[0],
          text: 'Stale detail text from before refresh',
        })
      })

      await page.waitForTimeout(0)
      await expect(
        page.evaluate(() => (globalThis as WorkspaceHarnessGlobal).askKilianWorkspace.selectedDetail?.text),
      ).resolves.toBeUndefined()
    } finally {
      await page.close()
      await browser.close()
    }
  })

  it('does not discard the first retrieval result when a duplicate submit is blocked', async () => {
    const html = await buildWorkspaceHookTestPage()
    const browser = await chromium.launch()
    const page = await browser.newPage()

    try {
      await openWorkspaceHookPage(page, html)
      await page.evaluate(() => {
        const input = { prompt: 'pets', tier: 0, includeSpoilers: false, categories: [], limit: 4 }
        const workspace = (globalThis as WorkspaceHarnessGlobal).askKilianWorkspace
        workspace.actions.previewRetrieval(input)
        workspace.actions.previewRetrieval(input)
      })
      await page.waitForFunction(
        () => (globalThis as WorkspaceHarnessGlobal).askKilianActionMocks.retrievalResolvers.length === 1,
      )

      await page.evaluate(() => {
        ;(globalThis as WorkspaceHarnessGlobal).askKilianActionMocks.retrievalResolvers.shift()?.({
          results: [
            { stableKey: 'admin:manual', title: 'Manual entry', category: 'fun', score: 1, text: 'Result text' },
          ],
          contextPreview: 'Context preview',
        })
      })

      await page.waitForFunction(
        () =>
          (globalThis as WorkspaceHarnessGlobal).askKilianWorkspace.retrievalPreview?.contextPreview ===
          'Context preview',
      )
      await expect(
        page.evaluate(
          () => (globalThis as WorkspaceHarnessGlobal).askKilianWorkspace.retrievalPreview?.results?.length,
        ),
      ).resolves.toBe(1)
    } finally {
      await page.close()
      await browser.close()
    }
  })
})
