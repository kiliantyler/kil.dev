import type { AdminWorkspaceKnowledgeEntry } from '@/lib/ask-kilian/admin-workspace-shared'
import { describe, expect, test } from 'vitest'
import {
  applyKnowledgeColumnVisibilityToggle,
  applyKnowledgeSearchInput,
  buildKnowledgeFilterOptions,
  buildKnowledgeFilterTokenLabel,
  buildKnowledgeInitialColumnSizing,
  buildKnowledgeSearchSuggestions,
  countKnowledgeFilterMatches,
  DEFAULT_KNOWLEDGE_COLUMN_VISIBILITY,
  FILTER_DEFINITIONS,
  findKnowledgeSelectedEntry,
  knowledgeEntryMatchesGlobalSearch,
  normalizeKnowledgeFilterValues,
  removeLastKnowledgeFilterValue,
  sortKnowledgeEntries,
  toggleKnowledgeFilterValue,
} from './knowledge-table-helpers'

function entry(overrides: Partial<AdminWorkspaceKnowledgeEntry>): AdminWorkspaceKnowledgeEntry {
  return {
    stableKey: 'repo:alpha',
    source: 'repo',
    status: 'active',
    category: 'career',
    title: 'Alpha entry',
    sourcePath: 'src/content/alpha.md',
    contentHash: 'hash-alpha',
    minTier: 0,
    spoilerLevel: 'none',
    importance: 0.5,
    ragStatus: 'indexed',
    updatedAt: 100,
    textSummary: 'Alpha source text summary',
    ...overrides,
  }
}

const entries = [
  entry({
    stableKey: 'repo:bravo',
    title: 'Bravo knowledge',
    sourcePath: 'src/content/bravo.md',
    textSummary: 'Hidden theme text summary',
    updatedAt: 200,
  }),
  entry({
    stableKey: 'admin:charlie',
    source: 'admin',
    title: 'Charlie admin note',
    sourcePath: 'admin:/admin/ask-kilian',
    text: 'Charlie admin body',
    category: 'fun',
    status: 'disabled',
    minTier: 2,
    spoilerLevel: 'spoiler',
    ragStatus: 'pending',
    updatedAt: 300,
  }),
  entry({
    stableKey: 'repo:alpha',
    title: 'Alpha repo note',
    sourcePath: 'src/content/alpha.md',
    text: 'Alpha repo body',
    category: 'projects',
    minTier: 1,
    spoilerLevel: 'hint',
    ragStatus: 'indexed',
    updatedAt: 100,
  }),
]
const bravoEntry = entries[0]!

describe('knowledgeEntryMatchesGlobalSearch', () => {
  test('matches stable key, title, source path, and source text summary', () => {
    expect(knowledgeEntryMatchesGlobalSearch(bravoEntry, 'repo:bravo')).toBe(true)
    expect(knowledgeEntryMatchesGlobalSearch(bravoEntry, 'Bravo knowledge')).toBe(true)
    expect(knowledgeEntryMatchesGlobalSearch(bravoEntry, 'content/bravo')).toBe(true)
    expect(knowledgeEntryMatchesGlobalSearch(bravoEntry, 'theme text')).toBe(true)
    expect(knowledgeEntryMatchesGlobalSearch(bravoEntry, 'missing')).toBe(false)
  })
})

describe('sortKnowledgeEntries', () => {
  test.each([
    ['stableKey', ['admin:charlie', 'repo:alpha', 'repo:bravo']],
    ['title', ['repo:alpha', 'repo:bravo', 'admin:charlie']],
    ['source', ['admin:charlie', 'repo:alpha', 'repo:bravo']],
    ['category', ['repo:bravo', 'admin:charlie', 'repo:alpha']],
    ['minTier', ['repo:bravo', 'repo:alpha', 'admin:charlie']],
    ['spoilerLevel', ['repo:alpha', 'repo:bravo', 'admin:charlie']],
    ['status', ['repo:alpha', 'repo:bravo', 'admin:charlie']],
    ['ragStatus', ['repo:alpha', 'repo:bravo', 'admin:charlie']],
    ['updatedAt', ['repo:alpha', 'repo:bravo', 'admin:charlie']],
  ] as const)('sorts stably by %s', (sortKey, expectedStableKeys) => {
    expect(sortKnowledgeEntries(entries, sortKey, false).map(sortedEntry => sortedEntry.stableKey)).toEqual(
      expectedStableKeys,
    )
  })
})

describe('buildKnowledgeFilterOptions', () => {
  test('generates options for source, category, status, min tier, spoiler, and RAG status', () => {
    expect(buildKnowledgeFilterOptions(entries)).toEqual({
      source: ['admin', 'repo'],
      category: ['career', 'fun', 'projects'],
      status: ['active', 'disabled'],
      minTier: ['0', '1', '2'],
      spoilerLevel: ['hint', 'none', 'spoiler'],
      ragStatus: ['indexed', 'pending'],
    })
  })
})

