'use server'

import {
  ADMIN_TEST_BYPASS_COOKIE,
  ADMIN_TEST_BYPASS_COOKIE_VALUE,
  isAdminTestBypassEnvEnabled,
} from '@/lib/admin-test-bypass'
import { buildAskKilianAdminContextPreview } from '@/lib/ask-kilian/admin-context-preview'
import {
  assertAdminCreateDoesNotCollide,
  assertAdminEditStableKeyAllowed,
  buildAdminKnowledgeEntry,
  type AdminKnowledgeEntrySaveInput,
  type AskKilianAdminStatus,
  type AskKilianAdminWorkspaceState,
} from '@/lib/ask-kilian/admin-workspace'
import { createAskKilianConvexServerClient } from '@/lib/ask-kilian/convex-server-client'
import { buildAskKilianKnowledgeEntries } from '@/lib/ask-kilian/knowledge-sources'
import type { AskKilianKnowledgeCategory, AskKilianTier } from '@/lib/ask-kilian/types'
import { stableStringify } from '@/utils/stable-stringify'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { createHash } from 'node:crypto'
import { api } from '../../../../convex/_generated/api'

type AskKilianRepoSyncSummary = {
  dryRun: boolean
  counts: {
    created: number
    changed: number
    unchanged: number
    retired: number
    ignoredAdmin: number
  }
  keys: {
    created: string[]
    changed: string[]
    unchanged: string[]
    retired: string[]
    ignoredAdmin: string[]
  }
}

export type AskKilianRepoSyncPreview = AskKilianRepoSyncSummary & {
  confirmationToken: string
}

function toStatus(label: 'Runtime' | 'RAG', error: unknown): AskKilianAdminStatus {
  return {
    label,
    level: 'unavailable',
    reason: error instanceof Error ? error.message : `${label} unavailable`,
    checkedAt: Date.now(),
  }
}

function summarizeRagStatus(entries: AskKilianAdminWorkspaceState['entries']): AskKilianAdminStatus {
  const active = entries.filter(entry => entry.status === 'active')
  const pending = active.filter(entry => entry.ragStatus !== 'ready')
  if (active.length === 0) {
    return { label: 'RAG', level: 'degraded', reason: 'RAG has no active entries', checkedAt: Date.now() }
  }
  if (pending.length > 0) {
    return {
      label: 'RAG',
      level: 'degraded',
      reason: `${pending.length} active entries are not ready`,
      checkedAt: Date.now(),
    }
  }
  return { label: 'RAG', level: 'ready', reason: 'RAG ready', checkedAt: Date.now() }
}

async function isTestBypassRequest() {
  if (!isAdminTestBypassEnvEnabled()) return false
  const requestCookies = await cookies()
  return requestCookies.get(ADMIN_TEST_BYPASS_COOKIE)?.value === ADMIN_TEST_BYPASS_COOKIE_VALUE
}

function createTestBypassAskKilianAdminWorkspaceState(): AskKilianAdminWorkspaceState {
  const updatedAt = Date.now()
  return {
    entries: [
      {
        stableKey: 'test:public-project',
        source: 'repo',
        status: 'active',
        category: 'projects',
        title: 'Public project fixture',
        contentHash: 'test-public-project-hash',
        sourcePath: 'src/lib/ask-kilian/test-fixtures.ts',
        minTier: 0,
        spoilerLevel: 'none',
        importance: 0.8,
        updatedAt,
        ragStatus: 'ready',
      },
      {
        stableKey: 'test:access-one-note',
        source: 'repo',
        status: 'active',
        category: 'persona',
        title: 'Access one fixture',
        contentHash: 'test-access-one-note-hash',
        sourcePath: 'src/lib/ask-kilian/test-fixtures.ts',
        minTier: 1,
        spoilerLevel: 'hint',
        importance: 0.7,
        updatedAt,
        ragStatus: 'ready',
      },
      {
        stableKey: 'test:private-note',
        source: 'repo',
        status: 'active',
        category: 'fun',
        title: 'Private fixture',
        contentHash: 'test-private-note-hash',
        sourcePath: 'src/lib/ask-kilian/test-fixtures.ts',
        minTier: 2,
        spoilerLevel: 'spoiler',
        importance: 0.5,
        updatedAt,
        ragStatus: 'ready',
      },
    ],
    runtimeStatus: {
      label: 'Runtime',
      level: 'degraded',
      reason: 'Admin test bypass state',
      checkedAt: Date.now(),
    },
    ragStatus: { label: 'RAG', level: 'degraded', reason: 'Admin test bypass state', checkedAt: Date.now() },
  }
}

export async function getAskKilianAdminWorkspaceStateAction(): Promise<AskKilianAdminWorkspaceState> {
  if (await isTestBypassRequest()) return createTestBypassAskKilianAdminWorkspaceState()

  const client = await createAskKilianConvexServerClient()
  let runtimeStatus: AskKilianAdminStatus
  try {
    await client.action(api.askKilianKnowledge.verifyRuntimeEnvForAdmin, {})
    runtimeStatus = { label: 'Runtime', level: 'ready', reason: 'Runtime ready', checkedAt: Date.now() }
  } catch (error) {
    runtimeStatus = toStatus('Runtime', error)
  }
  const entries = await client.action(api.askKilianKnowledge.listAdminKnowledgeEntriesForAdmin, {})
  return {
    entries,
    selectedStableKey: entries[0]?.stableKey,
    runtimeStatus,
    ragStatus:
      runtimeStatus.level === 'unavailable'
        ? toStatus('RAG', new Error('Runtime unavailable'))
        : summarizeRagStatus(entries),
  }
}

