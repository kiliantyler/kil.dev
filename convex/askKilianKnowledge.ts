import { v } from 'convex/values'

import type { EntryId } from '@convex-dev/rag'
import type { Infer } from 'convex/values'
import type { AskKilianKnowledgeCategory, AskKilianKnowledgeEntry, AskKilianTier } from '../src/lib/ask-kilian/types'
import { isPlaceholderSecret } from '../src/lib/env-secrets'
import { internal } from './_generated/api'
import { action, internalAction, internalMutation, internalQuery, type ActionCtx } from './_generated/server'
import { ASK_KILIAN_NAMESPACE, askKilianRag, resolveGatewayProjectId } from './askKilianRag'
import {
  ASK_KILIAN_RAG_FILTER_VERSION,
  askKilianAdminMutationResultValidator,
  askKilianCategoryValidator,
  askKilianKnowledgeEntryCoreFields,
  askKilianKnowledgeEntryDisplayValidator,
  askKilianKnowledgeEntryInputValidator,
  askKilianRagFilterVersionValidator,
  askKilianStatusValidator,
  askKilianTierValidator,
} from './askKilianValidators'
import { getAuthKit } from './auth'

export type { AskKilianKnowledgeEntry } from '../src/lib/ask-kilian/types'

export type ExistingKnowledgeEntry = AskKilianKnowledgeEntry & {
  ragEntryId?: string
  ragStatus?: string
  ragFilterVersion?: number
  pendingRagEntryCleanupIds?: string[]
}

type SearchableKnowledgeEntry = AskKilianKnowledgeEntry & {
  ragEntryId?: string
  ragStatus?: string
  ragFilterVersion?: number
  pendingRagEntryCleanupIds?: string[]
  createdAt?: number
  updatedAt?: number
  retiredAt?: number
}

type StoredKnowledgeEntry = SearchableKnowledgeEntry & {
  updatedAt: number
}

type RagSearchEntry = {
  key?: string
  metadata?: Record<string, unknown>
  text?: string
  score?: number
  entryId?: string
}

type SyncableKnowledgeEntry = AskKilianKnowledgeEntry & {
  previousRagEntryId?: string
  previousRagFilterVersion?: number
}

type AskKilianAdminContext = ActionCtx

type AuthKitUser = {
  id?: string
  email?: string | null
  firstName?: string | null
  lastName?: string | null
  name?: string | null
}

type AskKilianKnowledgeEntryDisplay = Infer<typeof askKilianKnowledgeEntryDisplayValidator>
type AskKilianAdminMutationResult = Infer<typeof askKilianAdminMutationResultValidator>

const syncSummaryValidator = v.object({
  dryRun: v.boolean(),
  counts: v.object({
    created: v.number(),
    changed: v.number(),
    unchanged: v.number(),
    retired: v.number(),
    ignoredAdmin: v.number(),
  }),
  keys: v.object({
    created: v.array(v.string()),
    changed: v.array(v.string()),
    unchanged: v.array(v.string()),
    retired: v.array(v.string()),
    ignoredAdmin: v.array(v.string()),
  }),
})
export type SyncSummary = Infer<typeof syncSummaryValidator>

const knowledgeEntryWithoutTextValidator = v.object({
  ...askKilianKnowledgeEntryCoreFields,
  text: v.optional(v.string()),
  ragEntryId: v.optional(v.string()),
  ragStatus: v.optional(v.string()),
  ragFilterVersion: v.optional(askKilianRagFilterVersionValidator),
  pendingRagEntryCleanupIds: v.optional(v.array(v.string())),
  createdAt: v.optional(v.number()),
  updatedAt: v.number(),
  retiredAt: v.optional(v.number()),
})

const knowledgeEntryWithTextValidator = v.object({
  ...askKilianKnowledgeEntryCoreFields,
  ragEntryId: v.optional(v.string()),
  ragStatus: v.optional(v.string()),
  ragFilterVersion: v.optional(askKilianRagFilterVersionValidator),
  pendingRagEntryCleanupIds: v.optional(v.array(v.string())),
  createdAt: v.optional(v.number()),
  updatedAt: v.number(),
  retiredAt: v.optional(v.number()),
})

const searchResultValidator = v.object({
  stableKey: v.string(),
  title: v.string(),
  category: askKilianCategoryValidator,
  score: v.number(),
  text: v.string(),
})

const runtimeEnvStatusValidator = v.object({
  ok: v.boolean(),
  aiGatewayConfigured: v.boolean(),
  accessTokenConfigured: v.boolean(),
})
export type AskKilianRuntimeEnvStatus = Infer<typeof runtimeEnvStatusValidator>

const MAX_SEARCH_QUERY_LENGTH = 1000
const MAX_SEARCH_CATEGORIES = 9
const MAX_SEARCH_RESULT_LIMIT = 12
const SEARCH_OVERFETCH_MULTIPLIER = 3
const MAX_RAG_SEARCH_LIMIT = MAX_SEARCH_RESULT_LIMIT * SEARCH_OVERFETCH_MULTIPLIER
const MAX_SEARCH_RESULT_TEXT_LENGTH = 1600
const MIN_FULL_MANIFEST_ENTRY_COUNT = 10
const LEXICAL_MATCH_SCORE = 0.82
const LEXICAL_STOP_WORDS = new Set([
  'about',
  'answer',
  'did',
  'does',
  'fact',
  'facts',
  'for',
  'kilian',
  'private',
  'should',
  'the',
  'use',
  'used',
  'what',
])

function categoryStatusFilterValue(category: AskKilianKnowledgeCategory) {
  return `${category}:active`
}

function requireMatchingAskKilianAccessToken(accessToken: string) {
  const configuredToken = process.env.ASK_KILIAN_CONVEX_ACCESS_TOKEN?.trim()
  if (!configuredToken) {
    throw new Error('Missing ASK_KILIAN_CONVEX_ACCESS_TOKEN for Ask Kilian server actions')
  }
  if (isPlaceholderSecret(configuredToken)) {
    throw new Error('Replace placeholder ASK_KILIAN_CONVEX_ACCESS_TOKEN for Ask Kilian server actions')
  }
  if (!accessToken.trim() || accessToken.trim() !== configuredToken) {
    throw new Error('Invalid Ask Kilian server action access token')
  }
}

function requireAskKilianAiGatewayApiKey() {
  const apiKey = process.env.AI_GATEWAY_API_KEY?.trim()
  if (!apiKey) {
    throw new Error('Missing AI_GATEWAY_API_KEY for Ask Kilian runtime verification')
  }
  if (isPlaceholderSecret(apiKey)) {
    throw new Error('Replace placeholder AI_GATEWAY_API_KEY for Ask Kilian runtime verification')
  }
  if (!resolveGatewayProjectId()) {
    throw new Error('Missing VERCEL_PROJECT_ID for Ask Kilian Gateway project attribution')
  }
}

function normalizeEmail(value: string | null | undefined) {
  const trimmed = value?.trim().toLowerCase()
  return trimmed || null
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null
}

