import { v } from 'convex/values'

import { askKilianCategoryValidator, askKilianTierValidator } from './askKilianValidators'

export const askKilianCallerModeValidator = v.union(v.literal('admin_test'), v.literal('public'))

export const askKilianQuotaBucketValidator = v.union(v.literal('admin_test'), v.literal('public'))

export const askKilianChatStatusValidator = v.union(
  v.literal('completed'),
  v.literal('refused'),
  v.literal('clarifying'),
  v.literal('failed'),
)

export const askKilianClassificationScopeValidator = v.union(
  v.literal('allowed'),
  v.literal('general_ai_misuse'),
  v.literal('private_fact_fishing'),
  v.literal('achievement_spoiler_request'),
  v.literal('ambiguous_valid'),
  v.literal('ambiguous_risky'),
)

export const askKilianClassificationBehaviorValidator = v.union(
  v.literal('answer'),
  v.literal('clarify'),
  v.literal('refuse'),
  v.literal('redirect'),
  v.literal('fake_lore'),
)

export const askKilianPromptRevisionFields = {
  title: v.string(),
  promptText: v.string(),
  active: v.boolean(),
  notes: v.optional(v.string()),
  createdBy: v.string(),
  createdAt: v.number(),
}

export const askKilianPromptRevisionValidator = v.object(askKilianPromptRevisionFields)

export const askKilianRuntimeConfigFields = {
  modelId: v.string(),
  maxOutputTokens: v.number(),
  temperature: v.number(),
  conversationWindow: v.number(),
  ragLimit: v.number(),
  quota: v.object({
    adminTestDailyRequests: v.number(),
    publicDailyRequests: v.number(),
    publicDailyEstimatedTokens: v.number(),
  }),
  active: v.boolean(),
  createdBy: v.string(),
  createdAt: v.number(),
}

export const askKilianRuntimeConfigValidator = v.object(askKilianRuntimeConfigFields)

export const askKilianRetrievedEntryRefValidator = v.object({
  stableKey: v.string(),
  title: v.string(),
  category: askKilianCategoryValidator,
  score: v.number(),
  contentHash: v.optional(v.string()),
})

export const askKilianConversationMessageValidator = v.object({
  role: v.union(v.literal('user'), v.literal('assistant')),
  content: v.string(),
  createdAt: v.number(),
})

const askKilianQuotaDecisionValidator = v.object({
  allowed: v.boolean(),
  bucket: askKilianQuotaBucketValidator,
  reason: v.string(),
  remainingDailyRequests: v.number(),
})

export const askKilianTraceMetadataValidator = v.object({
  callerMode: askKilianCallerModeValidator,
  quotaBucket: askKilianQuotaBucketValidator,
  status: askKilianChatStatusValidator,
  tier: askKilianTierValidator,
  includeSpoilers: v.boolean(),
  categories: v.array(askKilianCategoryValidator),
  promptRevisionId: v.string(),
  runtimeConfigVersionId: v.string(),
  ragCorpusVersionKey: v.string(),
  condensedQuery: v.string(),
  classification: v.object({
    scope: askKilianClassificationScopeValidator,
    behavior: askKilianClassificationBehaviorValidator,
    topic: v.string(),
    reason: v.string(),
    source: v.union(v.literal('deterministic'), v.literal('llm'), v.literal('fail_closed')),
  }),
  retrievedEntries: v.array(askKilianRetrievedEntryRefValidator),
  quotaDecision: askKilianQuotaDecisionValidator,
  publicEquivalentQuotaDecision: v.optional(askKilianQuotaDecisionValidator),
  model: v.object({
    modelId: v.string(),
    latencyMs: v.number(),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    finishReason: v.optional(v.string()),
  }),
  posthogDistinctId: v.optional(v.string()),
  posthogTraceId: v.optional(v.string()),
  error: v.optional(v.string()),
})