export async function getAskKilianKnowledgeEntryAction(stableKey: string) {
  const client = await createAskKilianConvexServerClient()
  return client.action(api.askKilianKnowledge.getAdminKnowledgeEntryForAdmin, { stableKey })
}

export async function saveAskKilianAdminEntryAction(input: AdminKnowledgeEntrySaveInput) {
  const state = await getAskKilianAdminWorkspaceStateAction()
  const existingStableKeys = new Set(state.entries.map(entry => entry.stableKey))
  if (input.mode === 'create') assertAdminCreateDoesNotCollide(input, existingStableKeys)
  else assertAdminEditStableKeyAllowed(input, existingStableKeys)
  const entry = buildAdminKnowledgeEntry(input)
  const client = await createAskKilianConvexServerClient()
  await client.action(api.askKilianKnowledge.saveAdminKnowledgeEntryForAdmin, {
    entry,
    originalStableKey: input.mode === 'edit' ? input.originalStableKey : undefined,
  })
  revalidatePath('/admin/ask-kilian')
  return getAskKilianAdminWorkspaceStateAction()
}

export async function disableAskKilianAdminEntryAction(stableKey: string) {
  const client = await createAskKilianConvexServerClient()
  await client.action(api.askKilianKnowledge.disableAdminKnowledgeEntryForAdmin, { stableKey })
  revalidatePath('/admin/ask-kilian')
  return getAskKilianAdminWorkspaceStateAction()
}

export async function reenableAskKilianAdminEntryAction(stableKey: string) {
  const client = await createAskKilianConvexServerClient()
  await client.action(api.askKilianKnowledge.reenableAdminKnowledgeEntryForAdmin, { stableKey })
  revalidatePath('/admin/ask-kilian')
  return getAskKilianAdminWorkspaceStateAction()
}

export async function previewAskKilianRepoSyncAction() {
  const client = await createAskKilianConvexServerClient()
  const entries = buildAskKilianKnowledgeEntries()
  const summary = await client.action(api.askKilianKnowledge.diffRepoKnowledgeForAdmin, {
    entries,
    isFullManifest: true,
  })
  return attachRepoSyncConfirmationToken(summary, entries)
}

function buildRepoSyncConfirmationToken(
  summary: AskKilianRepoSyncSummary,
  entries: ReturnType<typeof buildAskKilianKnowledgeEntries>,
) {
  return createHash('sha256')
    .update(
      stableStringify({
        counts: summary.counts,
        keys: summary.keys,
        manifest: entries.map(entry => ({
          stableKey: entry.stableKey,
          contentHash: entry.contentHash,
          status: entry.status,
        })),
      }),
    )
    .digest('hex')
}

function attachRepoSyncConfirmationToken(
  summary: AskKilianRepoSyncSummary,
  entries: ReturnType<typeof buildAskKilianKnowledgeEntries>,
): AskKilianRepoSyncPreview {
  return {
    ...summary,
    confirmationToken: buildRepoSyncConfirmationToken(summary, entries),
  }
}

export async function applyAskKilianRepoSyncAction(confirmationToken: string) {
  if (!confirmationToken) throw new Error('Preview repo sync before applying changes.')

  const client = await createAskKilianConvexServerClient()
  const entries = buildAskKilianKnowledgeEntries()
  const currentSummary = await client.action(api.askKilianKnowledge.diffRepoKnowledgeForAdmin, {
    entries,
    isFullManifest: true,
  })
  const currentPreview = attachRepoSyncConfirmationToken(currentSummary, entries)
  if (currentPreview.confirmationToken !== confirmationToken) {
    throw new Error('Repo sync preview is stale. Preview again before applying changes.')
  }

  const sync = await client.action(api.askKilianKnowledge.syncRepoKnowledgeForAdmin, {
    entries,
    dryRun: false,
    isFullManifest: true,
  })
  revalidatePath('/admin/ask-kilian')
  return { sync: attachRepoSyncConfirmationToken(sync, entries), state: await getAskKilianAdminWorkspaceStateAction() }
}

export async function previewAskKilianRetrievalAction(input: {
  prompt: string
  tier: AskKilianTier
  includeSpoilers: boolean
  categories: AskKilianKnowledgeCategory[]
  limit: number
}) {
  const client = await createAskKilianConvexServerClient()
  const results = await client.action(api.askKilianKnowledge.previewKnowledgeForAdmin, {
    query: input.prompt,
    tier: input.tier,
    includeSpoilers: input.includeSpoilers,
    categories: input.categories,
    limit: input.limit,
  })
  return {
    results,
    contextPreview: buildAskKilianAdminContextPreview({ ...input, results }),
  }
}
