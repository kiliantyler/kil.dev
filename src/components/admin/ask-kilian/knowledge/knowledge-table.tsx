'use client'

import { adminInputClassName } from '@/components/admin/pet-gallery/admin-panel'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { AdminWorkspaceKnowledgeEntry } from '@/lib/ask-kilian/admin-workspace'
import type { AskKilianKnowledgeCategory, AskKilianSpoilerLevel } from '@/lib/ask-kilian/types'
import { cn } from '@/utils/utils'
import {
  type ColumnDef,
  type ColumnFiltersState,
  type ColumnSizingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ArrowDown, ArrowUp, Check, ChevronsUpDown, Columns3, Filter, MoreHorizontal, Search, X } from 'lucide-react'
import { type KeyboardEvent as ReactKeyboardEvent, useEffect, useMemo, useRef, useState } from 'react'

type KnowledgeTableSortKey =
  | 'stableKey'
  | 'title'
  | 'source'
  | 'category'
  | 'minTier'
  | 'spoilerLevel'
  | 'status'
  | 'ragStatus'
  | 'updatedAt'

type KnowledgeFilterOptions = {
  source: string[]
  category: AskKilianKnowledgeCategory[]
  status: string[]
  minTier: string[]
  spoilerLevel: AskKilianSpoilerLevel[]
  ragStatus: string[]
}

type KnowledgeColumnVisibilityKey =
  | 'title'
  | 'sourcePath'
  | 'source'
  | 'contentHash'
  | 'importance'
  | 'category'
  | 'minTier'
  | 'spoilerLevel'
type KnowledgeFilterKey = keyof KnowledgeFilterOptions

type KnowledgeFilterDefinition = {
  id: KnowledgeFilterKey
  label: string
}

