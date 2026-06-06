import { anyApi } from 'convex/server'
import { v } from 'convex/values'

import type { FunctionReference } from 'convex/server'
import type { Infer } from 'convex/values'
import type { Doc } from './_generated/dataModel'
import {
  action,
  internalMutation,
  internalQuery,
  type ActionCtx,
  type MutationCtx,
  type QueryCtx,
} from './_generated/server'
import { requireAskKilianAdmin } from './askKilianKnowledge'

type AskKilianPromptConfig = Doc<'askKilianPromptConfigs'>
type AskKilianRuntimeConfig = Doc<'askKilianRuntimeConfigs'>

type SavePromptRevisionInput = {
  title: string
  promptText: string
  notes?: string
  actor: string
}

type SaveRuntimeConfigInput = {
  modelId: string
  maxOutputTokens: number
  temperature: number
  conversationWindow: number
  ragLimit: number
  quota: {
    adminTestDailyRequests: number
    publicDailyRequests: number
    publicDailyEstimatedTokens: number
  }
  actor: string
}

type SavePromptRevisionRefs = {
  table: 'askKilianPromptConfigs'
}

type SaveRuntimeConfigRefs = {
  table: 'askKilianRuntimeConfigs'
}

type SavePromptRevisionInternalArgs = SavePromptRevisionInput & {
  now: number
}

type SaveRuntimeConfigInternalArgs = SaveRuntimeConfigInput & {
  now: number
}

const promptRevisionResultValidator = v.object({
  promptRevisionId: v.id('askKilianPromptConfigs'),
})
type PromptRevisionResult = Infer<typeof promptRevisionResultValidator>

const runtimeConfigResultValidator = v.object({
  runtimeConfigVersionId: v.id('askKilianRuntimeConfigs'),
})
type RuntimeConfigResult = Infer<typeof runtimeConfigResultValidator>

const runtimeQuotaValidator = v.object({
  adminTestDailyRequests: v.number(),
  publicDailyRequests: v.number(),
  publicDailyEstimatedTokens: v.number(),
})

const promptConfigSummaryValidator = v.object({
  id: v.string(),
  title: v.string(),
  promptText: v.string(),
  notes: v.optional(v.string()),
  createdBy: v.string(),
  createdAt: v.number(),
})
type PromptConfigSummary = Infer<typeof promptConfigSummaryValidator>

const runtimeConfigSummaryValidator = v.object({
  id: v.string(),
  modelId: v.string(),
  maxOutputTokens: v.number(),
  temperature: v.number(),
  conversationWindow: v.number(),
  ragLimit: v.number(),
  quota: runtimeQuotaValidator,
  createdBy: v.string(),
  createdAt: v.number(),
})
type RuntimeConfigSummary = Infer<typeof runtimeConfigSummaryValidator>

const askKilianChatInternalApi = (anyApi.askKilianChat as unknown as {
  savePromptRevision: FunctionReference<
    'mutation',
    'internal',
    SavePromptRevisionInternalArgs,
    PromptRevisionResult
  >
  saveRuntimeConfig: FunctionReference<
    'mutation',
    'internal',
    SaveRuntimeConfigInternalArgs,
    RuntimeConfigResult
  >
})

function promptConfigToSummary(row: AskKilianPromptConfig): PromptConfigSummary {
  return {
    id: row._id,
    title: row.title,
    promptText: row.promptText,
    notes: row.notes,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
  }
}

function runtimeConfigToSummary(row: AskKilianRuntimeConfig): RuntimeConfigSummary {
  return {
    id: row._id,
    modelId: row.modelId,
    maxOutputTokens: row.maxOutputTokens,
    temperature: row.temperature,
    conversationWindow: row.conversationWindow,
    ragLimit: row.ragLimit,
    quota: row.quota,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
  }
}

function assertMatchingAdminActor(actor: string, admin: Awaited<ReturnType<typeof requireAskKilianAdmin>>) {
  if (actor.trim().toLowerCase() !== admin.email) {
    throw new Error('Ask Kilian admin access denied')
  }
}

export function createSavePromptRevisionHandler({
  now = () => Date.now(),
  refs = { table: 'askKilianPromptConfigs' },
}: {
  now?: () => number
  refs?: SavePromptRevisionRefs
} = {}) {
  return async (ctx: MutationCtx, args: SavePromptRevisionInput): Promise<PromptRevisionResult> => {
    const createdAt = now()
    const activePrompts = await ctx.db
      .query(refs.table)
      .withIndex('by_active', query => query.eq('active', true))
      .collect()
    for (const prompt of activePrompts) {
      await ctx.db.patch(prompt._id, { active: false })
    }

    const promptRevisionId = await ctx.db.insert(refs.table, {
      title: args.title,
      promptText: args.promptText,
      active: true,
      notes: args.notes,
      createdBy: args.actor,
      createdAt,
    })

    return { promptRevisionId }
  }
}

export function createSaveRuntimeConfigHandler({
  now = () => Date.now(),
  refs = { table: 'askKilianRuntimeConfigs' },
}: {
  now?: () => number
  refs?: SaveRuntimeConfigRefs
} = {}) {
  return async (ctx: MutationCtx, args: SaveRuntimeConfigInput): Promise<RuntimeConfigResult> => {
    const createdAt = now()
    const activeRuntimeConfigs = await ctx.db
      .query(refs.table)
      .withIndex('by_active', query => query.eq('active', true))
      .collect()
    for (const runtimeConfig of activeRuntimeConfigs) {
      await ctx.db.patch(runtimeConfig._id, { active: false })
    }

    const runtimeConfigVersionId = await ctx.db.insert(refs.table, {
      modelId: args.modelId,
      maxOutputTokens: args.maxOutputTokens,
      temperature: args.temperature,
      conversationWindow: args.conversationWindow,
      ragLimit: args.ragLimit,
      quota: args.quota,
      active: true,
      createdBy: args.actor,
      createdAt,
    })

    return { runtimeConfigVersionId }
  }
}

