import { v } from 'convex/values'

import {
  ASK_KILIAN_CATEGORIES,
  ASK_KILIAN_SOURCES,
  ASK_KILIAN_SPOILER_LEVELS,
  ASK_KILIAN_STATUSES,
  ASK_KILIAN_TIERS,
} from '../src/lib/ask-kilian/types'

export { ASK_KILIAN_CATEGORIES, ASK_KILIAN_SOURCES, ASK_KILIAN_SPOILER_LEVELS, ASK_KILIAN_STATUSES, ASK_KILIAN_TIERS }
export const ASK_KILIAN_RAG_FILTER_VERSION = 2 as const

function literalUnionFrom<const T extends readonly [string | number, string | number, ...(string | number)[]]>(
  values: T,
) {
  return v.union(...(values.map(value => v.literal(value)) as { [K in keyof T]: ReturnType<typeof v.literal<T[K]>> }))
}

export const askKilianCategoryValidator = literalUnionFrom(ASK_KILIAN_CATEGORIES)

export const askKilianTierValidator = literalUnionFrom(ASK_KILIAN_TIERS)

export const askKilianSpoilerLevelValidator = literalUnionFrom(ASK_KILIAN_SPOILER_LEVELS)

export const askKilianSourceValidator = literalUnionFrom(ASK_KILIAN_SOURCES)

export const askKilianStatusValidator = literalUnionFrom(ASK_KILIAN_STATUSES)

export const askKilianKnowledgeEntryCoreFields = {
  stableKey: v.string(),
  source: askKilianSourceValidator,
  status: askKilianStatusValidator,
  category: askKilianCategoryValidator,
  title: v.string(),
  text: v.string(),
  contentHash: v.string(),
  sourcePath: v.string(),
  minTier: askKilianTierValidator,
  spoilerLevel: askKilianSpoilerLevelValidator,
  importance: v.number(),
}

export const askKilianKnowledgeEntryInputValidator = v.object(askKilianKnowledgeEntryCoreFields)

export const askKilianRagFilterVersionValidator = v.number()
