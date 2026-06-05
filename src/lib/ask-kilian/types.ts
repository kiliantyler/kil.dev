export const ASK_KILIAN_CATEGORIES = [
  'career',
  'projects',
  'pets',
  'quickfacts',
  'site',
  'achievements',
  'themes',
  'persona',
  'fun',
] as const
export const ASK_KILIAN_SOURCES = ['repo', 'admin'] as const
export const ASK_KILIAN_STATUSES = ['active', 'disabled', 'retired'] as const
export const ASK_KILIAN_TIERS = [0, 1, 2] as const
export const ASK_KILIAN_SPOILER_LEVELS = ['none', 'hint', 'spoiler'] as const

export type AskKilianKnowledgeCategory = (typeof ASK_KILIAN_CATEGORIES)[number]
export type AskKilianKnowledgeSource = (typeof ASK_KILIAN_SOURCES)[number]
export type AskKilianKnowledgeStatus = (typeof ASK_KILIAN_STATUSES)[number]
export type AskKilianTier = (typeof ASK_KILIAN_TIERS)[number]
export type AskKilianSpoilerLevel = (typeof ASK_KILIAN_SPOILER_LEVELS)[number]

export type AskKilianKnowledgeEntry = {
  stableKey: string
  source: AskKilianKnowledgeSource
  status: AskKilianKnowledgeStatus
  category: AskKilianKnowledgeCategory
  title: string
  text: string
  contentHash: string
  sourcePath: string
  minTier: AskKilianTier
  spoilerLevel: AskKilianSpoilerLevel
  importance: number
}