function readWorkOSOrgId(identity: Record<string, unknown>): string | null {
  for (const key of ['organizationId', 'org_id', 'https://api.workos.com/organization_id']) {
    const value = identity[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }

  const token = asRecord(identity.token)
  const claims = asRecord(token?.claims)
  const tokenOrgId = claims?.org_id
  return typeof tokenOrgId === 'string' && tokenOrgId.trim() ? tokenOrgId.trim() : null
}

async function readAuthKitUser(ctx: AskKilianAdminContext): Promise<AuthKitUser> {
  return (await getAuthKit().getAuthUser(ctx as never)) as AuthKitUser
}

export async function requireAskKilianAdmin(ctx: AskKilianAdminContext) {
  const configuredEmail = normalizeEmail(process.env.PET_GALLERY_ADMIN_EMAIL)
  const configuredOrgId = process.env.PET_GALLERY_WORKOS_ORG_ID?.trim()

  if (!configuredEmail || !configuredOrgId) {
    throw new Error('Ask Kilian admin access denied')
  }

  const identity = await ctx.auth.getUserIdentity()
  const identityRecord = asRecord(identity)
  const workosOrgId = identityRecord ? readWorkOSOrgId(identityRecord) : null
  const subject = typeof identityRecord?.subject === 'string' ? identityRecord.subject.trim() : ''
  const authUser = identityRecord && subject ? await readAuthKitUser(ctx) : null
  const email = normalizeEmail(authUser?.email)

  if (
    !identityRecord ||
    !authUser ||
    authUser.id !== subject ||
    !email ||
    !subject ||
    email !== configuredEmail ||
    workosOrgId !== configuredOrgId
  ) {
    throw new Error('Ask Kilian admin access denied')
  }

  return { workosUserId: subject, workosOrgId, email }
}

function isRagStatusReady(status: string | undefined) {
  return status === 'ready'
}

function normalizeSearchQuery(query: string) {
  return query.trim().slice(0, MAX_SEARCH_QUERY_LENGTH)
}

function normalizeSearchCategories(categories: readonly AskKilianKnowledgeCategory[] = []) {
  return [...new Set(categories)].slice(0, MAX_SEARCH_CATEGORIES)
}

function normalizeSearchLimit(limit: number | undefined) {
  const normalized = Math.trunc(Number.isFinite(limit ?? 8) ? (limit ?? 8) : 8)
  return Math.max(1, Math.min(normalized, MAX_SEARCH_RESULT_LIMIT))
}

function getRagSearchLimit(resultLimit: number) {
  return Math.min(resultLimit * SEARCH_OVERFETCH_MULTIPLIER, MAX_RAG_SEARCH_LIMIT)
}

function capSearchResultText(text: string) {
  return text.slice(0, MAX_SEARCH_RESULT_TEXT_LENGTH)
}

function projectKnowledgeEntryWithoutText(row: StoredKnowledgeEntry) {
  return {
    stableKey: row.stableKey,
    source: row.source,
    status: row.status,
    category: row.category,
    title: row.title,
    contentHash: row.contentHash,
    sourcePath: row.sourcePath,
    minTier: row.minTier,
    spoilerLevel: row.spoilerLevel,
    importance: row.importance,
    ragEntryId: row.ragEntryId,
    ragStatus: row.ragStatus,
    ragFilterVersion: row.ragFilterVersion,
    pendingRagEntryCleanupIds: row.pendingRagEntryCleanupIds,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    retiredAt: row.retiredAt,
  }
}

function projectKnowledgeEntryWithText(row: StoredKnowledgeEntry) {
  return {
    stableKey: row.stableKey,
    source: row.source,
    status: row.status,
    category: row.category,
    title: row.title,
    text: row.text,
    contentHash: row.contentHash,
    sourcePath: row.sourcePath,
    minTier: row.minTier,
    spoilerLevel: row.spoilerLevel,
    importance: row.importance,
    ragEntryId: row.ragEntryId,
    ragStatus: row.ragStatus,
    ragFilterVersion: row.ragFilterVersion,
    pendingRagEntryCleanupIds: row.pendingRagEntryCleanupIds,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    retiredAt: row.retiredAt,
  }
}

function summarizeDiff(diff: ReturnType<typeof diffRepoKnowledgeEntries>, dryRun: boolean): SyncSummary {
  return {
    dryRun,
    counts: {
      created: diff.created.length,
      changed: diff.changed.length,
      unchanged: diff.unchanged.length,
      retired: diff.retired.length,
      ignoredAdmin: diff.ignoredAdmin.length,
    },
    keys: {
      created: diff.created.map(entry => entry.stableKey),
      changed: diff.changed.map(entry => entry.stableKey),
      unchanged: diff.unchanged.map(entry => entry.stableKey),
      retired: diff.retired.map(entry => entry.stableKey),
      ignoredAdmin: diff.ignoredAdmin.map(entry => entry.stableKey),
    },
  }
}

function diffForManifestMode(diff: ReturnType<typeof diffRepoKnowledgeEntries>, isFullManifest: boolean | undefined) {
  return isFullManifest === true ? diff : { ...diff, retired: [] }
}

function stableKeyFromRagEntry(entry: RagSearchEntry): string | undefined {
  const metadataStableKey = entry.metadata?.stableKey
  if (typeof metadataStableKey === 'string') return metadataStableKey
  return entry.key
}

function entryIdForRagDelete(entryId: string): EntryId {
  return entryId as EntryId
}

function stripSyncMetadata(entry: SyncableKnowledgeEntry): AskKilianKnowledgeEntry {
  return {
    stableKey: entry.stableKey,
    source: entry.source,
    status: entry.status,
    category: entry.category,
    title: entry.title,
    text: entry.text,
    contentHash: entry.contentHash,
    sourcePath: entry.sourcePath,
    minTier: entry.minTier,
    spoilerLevel: entry.spoilerLevel,
    importance: entry.importance,
  }
}

function shouldRewriteRagFilters(entry: SyncableKnowledgeEntry) {
  return entry.previousRagEntryId && entry.previousRagFilterVersion !== ASK_KILIAN_RAG_FILTER_VERSION
}

function contentHashForRagSync(entry: SyncableKnowledgeEntry) {
  if (!shouldRewriteRagFilters(entry)) return entry.contentHash
  return `${entry.contentHash}:rag-filter-v${ASK_KILIAN_RAG_FILTER_VERSION}`
}

function assertAdminManagedEntry(entry: AskKilianKnowledgeEntry) {
  if (entry.source !== 'admin' || !entry.stableKey.startsWith('admin:')) {
    throw new Error('Only admin: stable keys can be saved through Ask Kilian admin')
  }
  if (entry.sourcePath !== 'admin:/admin/ask-kilian') {
    throw new Error('Ask Kilian admin entries must use admin:/admin/ask-kilian as sourcePath')
  }
}

function assertAdminStableKey(stableKey: string) {
  if (!stableKey.startsWith('admin:')) {
    throw new Error('Only admin: stable keys can be changed through Ask Kilian admin')
  }
}

function uniqueCleanupIds(ids: Array<string | undefined>) {
  return [...new Set(ids.filter((id): id is string => typeof id === 'string' && id.length > 0))]
}

async function addKnowledgeEntryToRag(
  ctx: Pick<ActionCtx, 'runMutation' | 'runAction'>,
  rag: Pick<typeof askKilianRag, 'add'>,
  entry: AskKilianKnowledgeEntry,
) {
  const result = await rag.add(ctx as ActionCtx, {
    namespace: ASK_KILIAN_NAMESPACE,
    key: entry.stableKey,
    title: entry.title,
    text: entry.text,
    contentHash: contentHashForRagSync(entry),
    importance: entry.importance,
    filterValues: [
      { name: 'category', value: entry.category },
      { name: 'categoryStatus', value: categoryStatusFilterValue(entry.category) },
      { name: 'status', value: 'active' },
    ],
    metadata: {
      stableKey: entry.stableKey,
      source: entry.source,
      status: entry.status,
      category: entry.category,
      sourcePath: entry.sourcePath,
      contentHash: entry.contentHash,
      minTier: entry.minTier,
      spoilerLevel: entry.spoilerLevel,
      ragFilterVersion: ASK_KILIAN_RAG_FILTER_VERSION,
    },
  })
  if (!isRagStatusReady(result.status)) {
    throw new Error(`Ask Kilian RAG entry ${entry.stableKey} was not ready after admin save; status=${result.status}`)
  }
  return result
}

function isMissingRagEntryError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()
  return message.includes('not found') || message.includes('does not exist') || message.includes('no document')
}

