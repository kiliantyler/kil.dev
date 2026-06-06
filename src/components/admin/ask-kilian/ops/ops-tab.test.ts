import { describe, expect, test } from 'vitest'
import {
  buildRepoSyncConfirmationSummary,
  canApplyRepoSync,
  getRepoSyncApplyKeySections,
  type AskKilianOpsSyncPreview,
} from './ops-tab'

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
    confirmationToken: 'preview-token',
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

  test('apply is disabled when the preview has no repo changes', () => {
    expect(
      canApplyRepoSync({
        syncPreview: syncPreview({
          counts: {
            created: 0,
            changed: 0,
            unchanged: 4,
            retired: 0,
            ignoredAdmin: 1,
          },
        }),
        syncPreviewStale: false,
        isPending: false,
      }),
    ).toBe(false)
  })
})

describe('buildRepoSyncConfirmationSummary', () => {
  test('confirmation summary repeats created, changed, and retired counts', () => {
    expect(buildRepoSyncConfirmationSummary(syncPreview()).countRows).toEqual([
      { label: 'Created', value: 2 },
      { label: 'Changed', value: 1 },
      { label: 'Unchanged', value: 4 },
      { label: 'Retired', value: 3 },
      { label: 'Ignored admin', value: 5 },
    ])
  })

  test('confirmation summary includes every key bucket before apply', () => {
    const summary = buildRepoSyncConfirmationSummary(syncPreview())

    expect(summary.sections).toEqual([
      { label: 'Created keys', keys: ['repo:new-alpha', 'repo:new-bravo'] },
      { label: 'Changed keys', keys: ['repo:changed-charlie'] },
      { label: 'Unchanged keys', keys: ['repo:stable-delta'] },
      { label: 'Retired keys', keys: ['repo:retired-echo', 'repo:retired-foxtrot', 'repo:retired-golf'] },
      { label: 'Ignored admin keys', keys: ['admin:manual-hotel'] },
    ])
  })

  test('apply confirmation includes only changed key buckets with keys', () => {
    const summary = buildRepoSyncConfirmationSummary(
      syncPreview({
        counts: {
          created: 0,
          changed: 1,
          unchanged: 4,
          retired: 3,
          ignoredAdmin: 5,
        },
        keys: {
          created: [],
          changed: ['repo:changed-charlie'],
          unchanged: ['repo:stable-delta'],
          retired: ['repo:retired-echo', 'repo:retired-foxtrot', 'repo:retired-golf'],
          ignoredAdmin: ['admin:manual-hotel'],
        },
      }),
    )

    expect(getRepoSyncApplyKeySections(summary)).toEqual([
      { label: 'Changed keys', keys: ['repo:changed-charlie'] },
      { label: 'Retired keys', keys: ['repo:retired-echo', 'repo:retired-foxtrot', 'repo:retired-golf'] },
    ])
  })
})
