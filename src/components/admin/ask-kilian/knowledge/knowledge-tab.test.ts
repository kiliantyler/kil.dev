import type { AdminWorkspaceKnowledgeEntry } from '@/lib/ask-kilian/admin-workspace-shared'
import { describe, expect, test } from 'vitest'
import { getEditableEntryForEditor } from './knowledge-tab'

function entry(overrides: Partial<AdminWorkspaceKnowledgeEntry> = {}): AdminWorkspaceKnowledgeEntry {
  return {
    stableKey: 'admin:existing-note',
    source: 'admin',
    status: 'active',
    category: 'fun',
    title: 'Existing note',
    sourcePath: 'admin:/admin/ask-kilian',
    contentHash: 'hash-existing',
    minTier: 0,
    spoilerLevel: 'none',
    importance: 0.7,
    updatedAt: 100,
    ...overrides,
  }
}

describe('getEditableEntryForEditor', () => {
  test('does not open existing admin edits from list rows without source text', () => {
    expect(
      getEditableEntryForEditor({
        entries: [entry()],
        selectedDetail: null,
        stableKey: 'admin:existing-note',
      }),
    ).toBeNull()
  })

  test('uses loaded full detail for existing admin edits', () => {
    const detail = entry({ text: 'Existing admin entry text that is long enough.' })

    expect(
      getEditableEntryForEditor({
        entries: [entry()],
        selectedDetail: detail,
        stableKey: 'admin:existing-note',
      }),
    ).toBe(detail)
  })

  test('keeps retired admin rows inspect-only', () => {
    const retired = entry({ status: 'retired', text: 'Retired admin entry text that is long enough.' })

    expect(
      getEditableEntryForEditor({
        entries: [retired],
        selectedDetail: retired,
        stableKey: 'admin:existing-note',
      }),
    ).toBeNull()
  })
})
