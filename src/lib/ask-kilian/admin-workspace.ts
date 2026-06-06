import { stableStringify } from '@/utils/stable-stringify'
import { createHash } from 'node:crypto'
import {
  ASK_KILIAN_ADMIN_SOURCE_PATH,
  validateAdminKnowledgeEntryInput,
  type AdminKnowledgeEntrySaveInput,
} from './admin-workspace-shared'
import { type AskKilianKnowledgeEntry } from './types'

function buildAdminKnowledgeContentHash(entry: Omit<AskKilianKnowledgeEntry, 'contentHash'>) {
  return createHash('sha256').update(stableStringify(entry)).digest('hex')
}

export function buildAdminKnowledgeEntry(input: AdminKnowledgeEntrySaveInput): AskKilianKnowledgeEntry {
  const validation = validateAdminKnowledgeEntryInput(input)
  if (!validation.ok) throw new Error(Object.values(validation.errors)[0] ?? 'Invalid Ask Kilian admin entry')

  const entryWithoutHash = {
    stableKey: `admin:${validation.normalizedSlug}`,
    source: 'admin' as const,
    status: input.currentStatus,
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