type KnowledgeSearchSuggestion = {
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

const FILTER_LABELS = Object.fromEntries(FILTER_DEFINITIONS.map(filter => [filter.id, filter.label])) as Record<
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

const FILTER_QUERY_CANONICAL_NAMES: Record<KnowledgeFilterKey, string> = {
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

const COLUMN_LABELS: Record<string, string> = {
  stableKey: 'Entry',
  sourcePath: 'Source path',
  title: 'Title',
  source: 'Kind',
  category: 'Category',
  status: 'Status',
  minTier: 'Access',
  spoilerLevel: 'Spoiler',
  ragStatus: 'Index',
  updatedAt: 'Updated',
  contentHash: 'Content hash',
  importance: 'Importance',
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

function replaceCurrentFilterExpression(input: string, replacement: string) {
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

function formatTimestamp(value: number | undefined) {
  if (!value) return 'n/a'
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

function formatFullTimestamp(value: number | undefined) {
  if (!value) return 'n/a'
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

function tableHeaderAriaSort(sorted: false | 'asc' | 'desc') {
  if (sorted === 'asc') return 'ascending'
  if (sorted === 'desc') return 'descending'
}

function HeaderButton({
  column,
  label,
  sorted,
}: {
  column: {
    getToggleSortingHandler: () => ((event: unknown) => void) | undefined
  }
  label: string
  sorted: false | 'asc' | 'desc'
}) {
  const Icon = sorted === 'asc' ? ArrowUp : sorted === 'desc' ? ArrowDown : ChevronsUpDown
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn(
        '-ml-2 h-8 px-2 text-xs font-semibold tracking-[0.02em] uppercase',
        sorted ? 'text-foreground' : 'text-muted-foreground',
      )}
      aria-label={`Sort by ${label}${sorted ? `, currently ${sorted}` : ''}`}
      onClick={column.getToggleSortingHandler()}>
      {label}
      <Icon aria-hidden="true" className={cn(!sorted && 'opacity-45')} />
    </Button>
  )
}

function statusBadgeClassName(value: string | undefined) {
  if (value === 'active' || value === 'ready' || value === 'indexed') {
    return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
  }
  if (value === 'pending' || value === 'disabled') {
    return 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300'
  }
  if (value === 'retired' || value === 'failed' || value === 'error') {
    return 'border-destructive/25 bg-destructive/10 text-destructive'
  }
  return 'border-border bg-muted text-muted-foreground'
}

function StatusBadge({ value }: { value: string | undefined }) {
  return (
    <Badge variant="outline" className={cn('capitalize', statusBadgeClassName(value))}>
      {value ?? 'n/a'}
    </Badge>
  )
}

function EntryActionsMenu({
  entry,
  onEditEntry,
  onDisableEntry,
  onReenableEntry,
}: {
  entry: AdminWorkspaceKnowledgeEntry
  onEditEntry: (stableKey: string) => void
  onDisableEntry: (stableKey: string) => void
  onReenableEntry: (stableKey: string) => void
}) {
  if (entry.source !== 'admin' || entry.status === 'retired') return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={`Actions for ${entry.stableKey}`}
          onClick={event => event.stopPropagation()}>
          <MoreHorizontal aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => onEditEntry(entry.stableKey)}>Edit</DropdownMenuItem>
        {entry.status === 'disabled' ? (
          <DropdownMenuItem onSelect={() => onReenableEntry(entry.stableKey)}>Re-enable</DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={() => onDisableEntry(entry.stableKey)}>Disable</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function knowledgeColumnResponsiveClassName(columnId: string) {
  switch (columnId) {
    case 'actions':
    case 'sourcePath':
    case 'source':
    case 'minTier':
    case 'updatedAt':
      return 'hidden md:table-cell'
  }
}

type KnowledgeTableProps = {
  entries: AdminWorkspaceKnowledgeEntry[]
  selectedStableKey: string | null
  onSelectEntry: (stableKey: string) => void
  onEditEntry: (stableKey: string) => void
  onDisableEntry: (stableKey: string) => void
  onReenableEntry: (stableKey: string) => void
  onStableKeyButtonRef?: (stableKey: string, element: HTMLButtonElement | null) => void
  isPending?: boolean
}

export function KnowledgeTable({
  entries,
  selectedStableKey,
  onSelectEntry,
  onEditEntry,
  onDisableEntry,
  onReenableEntry,
  onStableKeyButtonRef,
  isPending = false,
}: KnowledgeTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'stableKey', desc: false }])
  const [globalFilter, setGlobalFilter] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [searchSuggestionsEnabled, setSearchSuggestionsEnabled] = useState(false)
  const [activeSearchSuggestionIndex, setActiveSearchSuggestionIndex] = useState(0)
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(DEFAULT_KNOWLEDGE_COLUMN_VISIBILITY)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const desktopScrollRef = useRef<HTMLDivElement>(null)
  const mobileScrollRef = useRef<HTMLDivElement>(null)
  const filterOptions = useMemo(() => buildKnowledgeFilterOptions(entries), [entries])
  const showActionsColumn = useMemo(
    () => entries.some(entry => entry.source === 'admin' && entry.status !== 'retired'),
    [entries],
  )
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>(() =>
    buildKnowledgeInitialColumnSizing(showActionsColumn),
  )

  const columns = useMemo<ColumnDef<AdminWorkspaceKnowledgeEntry>[]>(() => {
    const baseColumns: ColumnDef<AdminWorkspaceKnowledgeEntry>[] = [
      {
        id: 'stableKey',
        accessorKey: 'stableKey',
        minSize: 220,
        size: 300,
        header: ({ column }) => <HeaderButton column={column} label="Entry" sorted={column.getIsSorted()} />,
        cell: ({ row }) => {
          const entry = row.original
          const selected = entry.stableKey === selectedStableKey
          return (
            <Button
              type="button"
              variant="ghostLink"
              size="sm"
              className="h-auto min-w-0 flex-col items-start justify-start gap-0 px-0 py-0 text-left"
              aria-current={selected ? 'true' : undefined}
              ref={element => onStableKeyButtonRef?.(entry.stableKey, element)}
              onClick={event => {
                event.stopPropagation()
                onSelectEntry(entry.stableKey)
              }}>
              <span className="max-w-72 truncate font-medium text-foreground" title={entry.title}>
                {entry.title}
              </span>
              <span className="max-w-72 truncate font-mono text-xs text-muted-foreground" title={entry.stableKey}>
                {entry.stableKey}
              </span>
            </Button>
          )
        },
      },
      {
        id: 'sourcePath',
        accessorKey: 'sourcePath',
        minSize: 160,
        size: 230,
        header: ({ column }) => <HeaderButton column={column} label="Source path" sorted={column.getIsSorted()} />,
        cell: ({ row }) => (
          <span
            className="block max-w-64 truncate font-mono text-xs text-muted-foreground"
            title={row.original.sourcePath}>
            {row.original.sourcePath}
          </span>
        ),
      },
      {
        id: 'title',
        accessorKey: 'title',
        minSize: 180,
        size: 240,
        header: ({ column }) => <HeaderButton column={column} label="Title" sorted={column.getIsSorted()} />,
        cell: ({ row }) => (
          <span className="block max-w-56 truncate font-medium" title={row.original.title}>
            {row.original.title}
          </span>
        ),
      },
      {
        id: 'source',
        accessorKey: 'source',
        minSize: 90,
        size: 110,
        header: ({ column }) => <HeaderButton column={column} label="Kind" sorted={column.getIsSorted()} />,
        cell: ({ row }) => (
          <div className="flex min-w-0 flex-col">
            <span>{row.original.source}</span>
            <span className="text-xs text-muted-foreground">{row.original.category}</span>
          </div>
        ),
        filterFn: (row, _columnId, value) => {
          const selectedValues = normalizeKnowledgeFilterValues(value)
          return selectedValues.length === 0 || selectedValues.includes(row.original.source)
        },
      },
      {
        id: 'category',
        accessorKey: 'category',
        minSize: 100,
        size: 120,
        header: ({ column }) => <HeaderButton column={column} label="Category" sorted={column.getIsSorted()} />,
        filterFn: (row, _columnId, value) => {
          const selectedValues = normalizeKnowledgeFilterValues(value)
          return selectedValues.length === 0 || selectedValues.includes(row.original.category)
        },
      },
      {
        id: 'status',
        accessorKey: 'status',
        minSize: 78,
        size: 80,
        header: ({ column }) => <HeaderButton column={column} label="Status" sorted={column.getIsSorted()} />,
        cell: ({ row }) => <StatusBadge value={row.original.status} />,
        filterFn: (row, _columnId, value) => {
          const selectedValues = normalizeKnowledgeFilterValues(value)
          return selectedValues.length === 0 || selectedValues.includes(row.original.status)
        },
      },
      {
        id: 'minTier',
        accessorKey: 'minTier',
        minSize: 82,
        size: 90,
        header: ({ column }) => <HeaderButton column={column} label="Access" sorted={column.getIsSorted()} />,
        cell: ({ row }) => (
          <div className="flex min-w-0 flex-col">
            <span>tier {row.original.minTier}</span>
            <span className="text-xs text-muted-foreground">{row.original.spoilerLevel}</span>
          </div>
        ),
        filterFn: (row, _columnId, value) => {
          const selectedValues = normalizeKnowledgeFilterValues(value)
          return selectedValues.length === 0 || selectedValues.includes(String(row.original.minTier))
        },
      },
      {
        id: 'spoilerLevel',
        accessorKey: 'spoilerLevel',
        minSize: 90,
        size: 110,
        header: ({ column }) => <HeaderButton column={column} label="Spoiler" sorted={column.getIsSorted()} />,
        filterFn: (row, _columnId, value) => {
          const selectedValues = normalizeKnowledgeFilterValues(value)
          return selectedValues.length === 0 || selectedValues.includes(row.original.spoilerLevel)
        },
      },
      {
        id: 'ragStatus',
        accessorKey: 'ragStatus',
        minSize: 70,
        size: 70,
        header: ({ column }) => <HeaderButton column={column} label="Index" sorted={column.getIsSorted()} />,
        cell: ({ row }) => <StatusBadge value={row.original.ragStatus} />,
        filterFn: (row, _columnId, value) => {
          const selectedValues = normalizeKnowledgeFilterValues(value)
          return selectedValues.length === 0 || selectedValues.includes(row.original.ragStatus ?? '')
        },
      },
      {
        id: 'updatedAt',
        accessorKey: 'updatedAt',
        minSize: 110,
        size: 120,
        header: ({ column }) => <HeaderButton column={column} label="Updated" sorted={column.getIsSorted()} />,
        cell: ({ row }) => (
          <span title={formatFullTimestamp(row.original.updatedAt)}>{formatTimestamp(row.original.updatedAt)}</span>
        ),
      },
      {
        id: 'contentHash',
        accessorKey: 'contentHash',
        minSize: 120,
        size: 150,
        header: 'Hash',
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.contentHash.slice(0, 12)}</span>,
      },
      {
        id: 'importance',
        accessorKey: 'importance',
        minSize: 110,
        size: 120,
        header: 'Importance',
      },
    ]

    if (!showActionsColumn) return baseColumns

    return [
      ...baseColumns,
      {
        id: 'actions',
        enableHiding: false,
        enableResizing: false,
        enableSorting: false,
        size: 50,
        header: '',
        cell: ({ row }) => (
          <EntryActionsMenu
            entry={row.original}
            onEditEntry={onEditEntry}
            onDisableEntry={onDisableEntry}
            onReenableEntry={onReenableEntry}
          />
        ),
      },
    ]
  }, [
    onDisableEntry,
    onEditEntry,
    onReenableEntry,
    onSelectEntry,
    onStableKeyButtonRef,
    selectedStableKey,
    showActionsColumn,
  ])

  const table = useReactTable({
    data: entries,
    columns,
    state: { sorting, globalFilter, columnFilters, columnVisibility, columnSizing },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnSizingChange: setColumnSizing,
    columnResizeMode: 'onChange',
    enableColumnResizing: true,
    globalFilterFn: (row, _columnId, value) => knowledgeEntryMatchesGlobalSearch(row.original, String(value)),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })
  const visibleRows = table.getRowModel().rows
  const desktopRowVirtualizer = useVirtualizer({
    count: visibleRows.length,
    estimateSize: () => 57,
    getItemKey: index => visibleRows[index]?.id ?? index,
    getScrollElement: () => desktopScrollRef.current,
    overscan: 8,
  })
  const mobileRowVirtualizer = useVirtualizer({
    count: visibleRows.length,
    estimateSize: () => 104,
    getItemKey: index => visibleRows[index]?.id ?? index,
    getScrollElement: () => mobileScrollRef.current,
    overscan: 6,
  })
  const desktopVirtualRows = desktopRowVirtualizer.getVirtualItems()
  const desktopPaddingTop = desktopVirtualRows[0]?.start ?? 0
  const desktopPaddingBottom = Math.max(0, desktopRowVirtualizer.getTotalSize() - (desktopVirtualRows.at(-1)?.end ?? 0))
  const mobileVirtualRows = mobileRowVirtualizer.getVirtualItems()
  const mobilePaddingTop = mobileVirtualRows[0]?.start ?? 0
  const mobilePaddingBottom = Math.max(0, mobileRowVirtualizer.getTotalSize() - (mobileVirtualRows.at(-1)?.end ?? 0))

  const activeFilters = columnFilters.flatMap(filter => {
    const id = filter.id as KnowledgeFilterKey
    if (!FILTER_LABELS[id]) return []
    return normalizeKnowledgeFilterValues(filter.value).map(value => ({
      id,
      value,
      label: buildKnowledgeFilterTokenLabel(id, value),
    }))
  })
  const searchSuggestions = useMemo(
    () => buildKnowledgeSearchSuggestions(searchInput, filterOptions, columnFilters),
    [columnFilters, filterOptions, searchInput],
  )
  const showSearchSuggestions = searchSuggestionsEnabled && searchSuggestions.length > 0

  useEffect(() => {
    setActiveSearchSuggestionIndex(0)
  }, [searchSuggestions])

  useEffect(() => {
    function focusSearch(event: KeyboardEvent) {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target
      if (target instanceof HTMLElement && target.closest('input, textarea, [contenteditable="true"]')) return
      event.preventDefault()
      searchInputRef.current?.focus()
    }
    globalThis.addEventListener('keydown', focusSearch)
    return () => globalThis.removeEventListener('keydown', focusSearch)
  }, [])

  useEffect(() => {
    desktopRowVirtualizer.scrollToOffset(0)
    mobileRowVirtualizer.scrollToOffset(0)
  }, [desktopRowVirtualizer, globalFilter, mobileRowVirtualizer, sorting, columnFilters])

  useEffect(() => {
    setColumnSizing(current => {
      const baseSizing = buildKnowledgeInitialColumnSizing(showActionsColumn)
      const nextSizing: ColumnSizingState = {}
      for (const [columnId, size] of Object.entries(baseSizing)) {
        nextSizing[columnId] = current[columnId] ?? size
      }
      return nextSizing
    })
  }, [showActionsColumn])

  function toggleFilter(columnId: KnowledgeFilterKey, value: string) {
    table.getColumn(columnId)?.setFilterValue((currentValue: unknown) => {
      const nextValues = toggleKnowledgeFilterValue(normalizeKnowledgeFilterValues(currentValue), value)
      return nextValues.length ? nextValues : undefined
    })
  }

  function clearFilter(columnId: KnowledgeFilterKey) {
    table.getColumn(columnId)?.setFilterValue(undefined)
  }

  function clearFilterValue(columnId: KnowledgeFilterKey, value: string) {
    table.getColumn(columnId)?.setFilterValue((currentValue: unknown) => {
      const nextValues = normalizeKnowledgeFilterValues(currentValue).filter(current => current !== value)
      return nextValues.length ? nextValues : undefined
    })
  }

  function clearAllFilters() {
    setGlobalFilter('')
    setSearchInput('')
    setColumnFilters([])
  }

  function updateSearchInput(value: string) {
    const nextSearchState = applyKnowledgeSearchInput(value, filterOptions, columnFilters)
    setSearchInput(nextSearchState.inputText)
    setGlobalFilter(nextSearchState.searchText)
    setColumnFilters(nextSearchState.columnFilters)
    setSearchSuggestionsEnabled(true)
  }

  function selectSearchSuggestion(suggestion: KnowledgeSearchSuggestion) {
    if (suggestion.filterId && suggestion.value) {
      updateSearchInput(
        replaceCurrentFilterExpression(
          searchInput,
          `${FILTER_QUERY_CANONICAL_NAMES[suggestion.filterId]}: ${suggestion.value}`,
        ),
      )
    } else if (suggestion.nextInput !== undefined) {
      updateSearchInput(suggestion.nextInput)
    }
    searchInputRef.current?.focus()
  }

  function handleSearchKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (
      event.key === 'Backspace' &&
      searchInput === '' &&
      event.currentTarget.selectionStart === 0 &&
      event.currentTarget.selectionEnd === 0 &&
      activeFilters.length
    ) {
      event.preventDefault()
      setColumnFilters(currentFilters => removeLastKnowledgeFilterValue(currentFilters))
      return
    }

    if (!showSearchSuggestions) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveSearchSuggestionIndex(current => (current + 1) % searchSuggestions.length)
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveSearchSuggestionIndex(current => (current - 1 + searchSuggestions.length) % searchSuggestions.length)
      return
    }

    if (event.key === 'Enter' || event.key === 'Tab') {
      const suggestion = searchSuggestions[activeSearchSuggestionIndex]
      if (!suggestion) return
      event.preventDefault()
      selectSearchSuggestion(suggestion)
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      setSearchSuggestionsEnabled(false)
    }
  }

  return (
    <div className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-background shadow-sm">
      <div className="border-b border-border bg-muted/30 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-baseline gap-2">
            <span className="text-xs text-muted-foreground">
              {entries.length} entries · {table.getFilteredRowModel().rows.length} visible
              {isPending ? ' · updating' : ''}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {globalFilter || activeFilters.length ? (
              <Button type="button" variant="ghost" size="sm" onClick={clearAllFilters}>
                Clear all
              </Button>
            ) : null}
            <KnowledgeFilterPopover
              entries={entries}
              filterOptions={filterOptions}
              activeFilters={activeFilters}
              onClearFilter={clearFilter}
              onToggleFilter={toggleFilter}
            />
            <div className="hidden md:block">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" size="sm">
                    <Columns3 aria-hidden="true" />
                    Columns
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {table
                    .getAllLeafColumns()
                    .filter(column => column.getCanHide())
                    .map(column => (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        checked={column.getIsVisible()}
                        onCheckedChange={value => column.toggleVisibility(Boolean(value))}
                        onSelect={event => event.preventDefault()}>
                        {COLUMN_LABELS[column.id] ?? column.id}
                      </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
        <div className="relative mt-3 flex min-h-10 min-w-0 flex-wrap items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1.5 shadow-xs focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
          <Search aria-hidden="true" className="text-muted-foreground" />
          {activeFilters.map(filter => (
            <Badge key={`${filter.id}:${filter.value}`} variant="outline" className="gap-1 bg-muted/60">
              {filter.label}
              <button
                type="button"
                className="rounded-full text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                aria-label={`Remove ${filter.label} filter`}
                onClick={() => clearFilterValue(filter.id, filter.value)}>
                <X aria-hidden="true" />
              </button>
            </Badge>
          ))}
          <input
            ref={searchInputRef}
            aria-label="Search knowledge entries"
            className={cn(
              adminInputClassName,
              'h-7 min-w-48 flex-1 border-0 bg-transparent px-1 shadow-none outline-none focus-visible:ring-0',
            )}
            role="combobox"
            aria-activedescendant={
              showSearchSuggestions ? `knowledge-search-suggestion-${activeSearchSuggestionIndex}` : undefined
            }
            aria-autocomplete="list"
            aria-controls="knowledge-search-suggestions"
            aria-expanded={showSearchSuggestions}
            value={searchInput}
            onChange={event => updateSearchInput(event.currentTarget.value)}
            onFocus={() => setSearchSuggestionsEnabled(true)}
            onBlur={() => setSearchSuggestionsEnabled(false)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search key, title, path, or summary"
          />
          <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">
            /
          </kbd>
          {showSearchSuggestions ? (
            <div
              id="knowledge-search-suggestions"
              role="listbox"
              className="absolute top-[calc(100%+0.35rem)] right-0 left-0 z-30 overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md">
              <div className="max-h-72 overflow-auto p-1">
                {searchSuggestions.map((suggestion, index) => (
                  <button
                    key={suggestion.id}
                    id={`knowledge-search-suggestion-${index}`}
                    type="button"
                    role="option"
                    aria-selected={activeSearchSuggestionIndex === index}
                    className={cn(
                      'flex w-full items-center justify-between gap-3 rounded-sm px-2 py-2 text-left text-sm outline-none',
                      activeSearchSuggestionIndex === index && 'bg-accent text-accent-foreground',
                    )}
                    onMouseDown={event => event.preventDefault()}
                    onMouseEnter={() => setActiveSearchSuggestionIndex(index)}
                    onClick={() => selectSearchSuggestion(suggestion)}>
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{suggestion.label}</span>
                      <span className="block truncate text-xs text-muted-foreground">{suggestion.description}</span>
                    </span>
                    {suggestion.filterId && suggestion.value ? (
                      <Badge variant="outline" className="bg-background">
                        {countKnowledgeFilterMatches(entries, suggestion.filterId, suggestion.value)}
                      </Badge>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
      <div ref={mobileScrollRef} className="max-h-[min(68vh,42rem)] overflow-auto md:hidden">
        {visibleRows.length ? (
          <div className="divide-y divide-border">
            {mobilePaddingTop ? <div aria-hidden="true" style={{ height: mobilePaddingTop }} /> : null}
            {mobileVirtualRows.map(virtualRow => {
              const row = visibleRows[virtualRow.index]
              if (!row) return null
              const entry = row.original
              const selected = entry.stableKey === selectedStableKey
              return (
                <div
                  key={row.id}
                  ref={node => {
                    if (node) mobileRowVirtualizer.measureElement(node)
                  }}
                  role="button"
                  tabIndex={0}
                  data-index={virtualRow.index}
                  data-state={selected ? 'selected' : undefined}
                  className="flex min-w-0 cursor-pointer items-start gap-3 px-4 py-3 transition-colors outline-none hover:bg-muted/40 focus-visible:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring data-[state=selected]:bg-muted/60"
                  onClick={() => onSelectEntry(entry.stableKey)}
                  onKeyDown={event => {
                    if (event.key !== 'Enter' && event.key !== ' ') return
                    event.preventDefault()
                    onSelectEntry(entry.stableKey)
                  }}>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-foreground" title={entry.title}>
                      {entry.title}
                    </div>
                    <div className="truncate font-mono text-xs text-muted-foreground" title={entry.stableKey}>
                      {entry.stableKey}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <StatusBadge value={entry.status} />
                      <StatusBadge value={entry.ragStatus} />
                      <Badge variant="outline" className="bg-muted/50 capitalize">
                        {entry.source}
                      </Badge>
                      <Badge variant="outline" className="bg-muted/50 capitalize">
                        tier {entry.minTier}
                      </Badge>
                    </div>
                    <div className="mt-2 truncate font-mono text-[11px] text-muted-foreground" title={entry.sourcePath}>
                      {entry.sourcePath}
                    </div>
                  </div>
                  <EntryActionsMenu
                    entry={entry}
                    onEditEntry={onEditEntry}
                    onDisableEntry={onDisableEntry}
                    onReenableEntry={onReenableEntry}
                  />
                </div>
              )
            })}
            {mobilePaddingBottom ? <div aria-hidden="true" style={{ height: mobilePaddingBottom }} /> : null}
          </div>
        ) : (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No knowledge entries match the current filters.
          </div>
        )}
      </div>
      <div
        ref={desktopScrollRef}
        className="hidden max-h-[min(64vh,44rem)] overflow-auto md:block"
        data-testid="knowledge-table-virtual-scroll">
        <Table
          containerClassName="overflow-visible"
          className="table-fixed"
          style={{ width: table.getTotalSize(), minWidth: '100%' }}>
          <colgroup>
            {table.getVisibleLeafColumns().map(column => (
              <col key={column.id} style={{ width: column.getSize() }} />
            ))}
          </colgroup>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <TableHead
                    key={header.id}
                    className={cn(
                      'group/header sticky top-0 z-10 overflow-hidden bg-background/95 pr-1 backdrop-blur',
                      knowledgeColumnResponsiveClassName(header.column.id),
                    )}
                    style={{ width: header.getSize() }}
                    aria-sort={tableHeaderAriaSort(header.column.getIsSorted())}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getCanResize() ? (
                      <button
                        type="button"
                        aria-label={`Resize ${COLUMN_LABELS[header.column.id] ?? header.column.id} column`}
                        className={cn(
                          'absolute top-1 right-0 bottom-1 w-2 cursor-col-resize rounded-sm opacity-50 transition-opacity outline-none group-hover/header:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring',
                          header.column.getIsResizing() && 'bg-primary opacity-100',
                        )}
                        onClick={event => event.stopPropagation()}
                        onMouseDown={event => {
                          event.stopPropagation()
                          header.getResizeHandler()(event)
                        }}
                        onTouchStart={event => {
                          event.stopPropagation()
                          header.getResizeHandler()(event)
                        }}>
                        <span aria-hidden="true" className="mx-auto block h-full w-px bg-border" />
                      </button>
                    ) : null}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {visibleRows.length ? (
              <>
                {desktopPaddingTop ? (
                  <TableRow aria-hidden="true">
                    <TableCell colSpan={table.getVisibleLeafColumns().length} style={{ height: desktopPaddingTop }} />
                  </TableRow>
                ) : null}
                {desktopVirtualRows.map(virtualRow => {
                  const row = visibleRows[virtualRow.index]
                  if (!row) return null
                  return (
                    <TableRow
                      key={row.id}
                      ref={node => {
                        if (node) desktopRowVirtualizer.measureElement(node)
                      }}
                      className="cursor-pointer"
                      data-index={virtualRow.index}
                      data-state={row.original.stableKey === selectedStableKey ? 'selected' : undefined}
                      onClick={() => onSelectEntry(row.original.stableKey)}>
                      {row.getVisibleCells().map(cell => (
                        <TableCell
                          key={cell.id}
                          className={cn('overflow-hidden', knowledgeColumnResponsiveClassName(cell.column.id))}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  )
                })}
                {desktopPaddingBottom ? (
                  <TableRow aria-hidden="true">
                    <TableCell
                      colSpan={table.getVisibleLeafColumns().length}
                      style={{ height: desktopPaddingBottom }}
                    />
                  </TableRow>
                ) : null}
              </>
            ) : (
              <TableRow>
                <TableCell
                  colSpan={table.getVisibleLeafColumns().length}
                  className="h-24 text-center text-muted-foreground">
                  No knowledge entries match the current filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function KnowledgeFilterPopover({
  entries,
  filterOptions,
  activeFilters,
  onClearFilter,
  onToggleFilter,
}: {
  entries: AdminWorkspaceKnowledgeEntry[]
  filterOptions: KnowledgeFilterOptions
  activeFilters: Array<{ id: KnowledgeFilterKey; value: string; label: string }>
  onClearFilter: (columnId: KnowledgeFilterKey) => void
  onToggleFilter: (columnId: KnowledgeFilterKey, value: string) => void
}) {
  const [activeFilterId, setActiveFilterId] = useState<KnowledgeFilterKey>('status')
  const activeFilterValues = new Map<KnowledgeFilterKey, string[]>()
  for (const filter of activeFilters) {
    activeFilterValues.set(filter.id, [...(activeFilterValues.get(filter.id) ?? []), filter.value])
  }
  const activeFilter = FILTER_DEFINITIONS.find(filter => filter.id === activeFilterId) ?? FILTER_DEFINITIONS[0]!
  const activeOptions = filterOptions[activeFilter.id]
  const activeValues = activeFilterValues.get(activeFilter.id) ?? []
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Filter aria-hidden="true" />
          Filter
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[calc(100vw-2rem)] max-w-2xl p-0">
        <div className="border-b border-border px-3 py-2">
          <p className="text-sm font-medium">Add filter</p>
          <p className="text-xs text-muted-foreground">
            Pick a group, then choose one or more values. Active filters appear in the search bar.
          </p>
        </div>
        <div className="grid min-h-72 sm:grid-cols-[13rem_minmax(0,1fr)]">
          <ScrollArea className="border-b border-border sm:border-r sm:border-b-0">
            <div className="grid gap-1 p-2">
              {FILTER_DEFINITIONS.map(filter => {
                const selectedValues = activeFilterValues.get(filter.id) ?? []
                const isActive = activeFilter.id === filter.id
                return (
                  <Button
                    key={filter.id}
                    type="button"
                    variant={isActive ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-auto justify-between gap-3 px-2 py-2 text-left"
                    aria-pressed={isActive}
                    onClick={() => setActiveFilterId(filter.id)}>
                    <span className="flex min-w-0 flex-col items-start">
                      <span className="text-sm font-medium">{filter.label}</span>
                      <span className="max-w-36 truncate text-xs text-muted-foreground">
                        {selectedValues.length
                          ? `${selectedValues.length} selected`
                          : `${filterOptions[filter.id].length} values`}
                      </span>
                    </span>
                    {selectedValues.length ? (
                      <Badge variant="outline" className="bg-background">
                        {selectedValues.length}
                      </Badge>
                    ) : null}
                  </Button>
                )
              })}
            </div>
          </ScrollArea>
          <div className="min-w-0">
            <div className="flex min-h-12 items-center justify-between gap-3 border-b border-border px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-medium">{activeFilter.label}</p>
                <p className="text-xs text-muted-foreground">
                  {activeValues.length ? `${activeValues.length} selected` : `${activeOptions.length} available values`}
                </p>
              </div>
              {activeValues.length ? (
                <Button type="button" variant="ghost" size="sm" onClick={() => onClearFilter(activeFilter.id)}>
                  Clear
                </Button>
              ) : null}
            </div>
            <ScrollArea className="h-60">
              <div className="grid gap-1 p-2">
                {activeOptions.map(value => {
                  const selected = activeValues.includes(value)
                  const count = countKnowledgeFilterMatches(entries, activeFilter.id, value)
                  return (
                    <Button
                      key={`${activeFilter.id}:${value}`}
                      type="button"
                      variant={selected ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-9 justify-between gap-3 px-2"
                      aria-pressed={selected}
                      onClick={() => onToggleFilter(activeFilter.id, value)}>
                      <span className="flex min-w-0 items-center gap-2">
                        <Check aria-hidden="true" className={cn('size-4', selected ? 'opacity-100' : 'opacity-0')} />
                        <span className="truncate">{value}</span>
                      </span>
                      <Badge variant="outline" className={cn('bg-background', selected && 'border-primary/40')}>
                        {count}
                      </Badge>
                    </Button>
                  )
                })}
              </div>
            </ScrollArea>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
