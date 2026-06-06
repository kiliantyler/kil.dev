import type { AdminWorkspaceKnowledgeEntry } from '@/lib/ask-kilian/admin-workspace-shared'
import type { AskKilianKnowledgeCategory, AskKilianSpoilerLevel } from '@/lib/ask-kilian/types'
import type { ColumnFiltersState, ColumnSizingState, VisibilityState } from '@tanstack/react-table'

export type KnowledgeTableSortKey =
  | 'stableKey'
  | 'title'
  | 'source'
  | 'category'
  | 'minTier'
  | 'spoilerLevel'
  | 'status'
  | 'ragStatus'
  | 'updatedAt'

export type KnowledgeFilterOptions = {
  source: string[]
  category: AskKilianKnowledgeCategory[]
  status: string[]
  minTier: string[]
  spoilerLevel: AskKilianSpoilerLevel[]
  ragStatus: string[]
}

export type KnowledgeColumnVisibilityKey =
  | 'title'
  | 'sourcePath'
  | 'source'
  | 'contentHash'
  | 'importance'
  | 'category'
  | 'minTier'
  | 'spoilerLevel'
export type KnowledgeFilterKey = keyof KnowledgeFilterOptions

export type KnowledgeFilterDefinition = {
  id: KnowledgeFilterKey
  label: string
}

export type KnowledgeSearchSuggestion = {
  description: string
  filterId?: KnowledgeFilterKey
  id: string
  label: string
  nextInput?: string
  value?: string
}

export const DEFAULT_KNOWLEDGE_COLUMN_VISIBILITY: VisibilityState = {
  title: false,
  sourcePath: false,
  contentHash: false,
  importance: false,
  category: false,
  spoilerLevel: false,
}

export const FILTER_DEFINITIONS: KnowledgeFilterDefinition[] = [
  { id: 'status', label: 'Status' },
  { id: 'ragStatus', label: 'Index' },
  { id: 'source', label: 'Kind' },
  { id: 'category', label: 'Category' },
  { id: 'minTier', label: 'Access' },
  { id: 'spoilerLevel', label: 'Spoiler' },
]

export const FILTER_LABELS = Object.fromEntries(FILTER_DEFINITIONS.map(filter => [filter.id, filter.label])) as Record<
  KnowledgeFilterKey,
  string
>

const FILTER_QUERY_ALIASES: Record<string, KnowledgeFilterKey> = {
  access: 'minTier',
  category: 'category',
  index: 'ragStatus',
  kind: 'source',
  rag: 'ragStatus',
  source: 'source',
  spoiler: 'spoilerLevel',
  status: 'status',
  tier: 'minTier',
}

export const FILTER_QUERY_CANONICAL_NAMES: Record<KnowledgeFilterKey, string> = {
  category: 'category',
  minTier: 'access',
  ragStatus: 'index',
  source: 'kind',
  spoilerLevel: 'spoiler',
  status: 'status',
}

const FILTER_QUERY_DESCRIPTIONS: Record<KnowledgeFilterKey, string> = {
  category: 'Filter by knowledge category',
  minTier: 'Filter by access tier',
  ragStatus: 'Filter by index state',
  source: 'Filter by entry kind',
  spoilerLevel: 'Filter by spoiler level',
  status: 'Filter by lifecycle status',
}

export function buildKnowledgeInitialColumnSizing(showActionsColumn: boolean): ColumnSizingState {
  return {
    stableKey: 300,
    sourcePath: 230,
    source: 110,
    status: 80,
    minTier: 90,
    ragStatus: 70,
    updatedAt: 120,
    ...(showActionsColumn ? { actions: 50 } : {}),
  }
}

function compareNullable(a: string | number | undefined, b: string | number | undefined) {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a ?? '').localeCompare(String(b ?? ''), undefined, { numeric: true, sensitivity: 'base' })
}

function getSortValue(entry: AdminWorkspaceKnowledgeEntry, sortKey: KnowledgeTableSortKey) {
  return entry[sortKey]
}

export function knowledgeEntryMatchesGlobalSearch(entry: AdminWorkspaceKnowledgeEntry, value: string) {
  const query = value.trim().toLowerCase()
  if (!query) return true

  return [entry.stableKey, entry.title, entry.sourcePath, entry.textSummary ?? entry.text ?? ''].some(field =>
    field.toLowerCase().includes(query),
  )
}

export function sortKnowledgeEntries(
  entries: AdminWorkspaceKnowledgeEntry[],
  sortKey: KnowledgeTableSortKey,
  desc = false,
) {
  return entries.toSorted((a, b) => {
    const primary = compareNullable(getSortValue(a, sortKey), getSortValue(b, sortKey))
    const stableTieBreak = a.stableKey.localeCompare(b.stableKey, undefined, { numeric: true, sensitivity: 'base' })
    const result = primary === 0 ? stableTieBreak : primary
    return desc ? -result : result
  })
}

