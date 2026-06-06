import type { AdminWorkspaceKnowledgeEntry } from '@/lib/ask-kilian/admin-workspace-shared'
import { describe, expect, test } from 'vitest'
import {
  applyEntryEditorTitleChange,
  buildEntryEditorDraft,
  buildEntryEditorSaveInput,
  isEntryEditorDraftDirty,
  resolveEntryEditorCloseRequest,
  validateEntryEditorDraftForSave,
} from './entry-editor-dialog'

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
    text: 'Existing admin entry text that is long enough.',
    ...overrides,
  }
}

describe('buildEntryEditorDraft', () => {
  test('edit mode includes originalStableKey and currentStatus', () => {
    const existing = entry()
    const input = buildEntryEditorSaveInput(buildEntryEditorDraft(existing), existing)

    expect(input).toMatchObject({
      mode: 'edit',
      originalStableKey: 'admin:existing-note',
      currentStatus: 'active',
    })
  })

  test('editing a disabled entry keeps currentStatus disabled', () => {
    const disabled = entry({ status: 'disabled' })
    const input = buildEntryEditorSaveInput(buildEntryEditorDraft(disabled), disabled)

    expect(input).toMatchObject({
      mode: 'edit',
      currentStatus: 'disabled',
    })
  })
})

describe('applyEntryEditorTitleChange', () => {
  test('preserves existing edit slugs when the title changes', () => {
    const existing = entry({ stableKey: 'admin:existing-note', title: 'Existing note' })

    expect(applyEntryEditorTitleChange(buildEntryEditorDraft(existing), 'Retitled note')).toMatchObject({
      title: 'Retitled note',
      slug: 'existing-note',
    })
  })
})

describe('validateEntryEditorDraftForSave', () => {
  test('rejects rename collisions while editing', () => {
    const existing = entry()
    const draft = { ...buildEntryEditorDraft(existing), slug: 'other-note' }

    expect(
      validateEntryEditorDraftForSave(draft, existing, new Set(['admin:existing-note', 'admin:other-note'])),
    ).toMatchObject({
      ok: false,
      message: 'Ask Kilian admin entry already exists: admin:other-note',
    })
  })
})

describe('isEntryEditorDraftDirty', () => {
  test('detects dirty edit drafts', () => {
    const existing = entry()
    expect(isEntryEditorDraftDirty(buildEntryEditorDraft(existing), existing)).toBe(false)
    expect(isEntryEditorDraftDirty({ ...buildEntryEditorDraft(existing), text: 'Changed text' }, existing)).toBe(true)
  })
})

describe('resolveEntryEditorCloseRequest', () => {
  test('blocks close requests while an async save is unresolved', () => {
    const existing = entry()

    expect(
      resolveEntryEditorCloseRequest({
        saving: true,
        nextOpen: false,
        draft: { ...buildEntryEditorDraft(existing), text: 'Changed text that is long enough.' },
        entry: existing,
      }),
    ).toBe('keep-open')
  })

  test('confirms discard only for dirty non-saving drafts', () => {
    const existing = entry()

    expect(
      resolveEntryEditorCloseRequest({
        saving: false,
        nextOpen: false,
        draft: { ...buildEntryEditorDraft(existing), text: 'Changed text that is long enough.' },
        entry: existing,
      }),
    ).toBe('confirm-discard')
    expect(
      resolveEntryEditorCloseRequest({
        saving: false,
        nextOpen: false,
        draft: buildEntryEditorDraft(existing),
        entry: existing,
      }),
    ).toBe('set-open')
  })
})
