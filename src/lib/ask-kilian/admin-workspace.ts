import { stableStringify } from '@/utils/stable-stringify'
import { createHash } from 'node:crypto'
import {
  ASK_KILIAN_ADMIN_SOURCE_PATH,
  validateAdminKnowledgeEntryInput,
  type AdminKnowledgeEntrySaveInput,
} from './admin-workspace-shared'
import { type AskKilianKnowledgeEntry } from './types'

export {
  ASK_KILIAN_ADMIN_MAX_TEXT_LENGTH,
  ASK_KILIAN_ADMIN_MIN_TEXT_LENGTH,
  ASK_KILIAN_ADMIN_SOURCE_PATH,
  assertAdminCreateDoesNotCollide,
  assertAdminEditStableKeyAllowed,
  normalizeAdminKnowledgeSlug,
  validateAdminKnowledgeEntryInput,
  type AdminKnowledgeEntryCreateInput,
  type AdminKnowledgeEntryEditInput,
  type AdminKnowledgeEntryInput,
  type AdminKnowledgeEntrySaveInput,
  type AdminKnowledgeEntryValidation,
  type AdminWorkspaceKnowledgeEntry,
  type AskKilianAdminStatus,
  type AskKilianAdminStatusLevel,
  type AskKilianAdminWorkspaceState,
} from './admin-workspace-shared'

export function buildAdminKnowledgeContentHash(entry: Omit<AskKilianKnowledgeEntry, 'contentHash'>) {
  return createHash('sha256').update(stableStringify(entry)).digest('hex')
}

export function buildAdminKnowledgeEntry(input: AdminKnowledgeEntrySaveInput): AskKilianKnowledgeEntry {
  const validation = validateAdminKnowledgeEntryInput(input)
  if (!validation.ok) throw new Error(Object.values(validation.errors)[0] ?? 'Invalid Ask Kilian admin entry')

  const entryWithoutHash = {
    stableKey: `admin:${validation.normalizedSlug}`,
    source: 'admin' as const,
    status: input.mode === 'edit' ? input.currentStatus : ('active' as const),
    category: input.category,
    title: input.title.trim(),
    text: input.text.trim(),
    sourcePath: ASK_KILIAN_ADMIN_SOURCE_PATH,
    minTier: input.minTier,
    spoilerLevel: input.spoilerLevel,
    importance: input.importance,
  }

  return { ...entryWithoutHash, contentHash: buildAdminKnowledgeContentHash(entryWithoutHash) }
}