function uniqueSortedStrings(values: Array<string | number | undefined>) {
  return [...new Set(values.filter(value => value !== undefined).map(String))].toSorted((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }),
  )
}

export function buildKnowledgeFilterOptions(entries: AdminWorkspaceKnowledgeEntry[]): KnowledgeFilterOptions {
  return {
    source: uniqueSortedStrings(entries.map(entry => entry.source)),
    category: uniqueSortedStrings(entries.map(entry => entry.category)) as AskKilianKnowledgeCategory[],
    status: uniqueSortedStrings(entries.map(entry => entry.status)),
    minTier: uniqueSortedStrings(entries.map(entry => entry.minTier)),
    spoilerLevel: uniqueSortedStrings(entries.map(entry => entry.spoilerLevel)) as AskKilianSpoilerLevel[],
    ragStatus: uniqueSortedStrings(entries.map(entry => entry.ragStatus)),
  }
}

export function applyKnowledgeColumnVisibilityToggle(state: VisibilityState, columnId: KnowledgeColumnVisibilityKey) {
  return { ...state, [columnId]: !(state[columnId] ?? true) }
}

export function countKnowledgeFilterMatches(
  entries: AdminWorkspaceKnowledgeEntry[],
  filterId: KnowledgeFilterKey,
  value: string,
) {
  return entries.filter(entry => String(entry[filterId] ?? '') === value).length
}

export function normalizeKnowledgeFilterValues(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean)
  if (typeof value === 'string' && value) return [value]
  return []
}

export function toggleKnowledgeFilterValue(currentValues: readonly string[], value: string) {
  return currentValues.includes(value)
    ? currentValues.filter(currentValue => currentValue !== value)
    : [...currentValues, value]
}

export function buildKnowledgeFilterTokenLabel(filterId: KnowledgeFilterKey, value: string) {
  return `${FILTER_LABELS[filterId]} ${value}`
}

function normalizeFilterQueryName(value: string) {
  return value.toLowerCase().replaceAll(/[\s_-]/g, '')
}

function stripFilterQueryValue(value: string) {
  const trimmed = value.trim()
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1).trim()
  }
  return trimmed
}

function replaceCurrentSearchFragment(input: string, replacement: string) {
  const match = input.match(/(^|\s)([^\s]*)$/)
  if (!match || match.index === undefined) return replacement
  return `${input.slice(0, match.index)}${match[1] ?? ''}${replacement}`.trimStart()
}

export function replaceCurrentFilterExpression(input: string, replacement: string) {
  const match = input.match(/(^|\s)([a-z][\w-]*)\s*:\s*([^\s]*)$/i)
  if (!match || match.index === undefined) return replacement
  return `${input.slice(0, match.index)}${match[1] ?? ''}${replacement}`.trimStart()
}

function findKnowledgeFilterOption(
  filterOptions: KnowledgeFilterOptions,
  filterId: KnowledgeFilterKey,
  rawValue: string,
) {
  const value = stripFilterQueryValue(rawValue)
  return filterOptions[filterId].find(option => option.toLowerCase() === value.toLowerCase())
}

function removeKnowledgeSearchRanges(input: string, ranges: Array<{ end: number; start: number }>) {
  if (!ranges.length) return input

  let cursor = 0
  let nextValue = ''
  for (const range of ranges.toSorted((a, b) => a.start - b.start)) {
    if (range.start < cursor) continue
    nextValue += input.slice(cursor, range.start)
    cursor = range.end
  }
  nextValue += input.slice(cursor)

  return nextValue.replaceAll(/\s+/g, ' ').trim()
}

