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
    chatResolvers: Array<(value: unknown) => void>
    repoSyncApplyCalls: string[]
    repoSyncPreviewResolvers: Array<(value: unknown) => void>
    retrievalResolvers: Array<(value: unknown) => void>
    saveResolvers: Array<(value: unknown) => void>
    nextState: { entries: Array<Record<string, unknown>> }
  }
  askKilianWorkspace: {
    selectedDetail?: { text?: string }
    selectedEntry?: { title?: string }
    syncPreview?: { confirmationToken?: string }
    syncPreviewStale?: boolean
    retrievalPreview?: { contextPreview?: string; results?: unknown[] }
    chatError?: string | null
    chatResponse?: { text?: string; diagnostics?: { promptRevisionId?: string } }
    actions: {
      applyRepoSync: () => void
      generateChat: (input: {
        messages: Array<{ role: string; content: string }>
        tier: number
        includeSpoilers: boolean
        categories: string[]
      }) => void
      loadEntryDetail: (stableKey: string) => Promise<unknown>
      previewRepoSync: () => void
      previewRetrieval: (input: {
        prompt: string
        tier: number
        includeSpoilers: boolean
        categories: string[]
        limit: number
      }) => void
      refresh: () => void
      saveEntry: (input: Record<string, unknown>) => Promise<unknown>
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
      const chatResolvers = []
      const repoSyncPreviewResolvers = []
      const repoSyncApplyCalls = []
      const retrievalResolvers = []
      const saveResolvers = []

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
        chatResolvers,
        repoSyncApplyCalls,
        repoSyncPreviewResolvers,
        retrievalResolvers,
        saveResolvers,
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

      export async function generateAskKilianChatAction() {
        return new Promise(resolve => chatResolvers.push(resolve))
      }

      export async function previewAskKilianRetrievalAction() {
        return new Promise(resolve => retrievalResolvers.push(resolve))
      }

      export async function applyAskKilianRepoSyncAction(confirmationToken) {
        repoSyncApplyCalls.push(confirmationToken)
        return {
          sync: {
            dryRun: false,
            confirmationToken: 'applied-token',
            counts: { created: 0, changed: 0, unchanged: 1, retired: 0, ignoredAdmin: 0 },
            keys: { created: [], changed: [], unchanged: ['admin:manual'], retired: [], ignoredAdmin: [] },
          },
          state: globalThis.askKilianActionMocks.nextState,
        }
      }

      export async function disableAskKilianAdminEntryAction() {
        throw new Error('not used')
      }

      export async function previewAskKilianRepoSyncAction() {
        return new Promise(resolve => repoSyncPreviewResolvers.push(resolve))
      }

      export async function reenableAskKilianAdminEntryAction() {
        throw new Error('not used')
      }

      export async function saveAskKilianAdminEntryAction() {
        return new Promise(resolve => saveResolvers.push(resolve))
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

  it('stores the latest generated chat response and diagnostics', async () => {
    const html = await buildWorkspaceHookTestPage()
    const browser = await chromium.launch()
    const page = await browser.newPage()

    try {
      await openWorkspaceHookPage(page, html)
      await page.evaluate(() => {
        ;(globalThis as WorkspaceHarnessGlobal).askKilianWorkspace.actions.generateChat({
          messages: [{ role: 'user', content: 'What did Kilian build?' }],
          tier: 2,
          includeSpoilers: true,
          categories: ['projects'],
        })
      })
      await page.waitForFunction(
        () => (globalThis as WorkspaceHarnessGlobal).askKilianActionMocks.chatResolvers.length === 1,
      )

      await page.evaluate(() => {
        ;(globalThis as WorkspaceHarnessGlobal).askKilianActionMocks.chatResolvers.shift()?.({
          ok: true,
          traceId: 'trace-1',
          text: 'Kilian built kil.dev.',
          diagnostics: { promptRevisionId: 'prompt-1' },
        })
      })

      await page.waitForFunction(
        () => (globalThis as WorkspaceHarnessGlobal).askKilianWorkspace.chatResponse?.text === 'Kilian built kil.dev.',
      )
      await expect(
        page.evaluate(
          () => (globalThis as WorkspaceHarnessGlobal).askKilianWorkspace.chatResponse?.diagnostics?.promptRevisionId,
        ),
      ).resolves.toBe('prompt-1')
      await expect(
        page.evaluate(() => (globalThis as WorkspaceHarnessGlobal).askKilianWorkspace.chatError),
      ).resolves.toBeNull()
    } finally {
      await page.close()
      await browser.close()
    }
  })

  it('does not let an older generated chat response overwrite a later response', async () => {
    const html = await buildWorkspaceHookTestPage()
    const browser = await chromium.launch()
    const page = await browser.newPage()

    try {
      await openWorkspaceHookPage(page, html)
      await page.evaluate(() => {
        const workspace = (globalThis as WorkspaceHarnessGlobal).askKilianWorkspace
        workspace.actions.generateChat({
          messages: [{ role: 'user', content: 'First question?' }],
          tier: 2,
          includeSpoilers: true,
          categories: ['projects'],
        })
        workspace.actions.generateChat({
          messages: [{ role: 'user', content: 'Second question?' }],
          tier: 2,
          includeSpoilers: true,
          categories: ['projects'],
        })
      })
      await page.waitForFunction(
        () => (globalThis as WorkspaceHarnessGlobal).askKilianActionMocks.chatResolvers.length === 2,
      )

      await page.evaluate(() => {
        const resolvers = (globalThis as WorkspaceHarnessGlobal).askKilianActionMocks.chatResolvers
        resolvers[1]?.({
          ok: true,
          traceId: 'trace-new',
          text: 'Latest generated response.',
          diagnostics: { promptRevisionId: 'prompt-new' },
        })
      })
      await page.waitForFunction(
        () =>
          (globalThis as WorkspaceHarnessGlobal).askKilianWorkspace.chatResponse?.text === 'Latest generated response.',
      )

      await page.evaluate(() => {
        const resolvers = (globalThis as WorkspaceHarnessGlobal).askKilianActionMocks.chatResolvers
        resolvers[0]?.({
          ok: true,
          traceId: 'trace-old',
          text: 'Stale generated response.',
          diagnostics: { promptRevisionId: 'prompt-old' },
        })
      })
      await page.waitForTimeout(0)

      await expect(
        page.evaluate(() => (globalThis as WorkspaceHarnessGlobal).askKilianWorkspace.chatResponse?.text),
      ).resolves.toBe('Latest generated response.')
      await expect(
        page.evaluate(
          () => (globalThis as WorkspaceHarnessGlobal).askKilianWorkspace.chatResponse?.diagnostics?.promptRevisionId,
        ),
      ).resolves.toBe('prompt-new')
    } finally {
      await page.close()
      await browser.close()
    }
  })

  it('marks a repo sync preview stale after an admin save and blocks apply', async () => {
    const html = await buildWorkspaceHookTestPage()
    const browser = await chromium.launch()
    const page = await browser.newPage()

    try {
      await openWorkspaceHookPage(page, html)
      await page.evaluate(() => {
        ;(globalThis as WorkspaceHarnessGlobal).askKilianWorkspace.actions.previewRepoSync()
      })
      await page.waitForFunction(
        () => (globalThis as WorkspaceHarnessGlobal).askKilianActionMocks.repoSyncPreviewResolvers.length === 1,
      )

      await page.evaluate(() => {
        ;(globalThis as WorkspaceHarnessGlobal).askKilianActionMocks.repoSyncPreviewResolvers.shift()?.({
          dryRun: true,
          confirmationToken: 'preview-token',
          counts: { created: 0, changed: 0, unchanged: 1, retired: 0, ignoredAdmin: 0 },
          keys: { created: [], changed: [], unchanged: ['admin:manual'], retired: [], ignoredAdmin: [] },
        })
      })

      await page.waitForFunction(
        () =>
          (globalThis as WorkspaceHarnessGlobal).askKilianWorkspace.syncPreview?.confirmationToken ===
            'preview-token' && (globalThis as WorkspaceHarnessGlobal).askKilianWorkspace.syncPreviewStale === false,
      )

      await page.evaluate(() => {
        void (globalThis as WorkspaceHarnessGlobal).askKilianWorkspace.actions.saveEntry({
          mode: 'edit',
          originalStableKey: 'admin:manual',
          currentStatus: 'active',
          slug: 'manual',
          category: 'fun',
          title: 'Manual entry updated',
          text: 'Updated full detail text',
          minTier: 0,
          spoilerLevel: 'none',
          importance: 0.4,
        })
      })
      await page.waitForFunction(
        () => (globalThis as WorkspaceHarnessGlobal).askKilianActionMocks.saveResolvers.length === 1,
      )

      await page.evaluate(() => {
        const globalScope = globalThis as WorkspaceHarnessGlobal
        globalScope.askKilianActionMocks.saveResolvers.shift()?.({
          ...globalScope.askKilianActionMocks.nextState,
          entries: [
            ...globalScope.askKilianActionMocks.nextState.entries,
            {
              stableKey: 'admin:second-manual-entry',
              source: 'admin',
              status: 'active',
              category: 'fun',
              title: 'Second manual entry',
              sourcePath: 'admin:/admin/ask-kilian',
              contentHash: 'hash-second',
              minTier: 0,
              spoilerLevel: 'none',
              importance: 0.4,
              updatedAt: 400,
              textSummary: 'Second manual entry summary',
            },
          ],
        })
      })

      await page.waitForFunction(
        () => (globalThis as WorkspaceHarnessGlobal).askKilianWorkspace.syncPreviewStale === true,
      )
      await page.evaluate(() => {
        ;(globalThis as WorkspaceHarnessGlobal).askKilianWorkspace.actions.applyRepoSync()
      })
      await page.waitForTimeout(0)

      await expect(
        page.evaluate(() => (globalThis as WorkspaceHarnessGlobal).askKilianActionMocks.repoSyncApplyCalls),
      ).resolves.toEqual([])
    } finally {
      await page.close()
      await browser.close()
    }
  })

  it('applies a fresh repo sync preview when it has repo changes', async () => {
    const html = await buildWorkspaceHookTestPage()
    const browser = await chromium.launch()
    const page = await browser.newPage()

    try {
      await openWorkspaceHookPage(page, html)
      await page.evaluate(() => {
        ;(globalThis as WorkspaceHarnessGlobal).askKilianWorkspace.actions.previewRepoSync()
      })
      await page.waitForFunction(
        () => (globalThis as WorkspaceHarnessGlobal).askKilianActionMocks.repoSyncPreviewResolvers.length === 1,
      )

      await page.evaluate(() => {
        ;(globalThis as WorkspaceHarnessGlobal).askKilianActionMocks.repoSyncPreviewResolvers.shift()?.({
          dryRun: true,
          confirmationToken: 'preview-token',
          counts: { created: 1, changed: 1, unchanged: 0, retired: 1, ignoredAdmin: 0 },
          keys: {
            created: ['repo:new-entry'],
            changed: ['repo:changed-entry'],
            unchanged: [],
            retired: ['repo:retired-entry'],
            ignoredAdmin: [],
          },
        })
      })

      await page.waitForFunction(
        () =>
          (globalThis as WorkspaceHarnessGlobal).askKilianWorkspace.syncPreview?.confirmationToken ===
            'preview-token' && (globalThis as WorkspaceHarnessGlobal).askKilianWorkspace.syncPreviewStale === false,
      )
      await page.evaluate(() => {
        ;(globalThis as WorkspaceHarnessGlobal).askKilianWorkspace.actions.applyRepoSync()
      })
      await page.waitForFunction(() => {
        const globalScope = globalThis as WorkspaceHarnessGlobal

        return (
          globalScope.askKilianActionMocks.repoSyncApplyCalls.length === 1 &&
          globalScope.askKilianWorkspace.syncPreview?.confirmationToken === 'applied-token' &&
          globalScope.askKilianWorkspace.syncPreviewStale === true
        )
      })

      await expect(
        page.evaluate(() => (globalThis as WorkspaceHarnessGlobal).askKilianActionMocks.repoSyncApplyCalls),
      ).resolves.toEqual(['preview-token'])
      await expect(
        page.evaluate(() => (globalThis as WorkspaceHarnessGlobal).askKilianWorkspace.syncPreview?.confirmationToken),
      ).resolves.toBe('applied-token')
      await expect(
        page.evaluate(() => (globalThis as WorkspaceHarnessGlobal).askKilianWorkspace.syncPreviewStale),
      ).resolves.toBe(true)
    } finally {
      await page.close()
      await browser.close()
    }
  })

  it('blocks repo sync apply when the preview has no repo changes', async () => {
    const html = await buildWorkspaceHookTestPage()
    const browser = await chromium.launch()
    const page = await browser.newPage()

    try {
      await openWorkspaceHookPage(page, html)
      await page.evaluate(() => {
        ;(globalThis as WorkspaceHarnessGlobal).askKilianWorkspace.actions.previewRepoSync()
      })
      await page.waitForFunction(
        () => (globalThis as WorkspaceHarnessGlobal).askKilianActionMocks.repoSyncPreviewResolvers.length === 1,
      )

      await page.evaluate(() => {
        ;(globalThis as WorkspaceHarnessGlobal).askKilianActionMocks.repoSyncPreviewResolvers.shift()?.({
          dryRun: true,
          confirmationToken: 'preview-token',
          counts: { created: 0, changed: 0, unchanged: 1, retired: 0, ignoredAdmin: 1 },
          keys: {
            created: [],
            changed: [],
            unchanged: ['admin:manual'],
            retired: [],
            ignoredAdmin: ['admin:manual-ignored'],
          },
        })
      })

      await page.waitForFunction(
        () =>
          (globalThis as WorkspaceHarnessGlobal).askKilianWorkspace.syncPreview?.confirmationToken ===
            'preview-token' && (globalThis as WorkspaceHarnessGlobal).askKilianWorkspace.syncPreviewStale === false,
      )
      await page.evaluate(() => {
        ;(globalThis as WorkspaceHarnessGlobal).askKilianWorkspace.actions.applyRepoSync()
      })
      await page.waitForFunction(
        () => (globalThis as WorkspaceHarnessGlobal).askKilianWorkspace.syncPreviewStale === true,
      )

      await expect(
        page.evaluate(() => (globalThis as WorkspaceHarnessGlobal).askKilianActionMocks.repoSyncApplyCalls),
      ).resolves.toEqual([])
    } finally {
      await page.close()
      await browser.close()
    }
  })
})