async function deleteRagEntryIfPresent(rag: Pick<typeof askKilianRag, 'delete'>, ctx: ActionCtx, entryId: string) {
  try {
    await rag.delete(ctx, { entryId: entryIdForRagDelete(entryId) })
  } catch (error) {
    if (!isMissingRagEntryError(error)) throw error
  }
}

async function cleanupRagEntries(
  ctx: Pick<ActionCtx, 'runMutation' | 'runAction'>,
  rag: Pick<typeof askKilianRag, 'delete'>,
  refs: { clearPendingCleanup: Parameters<ActionCtx['runMutation']>[0] },
  stableKey: string,
  entryIds: readonly string[] = [],
) {
  for (const entryId of entryIds) {
    await deleteRagEntryIfPresent(rag, ctx as ActionCtx, entryId)
    await ctx.runMutation(refs.clearPendingCleanup, { stableKey, entryId })
  }
}

function scoreByStableKeyFromResults(
  results: Array<{ entryId: string; score: number }>,
  entries: readonly RagSearchEntry[],
) {
  const scoreByEntryId = new Map<string, number>()
  for (const result of results) {
    const existing = scoreByEntryId.get(result.entryId)
    if (existing === undefined || result.score > existing) {
      scoreByEntryId.set(result.entryId, result.score)
    }
  }

  return entries.map(entry => ({
    ...entry,
    score: entry.score ?? (entry.entryId ? scoreByEntryId.get(entry.entryId) : undefined) ?? 0,
  }))
}

function mergeRagEntriesByBestScore(entries: readonly RagSearchEntry[]) {
  const byStableKey = new Map<string, RagSearchEntry>()

  for (const entry of entries) {
    const stableKey = stableKeyFromRagEntry(entry)
    if (!stableKey) continue
    const existing = byStableKey.get(stableKey)
    if (!existing || (entry.score ?? 0) > (existing.score ?? 0)) {
      byStableKey.set(stableKey, entry)
    }
  }

  return [...byStableKey.values()].toSorted((a, b) => (b.score ?? 0) - (a.score ?? 0))
}

function normalizeLexicalText(value: string) {
  return value
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, ' ')
    .trim()
}

function lexicalSearchTokens(query: string) {
  return [
    ...new Set(
      normalizeLexicalText(query)
        .split(/\s+/)
        .filter(token => token.length >= 3 && !LEXICAL_STOP_WORDS.has(token)),
    ),
  ]
}

function scoreLexicalKnowledgeEntries(query: string, rows: readonly SearchableKnowledgeEntry[]): RagSearchEntry[] {
  const tokens = lexicalSearchTokens(query)
  if (tokens.length === 0) return []

  return rows
    .filter(row => {
      const searchableText = normalizeLexicalText(`${row.stableKey} ${row.title} ${row.text}`)
      return tokens.some(token => searchableText.includes(token))
    })
    .map(row => ({
      metadata: {
        stableKey: row.stableKey,
        contentHash: row.contentHash,
        ragFilterVersion: ASK_KILIAN_RAG_FILTER_VERSION,
      },
      text: row.text,
      score: LEXICAL_MATCH_SCORE,
    }))
}

function ragEntryMatchesCurrentRow(ragEntry: RagSearchEntry, row: SearchableKnowledgeEntry) {
  if (ragEntry.entryId && row.ragEntryId && ragEntry.entryId !== row.ragEntryId) return false
  if (typeof ragEntry.metadata?.contentHash === 'string' && ragEntry.metadata.contentHash !== row.contentHash)
    return false
  if (
    typeof ragEntry.metadata?.ragFilterVersion === 'number' &&
    ragEntry.metadata.ragFilterVersion !== ASK_KILIAN_RAG_FILTER_VERSION
  ) {
    return false
  }
  return true
}

export function diffRepoKnowledgeEntries(
  existing: readonly ExistingKnowledgeEntry[],
  incoming: readonly AskKilianKnowledgeEntry[],
) {
  const existingByKey = new Map(existing.map(entry => [entry.stableKey, entry]))
  const incomingRepoEntries = incoming.filter(entry => entry.source === 'repo')
  const incomingRepoKeys = new Set(incomingRepoEntries.map(entry => entry.stableKey))
  const created: AskKilianKnowledgeEntry[] = []
  const changed: SyncableKnowledgeEntry[] = []
  const unchanged: AskKilianKnowledgeEntry[] = []
  const retired: ExistingKnowledgeEntry[] = []
  const ignoredAdmin: ExistingKnowledgeEntry[] = []

  for (const entry of incomingRepoEntries) {
    const current = existingByKey.get(entry.stableKey)
    if (!current) {
      created.push(entry)
    } else if (current.source === 'admin') {
      continue
    } else if (
      current.contentHash !== entry.contentHash ||
      current.status !== 'active' ||
      !current.ragEntryId ||
      !isRagStatusReady(current.ragStatus) ||
      current.ragFilterVersion !== ASK_KILIAN_RAG_FILTER_VERSION
    ) {
      changed.push({
        ...entry,
        previousRagEntryId: current.ragEntryId,
        previousRagFilterVersion: current.ragFilterVersion,
      })
    } else {
      unchanged.push(entry)
    }
  }

  for (const entry of existing) {
    if (entry.source === 'admin') {
      ignoredAdmin.push(entry)
    } else if (entry.status === 'active' && !incomingRepoKeys.has(entry.stableKey)) {
      retired.push(entry)
    }
  }

  return { created, changed, unchanged, retired, ignoredAdmin }
}

export function filterSearchEntriesForTier<T extends { minTier: number; spoilerLevel: string; status: string }>(
  entries: readonly T[],
  { tier, includeSpoilers }: { tier: AskKilianTier; includeSpoilers: boolean },
) {
  return entries.filter(entry => {
    if (entry.status !== 'active') return false
    if (entry.minTier > tier) return false
    if (!includeSpoilers && entry.spoilerLevel === 'spoiler') return false
    return true
  })
}