export function applyKnowledgeSearchInput(
  rawInput: string,
  filterOptions: KnowledgeFilterOptions,
  currentFilters: ColumnFiltersState,
) {
  const nextFilterValues = new Map<KnowledgeFilterKey, string[]>()
  const passthroughFilters: ColumnFiltersState = []

  for (const filter of currentFilters) {
    const filterId = filter.id as KnowledgeFilterKey
    if (FILTER_LABELS[filterId]) {
      nextFilterValues.set(filterId, normalizeKnowledgeFilterValues(filter.value))
    } else {
      passthroughFilters.push(filter)
    }
  }

  const consumedRanges: Array<{ end: number; start: number }> = []
  const filterTokenPattern = /(^|\s)([a-z][\w-]*)\s*:\s*("[^"]+"|'[^']+'|[^\s]+)/gi

  for (const match of rawInput.matchAll(filterTokenPattern)) {
    const queryName = match[2]
    const queryValue = match[3]
    if (!queryName || !queryValue) continue

    const filterId = FILTER_QUERY_ALIASES[normalizeFilterQueryName(queryName)]
    if (!filterId) continue

    const matchedValue = findKnowledgeFilterOption(filterOptions, filterId, queryValue)
    if (!matchedValue) continue

    const currentValues = nextFilterValues.get(filterId) ?? []
    if (!currentValues.includes(matchedValue)) {
      nextFilterValues.set(filterId, [...currentValues, matchedValue])
    }
    consumedRanges.push({ start: match.index, end: match.index + match[0].length })
  }

  const pendingFilterExpression = rawInput.match(/(^|\s)([a-z][\w-]*)\s*:\s*([^\s]*)$/i)
  const pendingFilterId = pendingFilterExpression?.[2]
    ? FILTER_QUERY_ALIASES[normalizeFilterQueryName(pendingFilterExpression[2])]
    : undefined
  const pendingRange =
    pendingFilterId && pendingFilterExpression?.index !== undefined
      ? [
          {
            start: pendingFilterExpression.index,
            end: pendingFilterExpression.index + pendingFilterExpression[0].length,
          },
        ]
      : []

  if (!consumedRanges.length) {
    return {
      columnFilters: currentFilters,
      inputText: rawInput,
      searchText: removeKnowledgeSearchRanges(rawInput, pendingRange),
    }
  }

  const columnFilters = [
    ...passthroughFilters,
    ...FILTER_DEFINITIONS.flatMap(filter => {
      const values = nextFilterValues.get(filter.id) ?? []
      return values.length ? [{ id: filter.id, value: values }] : []
    }),
  ]

  const inputText = removeKnowledgeSearchRanges(rawInput, consumedRanges)

  return {
    columnFilters,
    inputText,
    searchText: removeKnowledgeSearchRanges(rawInput, [...consumedRanges, ...pendingRange]),
  }
}

export function buildKnowledgeSearchSuggestions(
  inputText: string,
  filterOptions: KnowledgeFilterOptions,
  currentFilters: ColumnFiltersState,
): KnowledgeSearchSuggestion[] {
  const activeFilterValues = new Map<KnowledgeFilterKey, string[]>()
  for (const filter of currentFilters) {
    const filterId = filter.id as KnowledgeFilterKey
    if (FILTER_LABELS[filterId]) {
      activeFilterValues.set(filterId, normalizeKnowledgeFilterValues(filter.value))
    }
  }

  const pendingFilterExpression = inputText.match(/(^|\s)([a-z][\w-]*)\s*:\s*([^\s]*)$/i)
  if (pendingFilterExpression?.[2] !== undefined && pendingFilterExpression[3] !== undefined) {
    const filterId = FILTER_QUERY_ALIASES[normalizeFilterQueryName(pendingFilterExpression[2])]
    if (!filterId) return []

    const valueFragment = pendingFilterExpression[3].toLowerCase()
    const activeValues = activeFilterValues.get(filterId) ?? []
    return filterOptions[filterId]
      .filter(value => !activeValues.includes(value) && value.toLowerCase().includes(valueFragment))
      .slice(0, 8)
      .map(value => ({
        description: 'Create filter chip',
        filterId,
        id: `${filterId}:${value}`,
        label: buildKnowledgeFilterTokenLabel(filterId, value),
        value,
      }))
  }

  const fragment = inputText.match(/(^|\s)([^\s]*)$/)?.[2]?.toLowerCase() ?? ''
  return FILTER_DEFINITIONS.filter(filter => {
    const label = filter.label.toLowerCase()
    const name = FILTER_QUERY_CANONICAL_NAMES[filter.id]
    return !fragment || label.includes(fragment) || name.includes(fragment)
  })
    .slice(0, 6)
    .map(filter => ({
      description: FILTER_QUERY_DESCRIPTIONS[filter.id],
      id: `field:${filter.id}`,
      label: `${filter.label}:`,
      nextInput: replaceCurrentSearchFragment(inputText, `${FILTER_QUERY_CANONICAL_NAMES[filter.id]}: `),
    }))
}

export function removeLastKnowledgeFilterValue(currentFilters: ColumnFiltersState): ColumnFiltersState {
  for (let index = currentFilters.length - 1; index >= 0; index -= 1) {
    const filter = currentFilters[index]
    if (!filter) continue

    const filterId = filter.id as KnowledgeFilterKey
    if (!FILTER_LABELS[filterId]) continue

    const values = normalizeKnowledgeFilterValues(filter.value)
    if (!values.length) continue

    const nextValues = values.slice(0, -1)
    return currentFilters.flatMap((currentFilter, currentIndex) => {
      if (currentIndex !== index) return [currentFilter]
      return nextValues.length ? [{ ...currentFilter, value: nextValues }] : []
    })
  }

  return currentFilters
}

export function findKnowledgeSelectedEntry(entries: AdminWorkspaceKnowledgeEntry[], stableKey: string | null) {
  if (!stableKey) return null
  return entries.find(entry => entry.stableKey === stableKey) ?? null
}
