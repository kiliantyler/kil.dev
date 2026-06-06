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
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { api } from '../../../../convex/_generated/api'

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
  return {
    entries: [],
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
  return client.action(api.askKilianKnowledge.diffRepoKnowledgeForAdmin, {
    entries: buildAskKilianKnowledgeEntries(),
    isFullManifest: true,
  })
}

export async function applyAskKilianRepoSyncAction() {
  const client = await createAskKilianConvexServerClient()
  const sync = await client.action(api.askKilianKnowledge.syncRepoKnowledgeForAdmin, {
    entries: buildAskKilianKnowledgeEntries(),
    dryRun: false,
    isFullManifest: true,
  })
  revalidatePath('/admin/ask-kilian')
  return { sync, state: await getAskKilianAdminWorkspaceStateAction() }
}

export async function previewAskKilianRetrievalAction(input: {
  prompt: string
  tier: AskKilianTier
  includeSpoilers: boolean
  categories: AskKilianKnowledgeCategory[]
  limit: number
}) {
  const client = await createAskKilianConvexServerClient()
  const results = await client.action(api.askKilianKnowledge.searchKnowledgeForAdmin, {
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