export function shapeSearchKnowledgeResults(
  ragEntries: readonly RagSearchEntry[],
  rows: readonly SearchableKnowledgeEntry[],
  options: { tier: AskKilianTier; includeSpoilers: boolean; categories?: readonly AskKilianKnowledgeCategory[] },
) {
  const rowByKey = new Map(rows.map(row => [row.stableKey, row]))
  const categoryFilter = options.categories && options.categories.length > 0 ? new Set(options.categories) : undefined
  const rowMatchesInRagOrder: Array<SearchableKnowledgeEntry & { score: number }> = []
  const seen = new Set<string>()
  const currentRagEntries = ragEntries.filter(ragEntry => {
    const stableKey = stableKeyFromRagEntry(ragEntry)
    const row = stableKey ? rowByKey.get(stableKey) : undefined
    return row ? ragEntryMatchesCurrentRow(ragEntry, row) : false
  })

  for (const ragEntry of mergeRagEntriesByBestScore(currentRagEntries)) {
    const stableKey = stableKeyFromRagEntry(ragEntry)
    if (!stableKey || seen.has(stableKey)) continue
    seen.add(stableKey)
    const row = rowByKey.get(stableKey)
    if (!row) continue
    rowMatchesInRagOrder.push({
      ...row,
      text: capSearchResultText(ragEntry.text ?? row.text),
      score: ragEntry.score ?? 0,
    })
  }

  return filterSearchEntriesForTier(rowMatchesInRagOrder, options)
    .filter(entry => !categoryFilter || categoryFilter.has(entry.category))
    .map(entry => ({
      stableKey: entry.stableKey,
      title: entry.title,
      category: entry.category,
      score: entry.score,
      text: entry.text,
    }))
}

async function searchRagEntries(
  ctx: ActionCtx,
  args: { query: string; categories: readonly AskKilianKnowledgeCategory[]; limit: number },
  rag: Pick<typeof askKilianRag, 'search'> = askKilianRag,
) {
  const filters =
    args.categories.length > 0
      ? args.categories.map(category => ({
          name: 'categoryStatus' as const,
          value: categoryStatusFilterValue(category),
        }))
      : [{ name: 'status' as const, value: 'active' as const }]
  const ragEntries: RagSearchEntry[] = []

  const searchResults = await rag.search(ctx, {
    namespace: ASK_KILIAN_NAMESPACE,
    query: args.query,
    limit: args.limit,
    vectorScoreThreshold: 0.45,
    filters,
  })
  ragEntries.push(
    ...scoreByStableKeyFromResults(
      searchResults.results.map(result => ({ entryId: result.entryId, score: result.score })),
      searchResults.entries,
    ),
  )

  return mergeRagEntriesByBestScore(ragEntries)
}

export function createSearchKnowledgeHandler({
  rag = askKilianRag,
  refs = {
    listSearchable: internal.askKilianKnowledge.listSearchableKnowledgeEntries,
  },
}: {
  rag?: Pick<typeof askKilianRag, 'search'>
  refs?: {
    listSearchable: Parameters<ActionCtx['runQuery']>[0]
  }
} = {}) {
  return async function searchKnowledgeHandler(
    ctx: Pick<ActionCtx, 'runQuery'>,
    args: {
      query: string
      tier: AskKilianTier
      includeSpoilers?: boolean
      categories?: AskKilianKnowledgeCategory[]
      limit?: number
    },
  ) {
    const cappedLimit = normalizeSearchLimit(args.limit)
    const categories = normalizeSearchCategories(args.categories)
    const query = normalizeSearchQuery(args.query)
    if (!query) return []
    const ragEntries = await searchRagEntries(
      ctx as ActionCtx,
      { query, categories, limit: getRagSearchLimit(cappedLimit) },
      rag,
    )

    const rows = (await ctx.runQuery(refs.listSearchable, {})) as SearchableKnowledgeEntry[]
    const lexicalEntries = scoreLexicalKnowledgeEntries(query, rows)
    if (ragEntries.length === 0 && lexicalEntries.length === 0) return []

    return shapeSearchKnowledgeResults([...ragEntries, ...lexicalEntries], rows, {
      tier: args.tier,
      includeSpoilers: args.includeSpoilers ?? false,
      categories,
    }).slice(0, cappedLimit)
  }
}

export function createSyncRepoKnowledgeHandler({
  rag = askKilianRag,
  now = () => Date.now(),
  refs = {
    listExisting: internal.askKilianKnowledge.listExistingKnowledgeEntriesForSync,
    upsertSynced: internal.askKilianKnowledge.upsertSyncedKnowledgeEntry,
    markRetired: internal.askKilianKnowledge.markKnowledgeEntryRetired,
    clearPendingCleanup: internal.askKilianKnowledge.clearPendingRagEntryCleanupId,
  },
}: {
  rag?: Pick<typeof askKilianRag, 'add' | 'delete'>
  now?: () => number
  refs?: {
    listExisting: Parameters<ActionCtx['runQuery']>[0]
    upsertSynced: Parameters<ActionCtx['runMutation']>[0]
    markRetired: Parameters<ActionCtx['runMutation']>[0]
    clearPendingCleanup: Parameters<ActionCtx['runMutation']>[0]
  }
} = {}) {
  return async function syncRepoKnowledgeHandler(
    ctx: Pick<ActionCtx, 'runQuery' | 'runMutation' | 'runAction'>,
    args: { entries: AskKilianKnowledgeEntry[]; dryRun?: boolean; isFullManifest?: boolean },
  ): Promise<SyncSummary> {
    const existing = (await ctx.runQuery(refs.listExisting, {})) as ExistingKnowledgeEntry[]
    const diff = diffRepoKnowledgeEntries(existing, args.entries)
    const dryRun = args.dryRun ?? false
    if (dryRun) return summarizeDiff(diffForManifestMode(diff, args.isFullManifest), true)

    const timestamp = now()
    for (const entry of existing) {
      await cleanupRagEntries(ctx, rag, refs, entry.stableKey, entry.pendingRagEntryCleanupIds)
    }

    const entriesToSync: SyncableKnowledgeEntry[] = [...diff.created, ...diff.changed]
    for (const entry of entriesToSync) {
      const knowledgeEntry = stripSyncMetadata(entry)
      const staleFilterRagEntryId = shouldRewriteRagFilters(entry) ? entry.previousRagEntryId : undefined
      const result = await rag.add(ctx, {
        namespace: ASK_KILIAN_NAMESPACE,
        key: knowledgeEntry.stableKey,
        title: knowledgeEntry.title,
        text: knowledgeEntry.text,
        contentHash: contentHashForRagSync(entry),
        importance: knowledgeEntry.importance,
        filterValues: [
          { name: 'category', value: knowledgeEntry.category },
          { name: 'categoryStatus', value: categoryStatusFilterValue(knowledgeEntry.category) },
          { name: 'status', value: 'active' },
        ],
        metadata: {
          stableKey: knowledgeEntry.stableKey,
          source: knowledgeEntry.source,
          status: knowledgeEntry.status,
          category: knowledgeEntry.category,
          sourcePath: knowledgeEntry.sourcePath,
          contentHash: knowledgeEntry.contentHash,
          minTier: knowledgeEntry.minTier,
          spoilerLevel: knowledgeEntry.spoilerLevel,
          ragFilterVersion: ASK_KILIAN_RAG_FILTER_VERSION,
        },
      })

      if (!isRagStatusReady(result.status)) {
        throw new Error(
          `Ask Kilian RAG entry ${knowledgeEntry.stableKey} was not ready after sync; status=${result.status}`,
        )
      }

      const pendingRagEntryCleanupIds = uniqueCleanupIds([
        result.replacedEntry?.entryId === result.entryId ? undefined : result.replacedEntry?.entryId,
        staleFilterRagEntryId === result.replacedEntry?.entryId || staleFilterRagEntryId === result.entryId
          ? undefined
          : staleFilterRagEntryId,
      ])

      await ctx.runMutation(refs.upsertSynced, {
        entry: knowledgeEntry,
        ragEntryId: result.entryId,
        ragStatus: result.status,
        pendingRagEntryCleanupIds,
        now: timestamp,
      })

      await cleanupRagEntries(ctx, rag, refs, knowledgeEntry.stableKey, pendingRagEntryCleanupIds)
    }

    if (args.isFullManifest === true) {
      for (const entry of diff.retired) {
        const pendingRagEntryCleanupIds = uniqueCleanupIds([entry.ragEntryId])
        await ctx.runMutation(refs.markRetired, {
          stableKey: entry.stableKey,
          now: timestamp,
          ragStatus: entry.ragEntryId ? 'cleanupPending' : undefined,
          pendingRagEntryCleanupIds,
        })
        await cleanupRagEntries(ctx, rag, refs, entry.stableKey, pendingRagEntryCleanupIds)
      }
    }

    return summarizeDiff(diffForManifestMode(diff, args.isFullManifest), false)
  }
}