export const getActivePromptConfig = internalQuery({
  args: {},
  returns: v.union(promptConfigSummaryValidator, v.null()),
  handler: async (ctx: QueryCtx): Promise<PromptConfigSummary | null> => {
    const rows = await ctx.db
      .query('askKilianPromptConfigs')
      .withIndex('by_active', query => query.eq('active', true))
      .collect()
    const activePrompt = rows.toSorted((a, b) => b.createdAt - a.createdAt)[0]
    return activePrompt ? promptConfigToSummary(activePrompt) : null
  },
})

export const getActiveRuntimeConfig = internalQuery({
  args: {},
  returns: v.union(runtimeConfigSummaryValidator, v.null()),
  handler: async (ctx: QueryCtx): Promise<RuntimeConfigSummary | null> => {
    const rows = await ctx.db
      .query('askKilianRuntimeConfigs')
      .withIndex('by_active', query => query.eq('active', true))
      .collect()
    const activeRuntimeConfig = rows.toSorted((a, b) => b.createdAt - a.createdAt)[0]
    return activeRuntimeConfig ? runtimeConfigToSummary(activeRuntimeConfig) : null
  },
})

export const savePromptRevision = internalMutation({
  args: {
    title: v.string(),
    promptText: v.string(),
    notes: v.optional(v.string()),
    actor: v.string(),
    now: v.number(),
  },
  returns: promptRevisionResultValidator,
  handler: (ctx, args) =>
    createSavePromptRevisionHandler({ now: () => args.now })(ctx, {
      title: args.title,
      promptText: args.promptText,
      notes: args.notes,
      actor: args.actor,
    }),
})

export const saveRuntimeConfig = internalMutation({
  args: {
    modelId: v.string(),
    maxOutputTokens: v.number(),
    temperature: v.number(),
    conversationWindow: v.number(),
    ragLimit: v.number(),
    quota: runtimeQuotaValidator,
    actor: v.string(),
    now: v.number(),
  },
  returns: runtimeConfigResultValidator,
  handler: (ctx, args) =>
    createSaveRuntimeConfigHandler({ now: () => args.now })(ctx, {
      modelId: args.modelId,
      maxOutputTokens: args.maxOutputTokens,
      temperature: args.temperature,
      conversationWindow: args.conversationWindow,
      ragLimit: args.ragLimit,
      quota: args.quota,
      actor: args.actor,
    }),
})

export const savePromptRevisionForAdmin = action({
  args: {
    title: v.string(),
    promptText: v.string(),
    notes: v.optional(v.string()),
    actor: v.string(),
  },
  returns: promptRevisionResultValidator,
  handler: async (ctx: ActionCtx, args): Promise<PromptRevisionResult> => {
    const admin = await requireAskKilianAdmin(ctx)
    assertMatchingAdminActor(args.actor, admin)
    return ctx.runMutation(askKilianChatInternalApi.savePromptRevision, {
      title: args.title,
      promptText: args.promptText,
      notes: args.notes,
      actor: admin.email,
      now: Date.now(),
    }) as Promise<PromptRevisionResult>
  },
})

export const saveRuntimeConfigForAdmin = action({
  args: {
    modelId: v.string(),
    maxOutputTokens: v.number(),
    temperature: v.number(),
    conversationWindow: v.number(),
    ragLimit: v.number(),
    quota: runtimeQuotaValidator,
    actor: v.string(),
  },
  returns: runtimeConfigResultValidator,
  handler: async (ctx: ActionCtx, args): Promise<RuntimeConfigResult> => {
    const admin = await requireAskKilianAdmin(ctx)
    assertMatchingAdminActor(args.actor, admin)
    return ctx.runMutation(askKilianChatInternalApi.saveRuntimeConfig, {
      modelId: args.modelId,
      maxOutputTokens: args.maxOutputTokens,
      temperature: args.temperature,
      conversationWindow: args.conversationWindow,
      ragLimit: args.ragLimit,
      quota: args.quota,
      actor: admin.email,
      now: Date.now(),
    }) as Promise<RuntimeConfigResult>
  },
})

export function normalizeAskKilianQuotaDay(timestamp: number) {
  return new Date(timestamp).toISOString().slice(0, 10)
}

export function stableShortHash(input: string) {
  let hash = 0x811C9DC5

  for (const character of input) {
    hash ^= character.codePointAt(0) ?? 0
    hash = Math.imul(hash, 0x01000193)
  }

  const unsignedHash = hash < 0 ? hash + 0x1_0000_0000 : hash

  return Math.trunc(unsignedHash).toString(16).padStart(8, '0')
}

export function buildAskKilianRagCorpusVersionKey(input: {
  entries: Array<{ stableKey: string; contentHash: string }>
  ragFilterVersion: number
  embeddingModel: string
  embeddingDimensions: number
}) {
  const fingerprint = input.entries
    .map(entry => `${entry.stableKey}:${entry.contentHash}`)
    .toSorted()
    .join('|')
  const hash = stableShortHash(
    JSON.stringify({
      fingerprint,
      ragFilterVersion: input.ragFilterVersion,
      embeddingModel: input.embeddingModel,
      embeddingDimensions: input.embeddingDimensions,
    }),
  )

  return `rag:v${input.ragFilterVersion}:${hash}`
}
