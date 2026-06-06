import { describe, expect, test } from 'vitest'
import { buildRepoSyncConfirmationSummary, canApplyRepoSync, type AskKilianOpsSyncPreview } from './ops-tab'

function syncPreview(overrides: Partial<AskKilianOpsSyncPreview> = {}): AskKilianOpsSyncPreview {
  return {
    dryRun: true,
    counts: {
      created: 2,
      changed: 1,
      unchanged: 4,
      retired: 3,
      ignoredAdmin: 5,
    },
    keys: {
      created: ['repo:new-alpha', 'repo:new-bravo'],
      changed: ['repo:changed-charlie'],
      unchanged: ['repo:stable-delta'],
      retired: ['repo:retired-echo', 'repo:retired-foxtrot', 'repo:retired-golf'],
      ignoredAdmin: ['admin:manual-hotel'],
    },
    ...overrides,
  }
}

describe('canApplyRepoSync', () => {
  test('apply is disabled when no preview exists', () => {
    expect(canApplyRepoSync({ syncPreview: null, syncPreviewStale: false, isPending: false })).toBe(false)
  })

  test('apply is disabled when preview is stale', () => {
    expect(canApplyRepoSync({ syncPreview: syncPreview(), syncPreviewStale: true, isPending: false })).toBe(false)
  })

  test('apply is enabled only after successful fresh preview', () => {
    expect(canApplyRepoSync({ syncPreview: syncPreview(), syncPreviewStale: false, isPending: true })).toBe(false)
    expect(canApplyRepoSync({ syncPreview: syncPreview(), syncPreviewStale: false, isPending: false })).toBe(true)
  })
})

describe('buildRepoSyncConfirmationSummary', () => {
  test('confirmation summary repeats created, changed, and retired counts', () => {
    expect(buildRepoSyncConfirmationSummary(syncPreview()).countRows).toEqual([
      { label: 'Created', value: 2 },
      { label: 'Changed', value: 1 },
      { label: 'Retired', value: 3 },
    ])
  })

  test('confirmation summary includes changed and retired keys before apply', () => {
    const summary = buildRepoSyncConfirmationSummary(syncPreview())

    expect(summary.sections).toEqual([
      { label: 'Changed keys', keys: ['repo:changed-charlie'] },
      { label: 'Retired keys', keys: ['repo:retired-echo', 'repo:retired-foxtrot', 'repo:retired-golf'] },
    ])
  })
})