export function createDiffRepoKnowledgeHandler({
  refs = {
    listExisting: internal.askKilianKnowledge.listExistingKnowledgeEntriesForSync,
  },
}: {
  refs?: {
    listExisting: Parameters<ActionCtx['runQuery']>[0]
  }
} = {}) {
  return async function diffRepoKnowledgeHandler(
    ctx: Pick<ActionCtx, 'runQuery'>,
    args: { entries: AskKilianKnowledgeEntry[]; isFullManifest?: boolean },
  ): Promise<SyncSummary> {
    const existing = (await ctx.runQuery(refs.listExisting, {})) as ExistingKnowledgeEntry[]
    const diff = diffRepoKnowledgeEntries(existing, args.entries)
    return summarizeDiff(diffForManifestMode(diff, args.isFullManifest), true)
  }
}

export function createSaveAdminKnowledgeEntryHandler({
  rag = askKilianRag,
  now = () => Date.now(),
  refs = {
    listByStableKey: internal.askKilianKnowledge.listKnowledgeEntriesByStableKey,
    upsertAdminManaged: internal.askKilianKnowledge.upsertAdminManagedKnowledgeEntry,
    patchAdminManagedStatus: internal.askKilianKnowledge.patchAdminManagedKnowledgeEntryStatus,
    clearPendingCleanup: internal.askKilianKnowledge.clearPendingRagEntryCleanupId,
  },
}: {
  rag?: Pick<typeof askKilianRag, 'add' | 'delete'>
  now?: () => number
  refs?: {
    listByStableKey: Parameters<ActionCtx['runQuery']>[0]
    upsertAdminManaged: Parameters<ActionCtx['runMutation']>[0]
    patchAdminManagedStatus: Parameters<ActionCtx['runMutation']>[0]
    clearPendingCleanup: Parameters<ActionCtx['runMutation']>[0]
  }
} = {}) {
  return async function saveAdminKnowledgeEntryHandler(
    ctx: Pick<ActionCtx, 'runQuery' | 'runMutation' | 'runAction'>,
    args: { entry: AskKilianKnowledgeEntry; originalStableKey?: string },
  ) {
    assertAdminManagedEntry(args.entry)
    const originalStableKey = args.originalStableKey ?? args.entry.stableKey
    assertAdminStableKey(originalStableKey)

    const keys = [...new Set([originalStableKey, args.entry.stableKey])]
    const existingRows = (await ctx.runQuery(refs.listByStableKey, { stableKeys: keys })) as ExistingKnowledgeEntry[]
    const existingByKey = new Map(existingRows.map(entry => [entry.stableKey, entry]))
    const existingOriginal = existingByKey.get(originalStableKey)
    const existingTarget = existingByKey.get(args.entry.stableKey)

    if (existingOriginal && existingOriginal.source !== 'admin') {
      throw new Error('Repo entries cannot be changed through Ask Kilian admin')
    }
    if (existingOriginal?.status === 'retired') {
      throw new Error('Retired Ask Kilian admin entries are inspect-only')
    }
    if (existingTarget && existingTarget.source !== 'admin') {
      throw new Error('Repo entries cannot be overwritten by admin saves')
    }
    if (existingTarget?.status === 'retired') {
      throw new Error('Retired Ask Kilian admin entries are inspect-only')
    }
    if (originalStableKey !== args.entry.stableKey && existingTarget) {
      throw new Error(`Ask Kilian admin entry already exists: ${args.entry.stableKey}`)
    }

    const timestamp = now()
    const status: AskKilianKnowledgeEntry['status'] =
      existingOriginal?.status === 'disabled' || args.entry.status === 'disabled' ? 'disabled' : 'active'
    const entry = { ...args.entry, status }

    if (status === 'disabled') {
      const isRename = originalStableKey !== entry.stableKey
      await ctx.runMutation(refs.upsertAdminManaged, {
        entry,
        ragEntryId: isRename ? undefined : existingOriginal?.ragEntryId,
        ragStatus: isRename ? 'deleted' : (existingOriginal?.ragStatus ?? 'deleted'),
        pendingRagEntryCleanupIds: [],
        now: timestamp,
      })
      if (isRename && existingOriginal) {
        const pendingRagEntryCleanupIds = uniqueCleanupIds([existingOriginal.ragEntryId])
        await ctx.runMutation(refs.patchAdminManagedStatus, {
          stableKey: originalStableKey,
          status: 'retired',
          ragEntryId: undefined,
          ragStatus: existingOriginal.ragEntryId ? 'cleanupPending' : 'deleted',
          pendingRagEntryCleanupIds,
          now: timestamp,
        })
        await cleanupRagEntries(ctx, rag, refs, originalStableKey, pendingRagEntryCleanupIds)
      }
      return { stableKey: entry.stableKey, status: 'disabled' as const }
    }

    const result = await addKnowledgeEntryToRag(ctx, rag, entry)
    const pendingRagEntryCleanupIds = uniqueCleanupIds([
      result.replacedEntry?.entryId === result.entryId ? undefined : result.replacedEntry?.entryId,
      originalStableKey === entry.stableKey ? undefined : existingOriginal?.ragEntryId,
    ])

    await ctx.runMutation(refs.upsertAdminManaged, {
      entry,
      ragEntryId: result.entryId,
      ragStatus: result.status,
      pendingRagEntryCleanupIds,
      now: timestamp,
    })

    if (originalStableKey !== entry.stableKey && existingOriginal) {
      await ctx.runMutation(refs.patchAdminManagedStatus, {
        stableKey: originalStableKey,
        status: 'retired',
        ragEntryId: undefined,
        ragStatus: existingOriginal.ragEntryId ? 'cleanupPending' : 'deleted',
        pendingRagEntryCleanupIds: uniqueCleanupIds([existingOriginal.ragEntryId]),
        now: timestamp,
      })
    }

    await cleanupRagEntries(ctx, rag, refs, entry.stableKey, pendingRagEntryCleanupIds)
    if (originalStableKey !== entry.stableKey && existingOriginal?.ragEntryId) {
      await cleanupRagEntries(ctx, rag, refs, originalStableKey, [existingOriginal.ragEntryId])
    }

    return {
      stableKey: entry.stableKey,
      ragEntryId: result.entryId,
      ragStatus: result.status,
    }
  }
}

