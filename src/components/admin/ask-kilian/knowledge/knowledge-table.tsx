'use client'

import { adminInputClassName } from '@/components/admin/pet-gallery/admin-panel'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { AdminWorkspaceKnowledgeEntry } from '@/lib/ask-kilian/admin-workspace'
import type { AskKilianKnowledgeCategory, AskKilianSpoilerLevel } from '@/lib/ask-kilian/types'
import { cn } from '@/utils/utils'
import {
  type ColumnDef,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ChevronsUpDown, Columns3, MoreHorizontal } from 'lucide-react'
import { useMemo, useState } from 'react'

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

type KnowledgeColumnVisibilityKey = 'sourcePath' | 'contentHash' | 'importance'

export const DEFAULT_KNOWLEDGE_COLUMN_VISIBILITY: VisibilityState = {
  sourcePath: false,
  contentHash: false,
  importance: false,
}

const FILTER_ALL_VALUE = '__all__'

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

  return [entry.stableKey, entry.title, entry.sourcePath, entry.text ?? ''].some(field =>
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

export function findKnowledgeSelectedEntry(entries: AdminWorkspaceKnowledgeEntry[], stableKey: string | null) {
  if (!stableKey) return null
  return entries.find(entry => entry.stableKey === stableKey) ?? null
}

function formatTimestamp(value: number | undefined) {
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
}: {
  column: { toggleSorting: (desc?: boolean) => void; getIsSorted: () => false | 'asc' | 'desc' }
  label: string
}) {
  const sorted = column.getIsSorted()
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="-ml-2 h-8 px-2"
      onClick={() => column.toggleSorting(sorted === 'asc')}>
      {label}
      {sorted === 'asc' ? <ArrowUp aria-hidden="true" /> : null}
      {sorted === 'desc' ? <ArrowDown aria-hidden="true" /> : null}
      {sorted === false ? <ChevronsUpDown aria-hidden="true" /> : null}
    </Button>
  )
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
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(DEFAULT_KNOWLEDGE_COLUMN_VISIBILITY)
  const filterOptions = useMemo(() => buildKnowledgeFilterOptions(entries), [entries])

  const columns = useMemo<ColumnDef<AdminWorkspaceKnowledgeEntry>[]>(
    () => [
      {
        id: 'stableKey',
        accessorKey: 'stableKey',
        header: ({ column }) => <HeaderButton column={column} label="Stable key" />,
        cell: ({ row }) => {
          const entry = row.original
          const selected = entry.stableKey === selectedStableKey
          return (
            <Button
              type="button"
              variant="ghostLink"
              size="sm"
              className="h-auto min-w-0 justify-start px-0 py-0 text-left font-mono text-xs whitespace-normal"
              aria-current={selected ? 'true' : undefined}
              ref={element => onStableKeyButtonRef?.(entry.stableKey, element)}
              onClick={() => onSelectEntry(entry.stableKey)}>
              {entry.stableKey}
            </Button>
          )
        },
      },
      {
        id: 'title',
        accessorKey: 'title',
        header: ({ column }) => <HeaderButton column={column} label="Title" />,
        cell: ({ row }) => <span className="block max-w-56 truncate font-medium">{row.original.title}</span>,
      },
      {
        id: 'source',
        accessorKey: 'source',
        header: ({ column }) => <HeaderButton column={column} label="Source" />,
        filterFn: (row, _columnId, value) => value === FILTER_ALL_VALUE || row.original.source === value,
      },
      {
        id: 'category',
        accessorKey: 'category',
        header: ({ column }) => <HeaderButton column={column} label="Category" />,
        filterFn: (row, _columnId, value) => value === FILTER_ALL_VALUE || row.original.category === value,
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: ({ column }) => <HeaderButton column={column} label="Status" />,
        filterFn: (row, _columnId, value) => value === FILTER_ALL_VALUE || row.original.status === value,
      },
      {
        id: 'minTier',
        accessorKey: 'minTier',
        header: ({ column }) => <HeaderButton column={column} label="Tier" />,
        filterFn: (row, _columnId, value) => value === FILTER_ALL_VALUE || String(row.original.minTier) === value,
      },
      {
        id: 'spoilerLevel',
        accessorKey: 'spoilerLevel',
        header: ({ column }) => <HeaderButton column={column} label="Spoiler" />,
        filterFn: (row, _columnId, value) => value === FILTER_ALL_VALUE || row.original.spoilerLevel === value,
      },
      {
        id: 'ragStatus',
        accessorKey: 'ragStatus',
        header: ({ column }) => <HeaderButton column={column} label="RAG" />,
        cell: ({ row }) => row.original.ragStatus ?? 'n/a',
        filterFn: (row, _columnId, value) => value === FILTER_ALL_VALUE || row.original.ragStatus === value,
      },
      {
        id: 'updatedAt',
        accessorKey: 'updatedAt',
        header: ({ column }) => <HeaderButton column={column} label="Updated" />,
        cell: ({ row }) => formatTimestamp(row.original.updatedAt),
      },
      {
        id: 'sourcePath',
        accessorKey: 'sourcePath',
        header: 'Source path',
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.sourcePath}</span>,
      },
      {
        id: 'contentHash',
        accessorKey: 'contentHash',
        header: 'Hash',
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.contentHash.slice(0, 12)}</span>,
      },
      {
        id: 'importance',
        accessorKey: 'importance',
        header: 'Importance',
      },
      {
        id: 'actions',
        enableHiding: false,
        enableSorting: false,
        header: '',
        cell: ({ row }) => {
          const entry = row.original
          return entry.source === 'admin' ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="ghost" size="sm" aria-label={`Actions for ${entry.stableKey}`}>
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
          ) : null
        },
      },
    ],
    [onDisableEntry, onEditEntry, onReenableEntry, onSelectEntry, onStableKeyButtonRef, selectedStableKey],
  )

  const table = useReactTable({
    data: entries,
    columns,
    state: { sorting, globalFilter, columnFilters, columnVisibility },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    globalFilterFn: (row, _columnId, value) => knowledgeEntryMatchesGlobalSearch(row.original, String(value)),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 25 } },
  })

  function setFilter(columnId: string, value: string) {
    table.getColumn(columnId)?.setFilterValue(value === FILTER_ALL_VALUE ? undefined : value)
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-col gap-3">
        <input
          aria-label="Search knowledge entries"
          className={cn(adminInputClassName, 'w-full')}
          value={globalFilter}
          onChange={event => setGlobalFilter(event.currentTarget.value)}
          placeholder="Search stable keys, titles, paths, and text"
        />
        <div className="flex flex-wrap items-center gap-2">
          <KnowledgeFilterSelect
            label="Source"
            values={filterOptions.source}
            onChange={value => setFilter('source', value)}
          />
          <KnowledgeFilterSelect
            label="Category"
            values={filterOptions.category}
            onChange={value => setFilter('category', value)}
          />
          <KnowledgeFilterSelect
            label="Status"
            values={filterOptions.status}
            onChange={value => setFilter('status', value)}
          />
          <KnowledgeFilterSelect
            label="Tier"
            values={filterOptions.minTier}
            onChange={value => setFilter('minTier', value)}
          />
          <KnowledgeFilterSelect
            label="Spoiler"
            values={filterOptions.spoilerLevel}
            onChange={value => setFilter('spoilerLevel', value)}
          />
          <KnowledgeFilterSelect
            label="RAG"
            values={filterOptions.ragStatus}
            onChange={value => setFilter('ragStatus', value)}
          />
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
                  <DropdownMenuItem key={column.id} onSelect={() => column.toggleVisibility()}>
                    {column.getIsVisible() ? 'Hide' : 'Show'} {column.id}
                  </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map(headerGroup => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <TableHead key={header.id} aria-sort={tableHeaderAriaSort(header.column.getIsSorted())}>
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map(row => (
              <TableRow key={row.id} data-state={row.original.stableKey === selectedStableKey ? 'selected' : undefined}>
                {row.getVisibleCells().map(cell => (
                  <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                No knowledge entries match the current filters.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>
          {table.getFilteredRowModel().rows.length} entries
          {isPending ? ' - updating' : ''}
        </span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}>
            Previous
          </Button>
          <span>
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}>
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}

function KnowledgeFilterSelect({
  label,
  values,
  onChange,
}: {
  label: string
  values: string[]
  onChange: (value: string) => void
}) {
  return (
    <Select defaultValue={FILTER_ALL_VALUE} onValueChange={onChange}>
      <SelectTrigger size="sm" aria-label={`${label} filter`} className="min-w-28">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value={FILTER_ALL_VALUE}>All {label.toLowerCase()}</SelectItem>
          {values.map(value => (
            <SelectItem key={value} value={value}>
              {value}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
