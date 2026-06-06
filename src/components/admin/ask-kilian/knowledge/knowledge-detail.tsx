'use client'

import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { AdminWorkspaceKnowledgeEntry } from '@/lib/ask-kilian/admin-workspace'

type KnowledgeDetailProps = {
  entry: AdminWorkspaceKnowledgeEntry | null
  onEditEntry?: (stableKey: string) => void
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

function MetadataRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-3 border-t border-border/60 py-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 font-medium break-words">{value ?? 'n/a'}</dd>
    </div>
  )
}

export function KnowledgeDetail({ entry, onEditEntry }: KnowledgeDetailProps) {
  if (!entry) {
    return (
      <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
        Select a knowledge entry to inspect its metadata and source text.
      </div>
    )
  }

  const pendingCleanupIds = entry.pendingRagEntryCleanupIds?.length ? entry.pendingRagEntryCleanupIds.join(', ') : 'n/a'

  return (
    <div className="flex min-h-0 flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold">{entry.title}</h3>
        </div>
        {entry.source === 'admin' && entry.status !== 'retired' && onEditEntry ? (
          <Button type="button" variant="outline" size="sm" onClick={() => onEditEntry(entry.stableKey)}>
            Edit
          </Button>
        ) : null}
      </div>
      {entry.source === 'repo' ? (
        <p className="border-l border-border py-1 pl-3 text-sm text-muted-foreground">
          Repo entry. Edit the source file and run repo sync.
        </p>
      ) : null}
      <div className="grid min-h-0 gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(22rem,0.85fr)]">
        <ScrollArea className="max-h-[32rem] rounded-md border border-border bg-muted/20">
          <pre className="p-4 text-sm leading-6 whitespace-pre-wrap">{entry.text ?? 'No source text loaded.'}</pre>
        </ScrollArea>
        <ScrollArea className="max-h-[32rem] rounded-md border border-border">
          <dl className="p-4">
            <MetadataRow label="Stable key" value={<span className="font-mono text-xs">{entry.stableKey}</span>} />
            <MetadataRow label="Title" value={entry.title} />
            <MetadataRow label="Source" value={entry.source} />
            <MetadataRow label="Category" value={entry.category} />
            <MetadataRow label="Status" value={entry.status} />
            <MetadataRow label="Min tier" value={entry.minTier} />
            <MetadataRow label="Spoiler" value={entry.spoilerLevel} />
            <MetadataRow label="Source path" value={<span className="font-mono text-xs">{entry.sourcePath}</span>} />
            <MetadataRow label="Content hash" value={<span className="font-mono text-xs">{entry.contentHash}</span>} />
            <MetadataRow label="Importance" value={entry.importance} />
            <MetadataRow label="RAG entry ID" value={entry.ragEntryId ?? 'n/a'} />
            <MetadataRow label="RAG status" value={entry.ragStatus ?? 'n/a'} />
            <MetadataRow label="RAG filter" value={entry.ragFilterVersion ?? 'n/a'} />
            <MetadataRow label="Cleanup IDs" value={pendingCleanupIds} />
            <MetadataRow label="Created" value={formatTimestamp(entry.createdAt)} />
            <MetadataRow label="Updated" value={formatTimestamp(entry.updatedAt)} />
            <MetadataRow label="Retired" value={formatTimestamp(entry.retiredAt)} />
          </dl>
        </ScrollArea>
      </div>
    </div>
  )
}