export function createDisableAdminKnowledgeEntryHandler({
  rag = askKilianRag,
  now = () => Date.now(),
  refs = {
    listByStableKey: internal.askKilianKnowledge.listKnowledgeEntriesByStableKey,
    patchAdminManagedStatus: internal.askKilianKnowledge.patchAdminManagedKnowledgeEntryStatus,
    clearPendingCleanup: internal.askKilianKnowledge.clearPendingRagEntryCleanupId,
  },
}: {
  rag?: Pick<typeof askKilianRag, 'delete'>
  now?: () => number
  refs?: {
    listByStableKey: Parameters<ActionCtx['runQuery']>[0]
    patchAdminManagedStatus: Parameters<ActionCtx['runMutation']>[0]
    clearPendingCleanup: Parameters<ActionCtx['runMutation']>[0]
  }
} = {}) {
  return async function disableAdminKnowledgeEntryHandler(
    ctx: Pick<ActionCtx, 'runQuery' | 'runMutation' | 'runAction'>,
    args: { stableKey: string },
  ) {
    assertAdminStableKey(args.stableKey)
    const rows = (await ctx.runQuery(refs.listByStableKey, {
      stableKeys: [args.stableKey],
    })) as ExistingKnowledgeEntry[]
    const existing = rows[0]
    if (!existing) throw new Error(`Ask Kilian entry not found: ${args.stableKey}`)
    if (existing.source !== 'admin') throw new Error('Repo entries cannot be changed through Ask Kilian admin')
    if (existing.status === 'retired') throw new Error('Retired Ask Kilian admin entries are inspect-only')

    const pendingRagEntryCleanupIds = uniqueCleanupIds([existing.ragEntryId])
    await ctx.runMutation(refs.patchAdminManagedStatus, {
      stableKey: args.stableKey,
      status: 'disabled',
      ragEntryId: undefined,
      ragStatus: existing.ragEntryId ? 'cleanupPending' : 'deleted',
      pendingRagEntryCleanupIds,
      now: now(),
    })
    await cleanupRagEntries(ctx, rag, refs, args.stableKey, pendingRagEntryCleanupIds)

    return { stableKey: args.stableKey, status: 'disabled' as const }
  }
}

export function createReenableAdminKnowledgeEntryHandler({
  rag = askKilianRag,
  now = () => Date.now(),
  refs = {
    listByStableKey: internal.askKilianKnowledge.listKnowledgeEntriesByStableKey,
    patchAdminManagedStatus: internal.askKilianKnowledge.patchAdminManagedKnowledgeEntryStatus,
    clearPendingCleanup: internal.askKilianKnowledge.clearPendingRagEntryCleanupId,
  },
}: {
  rag?: Pick<typeof askKilianRag, 'add' | 'delete'>
  now?: () => number
  refs?: {
    listByStableKey: Parameters<ActionCtx['runQuery']>[0]
    patchAdminManagedStatus: Parameters<ActionCtx['runMutation']>[0]
    clearPendingCleanup: Parameters<ActionCtx['runMutation']>[0]
  }
} = {}) {
  return async function reenableAdminKnowledgeEntryHandler(
    ctx: Pick<ActionCtx, 'runQuery' | 'runMutation' | 'runAction'>,
    args: { stableKey: string },
  ) {
    assertAdminStableKey(args.stableKey)
    const rows = (await ctx.runQuery(refs.listByStableKey, {
      stableKeys: [args.stableKey],
    })) as ExistingKnowledgeEntry[]
    const existing = rows[0]
    if (!existing) throw new Error(`Ask Kilian entry not found: ${args.stableKey}`)
    if (existing.source !== 'admin') throw new Error('Repo entries cannot be changed through Ask Kilian admin')
    if (existing.status === 'retired') throw new Error('Retired Ask Kilian admin entries are inspect-only')

    const entry = { ...existing, status: 'active' as const }
    const result = await addKnowledgeEntryToRag(ctx, rag, entry)
    const pendingRagEntryCleanupIds = uniqueCleanupIds([
      result.replacedEntry?.entryId === result.entryId ? undefined : result.replacedEntry?.entryId,
    ])
    await ctx.runMutation(refs.patchAdminManagedStatus, {
      stableKey: args.stableKey,
      status: 'active',
      ragEntryId: result.entryId,
      ragStatus: result.status,
      pendingRagEntryCleanupIds,
      now: now(),
    })
    await cleanupRagEntries(ctx, rag, refs, args.stableKey, pendingRagEntryCleanupIds)

    return {
      stableKey: args.stableKey,
      ragEntryId: result.entryId,
      ragStatus: result.status,
    }
  }
}

export const listKnowledgeEntries = internalQuery({
  args: {},
  returns: v.array(knowledgeEntryWithoutTextValidator),
  handler: async ctx => {
    const rows = await ctx.db.query('askKilianKnowledgeEntries').collect()
    return rows.map(projectKnowledgeEntryWithoutText).toSorted((a, b) => a.stableKey.localeCompare(b.stableKey))
  },
})

export const listExistingKnowledgeEntriesForSync = internalQuery({
  args: {},
  returns: v.array(knowledgeEntryWithTextValidator),
  handler: async ctx => {
    const rows = await ctx.db.query('askKilianKnowledgeEntries').collect()
    return rows.map(projectKnowledgeEntryWithText).toSorted((a, b) => a.stableKey.localeCompare(b.stableKey))
  },
})

export const listSearchableKnowledgeEntries = internalQuery({
  args: {},
  returns: v.array(knowledgeEntryWithTextValidator),
  handler: async ctx => {
    const rows = await ctx.db.query('askKilianKnowledgeEntries').collect()
    return rows.map(projectKnowledgeEntryWithText).toSorted((a, b) => a.stableKey.localeCompare(b.stableKey))
  },
})

export const listKnowledgeEntriesByStableKey = internalQuery({
  args: { stableKeys: v.array(v.string()) },
  returns: v.array(knowledgeEntryWithTextValidator),
  handler: async (ctx, args) => {
    const rows = await Promise.all(
      [...new Set(args.stableKeys)].map(stableKey =>
        ctx.db
          .query('askKilianKnowledgeEntries')
          .withIndex('by_stableKey', q => q.eq('stableKey', stableKey))
          .unique(),
      ),
    )
    return rows.filter(row => row !== null).map(projectKnowledgeEntryWithText)
  },
})

