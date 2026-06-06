import {
  ASK_KILIAN_CATEGORIES,
  ASK_KILIAN_SPOILER_LEVELS,
  ASK_KILIAN_TIERS,
  type AskKilianKnowledgeCategory,
  type AskKilianKnowledgeEntry,
  type AskKilianSpoilerLevel,
  type AskKilianTier,
} from './types'

export const ASK_KILIAN_ADMIN_SOURCE_PATH = 'admin:/admin/ask-kilian'
const ASK_KILIAN_ADMIN_MIN_TEXT_LENGTH = 20
const ASK_KILIAN_ADMIN_MAX_TEXT_LENGTH = 8000

export type AdminKnowledgeEntryInput = {
  slug: string
  title: string
  category: AskKilianKnowledgeCategory
  minTier: AskKilianTier
  spoilerLevel: AskKilianSpoilerLevel
  text: string
  importance: number
}

export type AdminKnowledgeEntryEditInput = AdminKnowledgeEntryInput & {
  mode: 'edit'
  originalStableKey: `admin:${string}`
  currentStatus: 'active' | 'disabled'
}

export type AdminKnowledgeEntrySaveInput = AdminKnowledgeEntryEditInput

export type AdminKnowledgeEntryValidation = {
  ok: boolean
  errors: Partial<Record<keyof AdminKnowledgeEntryInput, string>>
  normalizedSlug: string
}

export type AdminWorkspaceKnowledgeEntry = Omit<AskKilianKnowledgeEntry, 'text'> & {
  text?: string
  textSummary?: string
  ragEntryId?: string
  ragStatus?: string
  ragFilterVersion?: number
  pendingRagEntryCleanupIds?: string[]
  createdAt?: number
  updatedAt: number
  retiredAt?: number
}

type AskKilianAdminStatusLevel = 'ready' | 'degraded' | 'unavailable' | 'checking'

export type AskKilianAdminStatus = {
  level: AskKilianAdminStatusLevel
  label: 'Runtime' | 'RAG'
  reason: string
  checkedAt?: number
}

export type AskKilianAdminWorkspaceState = {
  entries: AdminWorkspaceKnowledgeEntry[]
  selectedStableKey?: string
  runtimeStatus: AskKilianAdminStatus
  ragStatus: AskKilianAdminStatus
}

function isCategory(value: string): value is AskKilianKnowledgeCategory {
  return ASK_KILIAN_CATEGORIES.includes(value as AskKilianKnowledgeCategory)
}

function isTier(value: number): value is AskKilianTier {
  return ASK_KILIAN_TIERS.includes(value as AskKilianTier)
}

function isSpoilerLevel(value: string): value is AskKilianSpoilerLevel {
  return ASK_KILIAN_SPOILER_LEVELS.includes(value as AskKilianSpoilerLevel)
}

export function normalizeAdminKnowledgeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-+|-+$/g, '')
}

export function validateAdminKnowledgeEntryInput(input: AdminKnowledgeEntryInput): AdminKnowledgeEntryValidation {
  const normalizedSlug = normalizeAdminKnowledgeSlug(input.slug)
  const errors: AdminKnowledgeEntryValidation['errors'] = {}

  if (!normalizedSlug) errors.slug = 'Enter a slug using letters or numbers.'
  if (!input.title.trim()) errors.title = 'Enter a title.'
  if (!isCategory(input.category)) errors.category = 'Choose a valid category.'
  if (!isTier(input.minTier)) errors.minTier = 'Choose a valid tier.'
  if (!isSpoilerLevel(input.spoilerLevel)) errors.spoilerLevel = 'Choose a valid spoiler level.'
  if (input.text.trim().length < ASK_KILIAN_ADMIN_MIN_TEXT_LENGTH) {
    errors.text = `Enter at least ${ASK_KILIAN_ADMIN_MIN_TEXT_LENGTH} characters of source text.`
  } else if (input.text.trim().length > ASK_KILIAN_ADMIN_MAX_TEXT_LENGTH) {
    errors.text = `Keep source text at or below ${ASK_KILIAN_ADMIN_MAX_TEXT_LENGTH} characters.`
  }
  if (!Number.isFinite(input.importance) || input.importance < 0 || input.importance > 1) {
    errors.importance = 'Importance must be between 0 and 1.'
  }

  return { ok: Object.keys(errors).length === 0, errors, normalizedSlug }
}

export function assertAdminEditStableKeyAllowed(input: AdminKnowledgeEntryEditInput, existingStableKeys: Set<string>) {
  const nextStableKey = `admin:${normalizeAdminKnowledgeSlug(input.slug)}`
  if (nextStableKey !== input.originalStableKey && existingStableKeys.has(nextStableKey)) {
    throw new Error(`Ask Kilian admin entry already exists: ${nextStableKey}`)
  }
}