describe('knowledge column visibility helpers', () => {
  test('provides default visibility and toggles column visibility state', () => {
    expect(DEFAULT_KNOWLEDGE_COLUMN_VISIBILITY).toMatchObject({
      title: false,
      sourcePath: false,
      contentHash: false,
      importance: false,
    })

    expect(applyKnowledgeColumnVisibilityToggle(DEFAULT_KNOWLEDGE_COLUMN_VISIBILITY, 'title')).toMatchObject({
      title: true,
      sourcePath: false,
      contentHash: false,
      importance: false,
    })
  })

  test('builds resizable default column sizes with optional actions width', () => {
    expect(buildKnowledgeInitialColumnSizing(false)).toMatchObject({
      stableKey: 300,
      sourcePath: 230,
      source: 110,
      updatedAt: 120,
    })
    expect(buildKnowledgeInitialColumnSizing(false)).not.toHaveProperty('actions')
    expect(buildKnowledgeInitialColumnSizing(true)).toMatchObject({ actions: 50 })
  })
})

describe('knowledge filter token helpers', () => {
  test('counts facet values and labels active filter tokens', () => {
    expect(countKnowledgeFilterMatches(entries, 'source', 'repo')).toBe(2)
    expect(countKnowledgeFilterMatches(entries, 'ragStatus', 'pending')).toBe(1)
    expect(buildKnowledgeFilterTokenLabel('ragStatus', 'pending')).toBe('Index pending')
  })

  test('orders filter groups for inventory scanning', () => {
    expect(FILTER_DEFINITIONS.map(filter => filter.label)).toEqual([
      'Status',
      'Index',
      'Kind',
      'Category',
      'Access',
      'Spoiler',
    ])
  })

  test('supports selecting multiple values for one filter group', () => {
    expect(normalizeKnowledgeFilterValues('0')).toEqual(['0'])
    expect(normalizeKnowledgeFilterValues(['0', '1'])).toEqual(['0', '1'])
    expect(toggleKnowledgeFilterValue([], '0')).toEqual(['0'])
    expect(toggleKnowledgeFilterValue(['0'], '1')).toEqual(['0', '1'])
    expect(toggleKnowledgeFilterValue(['0', '1'], '0')).toEqual(['1'])
  })

  test('turns typed filter syntax into the same column filter chips', () => {
    const filterOptions = buildKnowledgeFilterOptions(entries)

    expect(applyKnowledgeSearchInput('access: 1', filterOptions, [])).toEqual({
      columnFilters: [{ id: 'minTier', value: ['1'] }],
      inputText: '',
      searchText: '',
    })

    expect(
      applyKnowledgeSearchInput('alpha kind: repo index: indexed access: 0', filterOptions, [
        { id: 'minTier', value: ['1'] },
      ]),
    ).toEqual({
      columnFilters: [
        { id: 'ragStatus', value: ['indexed'] },
        { id: 'source', value: ['repo'] },
        { id: 'minTier', value: ['1', '0'] },
      ],
      inputText: 'alpha',
      searchText: 'alpha',
    })
  })

  test('keeps incomplete filter syntax out of the table text query while the user is typing', () => {
    const filterOptions = buildKnowledgeFilterOptions(entries)

    expect(applyKnowledgeSearchInput('alpha access:', filterOptions, [])).toEqual({
      columnFilters: [],
      inputText: 'alpha access:',
      searchText: 'alpha',
    })
  })

  test('builds field and value autocomplete suggestions', () => {
    const filterOptions = buildKnowledgeFilterOptions(entries)

    expect(buildKnowledgeSearchSuggestions('acc', filterOptions, [])[0]).toMatchObject({
      label: 'Access:',
      nextInput: 'access: ',
    })

    expect(buildKnowledgeSearchSuggestions('access: ', filterOptions, [{ id: 'minTier', value: ['0'] }])).toEqual([
      {
        description: 'Create filter chip',
        filterId: 'minTier',
        id: 'minTier:1',
        label: 'Access 1',
        value: '1',
      },
      {
        description: 'Create filter chip',
        filterId: 'minTier',
        id: 'minTier:2',
        label: 'Access 2',
        value: '2',
      },
    ])
  })

  test('removes the last selected filter value for chip-input Backspace behavior', () => {
    expect(
      removeLastKnowledgeFilterValue([
        { id: 'source', value: ['repo'] },
        { id: 'minTier', value: ['0', '1'] },
      ]),
    ).toEqual([
      { id: 'source', value: ['repo'] },
      { id: 'minTier', value: ['0'] },
    ])

    expect(removeLastKnowledgeFilterValue([{ id: 'source', value: ['repo'] }])).toEqual([])
  })
})

describe('findKnowledgeSelectedEntry', () => {
  test('finds the selected row by stable key', () => {
    expect(findKnowledgeSelectedEntry(entries, 'admin:charlie')?.title).toBe('Charlie admin note')
    expect(findKnowledgeSelectedEntry(entries, 'missing')).toBeNull()
  })
})