export const upsertSyncedKnowledgeEntry = internalMutation({
  args: {
    entry: askKilianKnowledgeEntryInputValidator,
    ragEntryId: v.optional(v.string()),
    ragStatus: v.optional(v.string()),
    pendingRagEntryCleanupIds: v.optional(v.array(v.string())),
    now: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('askKilianKnowledgeEntries')
      .withIndex('by_stableKey', q => q.eq('stableKey', args.entry.stableKey))
      .unique()
    const fields = {
      stableKey: args.entry.stableKey,
      source: args.entry.source,
      status: args.entry.status,
      category: args.entry.category,
      title: args.entry.title,
      text: args.entry.text,
      contentHash: args.entry.contentHash,
      sourcePath: args.entry.sourcePath,
      minTier: args.entry.minTier,
      spoilerLevel: args.entry.spoilerLevel,
      importance: args.entry.importance,
      ragEntryId: args.ragEntryId,
      ragStatus: args.ragStatus,
      ragFilterVersion: ASK_KILIAN_RAG_FILTER_VERSION,
      pendingRagEntryCleanupIds: uniqueCleanupIds([
        ...(existing?.pendingRagEntryCleanupIds ?? []),
        ...(args.pendingRagEntryCleanupIds ?? []),
      ]),
      updatedAt: args.now,
      retiredAt: undefined,
    }

    if (existing) {
      await ctx.db.patch(existing._id, fields)
    } else {
      await ctx.db.insert('askKilianKnowledgeEntries', {
        ...fields,
        createdAt: args.now,
      })
    }

    return null
  },
})

export const upsertAdminManagedKnowledgeEntry = internalMutation({
  args: {
    entry: askKilianKnowledgeEntryInputValidator,
    ragEntryId: v.optional(v.string()),
    ragStatus: v.optional(v.string()),
    pendingRagEntryCleanupIds: v.optional(v.array(v.string())),
    now: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('askKilianKnowledgeEntries')
      .withIndex('by_stableKey', q => q.eq('stableKey', args.entry.stableKey))
      .unique()
    if (existing && existing.source !== 'admin') throw new Error('Repo entries cannot be overwritten by admin saves')
    const fields = {
      ...args.entry,
      status: args.entry.status,
      ragEntryId: args.ragEntryId,
      ragStatus: args.ragStatus,
      ragFilterVersion: ASK_KILIAN_RAG_FILTER_VERSION,
      pendingRagEntryCleanupIds: uniqueCleanupIds([
        ...(existing?.pendingRagEntryCleanupIds ?? []),
        ...(args.pendingRagEntryCleanupIds ?? []),
      ]),
      updatedAt: args.now,
      retiredAt: undefined,
    }
    if (existing) await ctx.db.patch(existing._id, fields)
    else await ctx.db.insert('askKilianKnowledgeEntries', { ...fields, createdAt: args.now })
    return null
  },
})

export const patchAdminManagedKnowledgeEntryStatus = internalMutation({
  args: {
    stableKey: v.string(),
    status: askKilianStatusValidator,
    ragEntryId: v.optional(v.string()),
    ragStatus: v.optional(v.string()),
    pendingRagEntryCleanupIds: v.optional(v.array(v.string())),
    now: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('askKilianKnowledgeEntries')
      .withIndex('by_stableKey', q => q.eq('stableKey', args.stableKey))
      .unique()
    if (!existing) throw new Error(`Ask Kilian entry not found: ${args.stableKey}`)
    if (existing.source !== 'admin') throw new Error('Repo entries cannot be changed through Ask Kilian admin')
    await ctx.db.patch(existing._id, {
      status: args.status,
      ragEntryId: args.ragEntryId,
      ragStatus: args.ragStatus,
      pendingRagEntryCleanupIds: uniqueCleanupIds([
        ...(existing.pendingRagEntryCleanupIds ?? []),
        ...(args.pendingRagEntryCleanupIds ?? []),
      ]),
      updatedAt: args.now,
      retiredAt: args.status === 'retired' ? args.now : existing.retiredAt,
    })
    return null
  },
})

export const clearPendingRagEntryCleanupId = internalMutation({
  args: {
    stableKey: v.string(),
    entryId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('askKilianKnowledgeEntries')
      .withIndex('by_stableKey', q => q.eq('stableKey', args.stableKey))
      .unique()

    if (existing?.pendingRagEntryCleanupIds) {
      const pendingRagEntryCleanupIds = existing.pendingRagEntryCleanupIds.filter(entryId => entryId !== args.entryId)
      await ctx.db.patch(existing._id, {
        pendingRagEntryCleanupIds,
        ragStatus:
          (existing.status === 'retired' || existing.status === 'disabled') && pendingRagEntryCleanupIds.length === 0
            ? 'deleted'
            : existing.ragStatus,
      })
    }

    return null
  },
})

export const markKnowledgeEntryRetired = internalMutation({
  args: {
    stableKey: v.string(),
    now: v.number(),
    ragStatus: v.optional(v.string()),
    pendingRagEntryCleanupIds: v.optional(v.array(v.string())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('askKilianKnowledgeEntries')
      .withIndex('by_stableKey', q => q.eq('stableKey', args.stableKey))
      .unique()

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: 'retired',
        updatedAt: args.now,
        retiredAt: args.now,
        ragStatus: args.ragStatus,
        pendingRagEntryCleanupIds: uniqueCleanupIds([
          ...(existing.pendingRagEntryCleanupIds ?? []),
          ...(args.pendingRagEntryCleanupIds ?? []),
        ]),
      })
    }

    return null
  },
})

export const syncRepoKnowledge = internalAction({
  args: {
    entries: v.array(askKilianKnowledgeEntryInputValidator),
    dryRun: v.optional(v.boolean()),
    isFullManifest: v.optional(v.boolean()),
  },
  returns: syncSummaryValidator,
  handler: createSyncRepoKnowledgeHandler(),
})

export const searchKnowledge = internalAction({
  args: {
    query: v.string(),
    tier: askKilianTierValidator,
    includeSpoilers: v.optional(v.boolean()),
    categories: v.optional(v.array(askKilianCategoryValidator)),
    limit: v.optional(v.number()),
  },
  returns: v.array(searchResultValidator),
  handler: createSearchKnowledgeHandler(),
})

export const listAdminKnowledgeEntriesForAdmin = action({
  args: {},
  returns: v.array(askKilianKnowledgeEntryDisplayValidator),
  handler: async (ctx): Promise<AskKilianKnowledgeEntryDisplay[]> => {
    await requireAskKilianAdmin(ctx)
    return (await ctx.runQuery(
      internal.askKilianKnowledge.listKnowledgeEntries,
      {},
    )) as AskKilianKnowledgeEntryDisplay[]
  },
})

export const getAdminKnowledgeEntryForAdmin = action({
  args: { stableKey: v.string() },
  returns: v.union(askKilianKnowledgeEntryDisplayValidator, v.null()),
  handler: async (ctx, args): Promise<AskKilianKnowledgeEntryDisplay | null> => {
    await requireAskKilianAdmin(ctx)
    const rows = (await ctx.runQuery(internal.askKilianKnowledge.listKnowledgeEntriesByStableKey, {
      stableKeys: [args.stableKey],
    })) as AskKilianKnowledgeEntryDisplay[]
    return rows[0] ?? null
  },
})

export const saveAdminKnowledgeEntryForAdmin = action({
  args: {
    entry: askKilianKnowledgeEntryInputValidator,
    originalStableKey: v.optional(v.string()),
  },
  returns: askKilianAdminMutationResultValidator,
  handler: async (ctx, args): Promise<AskKilianAdminMutationResult> => {
    await requireAskKilianAdmin(ctx)
    requireAskKilianAiGatewayApiKey()
    const result = await createSaveAdminKnowledgeEntryHandler()(ctx, {
      entry: args.entry,
      originalStableKey: args.originalStableKey,
    })
    return {
      ...result,
      status: result.status ?? 'active',
    }
  },
})

export const disableAdminKnowledgeEntryForAdmin = action({
  args: { stableKey: v.string() },
  returns: askKilianAdminMutationResultValidator,
  handler: async (ctx, args): Promise<AskKilianAdminMutationResult> => {
    await requireAskKilianAdmin(ctx)
    return createDisableAdminKnowledgeEntryHandler()(ctx, { stableKey: args.stableKey })
  },
})

export const reenableAdminKnowledgeEntryForAdmin = action({
  args: { stableKey: v.string() },
  returns: askKilianAdminMutationResultValidator,
  handler: async (ctx, args): Promise<AskKilianAdminMutationResult> => {
    await requireAskKilianAdmin(ctx)
    requireAskKilianAiGatewayApiKey()
    const result = await createReenableAdminKnowledgeEntryHandler()(ctx, { stableKey: args.stableKey })
    return {
      ...result,
      status: 'active',
    }
  },
})

export const diffRepoKnowledgeForAdmin = action({
  args: {
    entries: v.array(askKilianKnowledgeEntryInputValidator),
    isFullManifest: v.optional(v.boolean()),
  },
  returns: syncSummaryValidator,
  handler: async (ctx, args) => {
    await requireAskKilianAdmin(ctx)
    if (args.isFullManifest === true && args.entries.length < MIN_FULL_MANIFEST_ENTRY_COUNT) {
      throw new Error(
        `Ask Kilian full-manifest diff built only ${args.entries.length} entries; refusing diff below ${MIN_FULL_MANIFEST_ENTRY_COUNT}`,
      )
    }
    return createDiffRepoKnowledgeHandler()(ctx, {
      entries: args.entries,
      isFullManifest: args.isFullManifest,
    })
  },
})

export const syncRepoKnowledgeForAdmin = action({
  args: {
    entries: v.array(askKilianKnowledgeEntryInputValidator),
    dryRun: v.optional(v.boolean()),
    isFullManifest: v.optional(v.boolean()),
  },
  returns: syncSummaryValidator,
  handler: async (ctx, args) => {
    await requireAskKilianAdmin(ctx)
    requireAskKilianAiGatewayApiKey()
    if (args.isFullManifest === true && args.entries.length < MIN_FULL_MANIFEST_ENTRY_COUNT) {
      throw new Error(
        `Ask Kilian full-manifest sync built only ${args.entries.length} entries; refusing sync below ${MIN_FULL_MANIFEST_ENTRY_COUNT}`,
      )
    }
    return createSyncRepoKnowledgeHandler()(ctx, {
      entries: args.entries,
      dryRun: args.dryRun,
      isFullManifest: args.isFullManifest,
    })
  },
})

export const searchKnowledgeForAdmin = action({
  args: {
    query: v.string(),
    tier: askKilianTierValidator,
    includeSpoilers: v.optional(v.boolean()),
    categories: v.optional(v.array(askKilianCategoryValidator)),
    limit: v.optional(v.number()),
  },
  returns: v.array(searchResultValidator),
  handler: async (ctx, args) => {
    await requireAskKilianAdmin(ctx)
    requireAskKilianAiGatewayApiKey()
    return createSearchKnowledgeHandler()(ctx, {
      query: args.query,
      tier: args.tier,
      includeSpoilers: args.includeSpoilers,
      categories: args.categories,
      limit: args.limit,
    })
  },
})

export const verifyRuntimeEnvForAdmin = action({
  args: {},
  returns: runtimeEnvStatusValidator,
  handler: async ctx => {
    await requireAskKilianAdmin(ctx)
    requireAskKilianAiGatewayApiKey()
    const configuredToken = process.env.ASK_KILIAN_CONVEX_ACCESS_TOKEN?.trim()
    return {
      ok: true,
      aiGatewayConfigured: true,
      accessTokenConfigured: Boolean(configuredToken && !isPlaceholderSecret(configuredToken)),
    }
  },
})

export const syncRepoKnowledgeForServer = action({
  args: {
    accessToken: v.string(),
    entries: v.array(askKilianKnowledgeEntryInputValidator),
    dryRun: v.optional(v.boolean()),
    isFullManifest: v.optional(v.boolean()),
  },
  returns: syncSummaryValidator,
  handler: async (ctx, args) => {
    requireMatchingAskKilianAccessToken(args.accessToken)
    requireAskKilianAiGatewayApiKey()
    if (args.isFullManifest === true && args.entries.length < MIN_FULL_MANIFEST_ENTRY_COUNT) {
      throw new Error(
        `Ask Kilian full-manifest sync built only ${args.entries.length} entries; refusing sync below ${MIN_FULL_MANIFEST_ENTRY_COUNT}`,
      )
    }
    return createSyncRepoKnowledgeHandler()(ctx, {
      entries: args.entries,
      dryRun: args.dryRun,
      isFullManifest: args.isFullManifest,
    })
  },
})

export const diffRepoKnowledgeForServer = action({
  args: {
    accessToken: v.string(),
    entries: v.array(askKilianKnowledgeEntryInputValidator),
    isFullManifest: v.optional(v.boolean()),
  },
  returns: syncSummaryValidator,
  handler: async (ctx, args) => {
    requireMatchingAskKilianAccessToken(args.accessToken)
    if (args.isFullManifest === true && args.entries.length < MIN_FULL_MANIFEST_ENTRY_COUNT) {
      throw new Error(
        `Ask Kilian full-manifest diff built only ${args.entries.length} entries; refusing diff below ${MIN_FULL_MANIFEST_ENTRY_COUNT}`,
      )
    }
    return createDiffRepoKnowledgeHandler()(ctx, {
      entries: args.entries,
      isFullManifest: args.isFullManifest,
    })
  },
})

export const searchKnowledgeForServer = action({
  args: {
    accessToken: v.string(),
    query: v.string(),
    tier: askKilianTierValidator,
    includeSpoilers: v.optional(v.boolean()),
    categories: v.optional(v.array(askKilianCategoryValidator)),
    limit: v.optional(v.number()),
  },
  returns: v.array(searchResultValidator),
  handler: async (ctx, args) => {
    requireMatchingAskKilianAccessToken(args.accessToken)
    requireAskKilianAiGatewayApiKey()
    return createSearchKnowledgeHandler()(ctx, {
      query: args.query,
      tier: args.tier,
      includeSpoilers: args.includeSpoilers,
      categories: args.categories,
      limit: args.limit,
    })
  },
})

export const verifyRuntimeEnvForServer = action({
  args: {
    accessToken: v.string(),
  },
  returns: runtimeEnvStatusValidator,
  handler: async (_ctx, args) => {
    requireMatchingAskKilianAccessToken(args.accessToken)
    requireAskKilianAiGatewayApiKey()
    return {
      ok: true,
      aiGatewayConfigured: true,
      accessTokenConfigured: true,
    }
  },
})
