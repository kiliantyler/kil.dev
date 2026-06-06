'use client'

import { AdminAlert, AdminPanel } from '@/components/admin/admin-panel'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { AdminWorkspaceKnowledgeEntry } from '@/lib/ask-kilian/admin-workspace-shared'
import { useRef, useState } from 'react'
import type { AskKilianAdminWorkspaceController } from '../use-ask-kilian-admin-workspace'
import { EntryEditorDialog } from './entry-editor-dialog'
import { KnowledgeDetail } from './knowledge-detail'
import { KnowledgeTable } from './knowledge-table'

export function getEditableEntryForEditor({
  entries,
  selectedDetail,
  stableKey,
}: {
  entries: AdminWorkspaceKnowledgeEntry[]
  selectedDetail: AdminWorkspaceKnowledgeEntry | null
  stableKey: string | null
}) {
  if (!stableKey) return null
  const listEntry = entries.find(entry => entry.stableKey === stableKey && entry.source === 'admin')
  if (!listEntry || listEntry.status === 'retired') return null
  if (
    selectedDetail?.stableKey === stableKey &&
    selectedDetail.source === 'admin' &&
    selectedDetail.status !== 'retired'
  ) {
    return selectedDetail
  }
  return listEntry.text ? listEntry : null
}

export function KnowledgeTab({ workspace }: { workspace: AskKilianAdminWorkspaceController }) {
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingStableKey, setEditingStableKey] = useState<string | null>(null)
  const [editingEntryDetail, setEditingEntryDetail] = useState<AdminWorkspaceKnowledgeEntry | null>(null)
  const [editLoadingStableKey, setEditLoadingStableKey] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const stableKeyButtonRefs = useRef(new Map<string, HTMLButtonElement>())
  const editingEntry = getEditableEntryForEditor({
    entries: workspace.state.entries,
    selectedDetail: editingEntryDetail ?? workspace.selectedDetail,
    stableKey: editingStableKey,
  })

  async function openEditEditor(stableKey: string) {
    const entry = workspace.state.entries.find(
      candidate => candidate.stableKey === stableKey && candidate.source === 'admin' && candidate.status !== 'retired',
    )
    if (!entry) return
    setEditLoadingStableKey(stableKey)
    try {
      const detail = await workspace.actions.loadEntryDetail(stableKey)
      if (!detail || detail.stableKey !== stableKey || detail.source !== 'admin' || detail.status === 'retired') return
      setEditingStableKey(stableKey)
      setEditingEntryDetail(detail)
      setDetailOpen(false)
      setEditorOpen(true)
    } finally {
      setEditLoadingStableKey(current => (current === stableKey ? null : current))
    }
  }

  function selectEntry(stableKey: string) {
    workspace.actions.selectEntry(stableKey)
    setDetailOpen(true)
  }

  function setStableKeyButtonRef(stableKey: string, element: HTMLButtonElement | null) {
    if (element) stableKeyButtonRefs.current.set(stableKey, element)
    else stableKeyButtonRefs.current.delete(stableKey)
  }

  function closeDetail() {
    setDetailOpen(false)
    const stableKey = workspace.selectedEntry?.stableKey
    if (!stableKey) return
    globalThis.requestAnimationFrame(() => stableKeyButtonRefs.current.get(stableKey)?.focus())
  }

  return (
    <AdminPanel data-testid="ask-kilian-knowledge-tab" className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">Knowledge</h2>
          <p className="text-sm text-muted-foreground">Review repo-synced and manually curated Ask Kilian context.</p>
        </div>
      </div>
      {workspace.knowledgeError ? <AdminAlert>{workspace.knowledgeError}</AdminAlert> : null}
      <KnowledgeTable
        entries={workspace.state.entries}
        selectedStableKey={workspace.selectedEntry?.stableKey ?? null}
        onSelectEntry={selectEntry}
        onEditEntry={openEditEditor}
        onDisableEntry={workspace.actions.disableEntry}
        onReenableEntry={workspace.actions.reenableEntry}
        onStableKeyButtonRef={setStableKeyButtonRef}
        isPending={workspace.isPending || editLoadingStableKey !== null}
      />
      <Dialog open={detailOpen} onOpenChange={open => (open ? setDetailOpen(true) : closeDetail())}>
        <DialogContent className="max-h-[88vh] overflow-hidden sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Knowledge detail</DialogTitle>
            <DialogDescription>{workspace.selectedDetail?.stableKey ?? 'Loading entry detail'}</DialogDescription>
          </DialogHeader>
          <KnowledgeDetail entry={workspace.selectedDetail} onEditEntry={openEditEditor} />
        </DialogContent>
      </Dialog>
      <EntryEditorDialog
        open={editorOpen && editingEntry !== null}
        entry={editingEntry}
        entries={workspace.state.entries}
        onOpenChange={open => {
          setEditorOpen(open)
          if (!open) {
            setEditingStableKey(null)
            setEditingEntryDetail(null)
          }
        }}
        onSave={workspace.actions.saveEntry}
        isPending={workspace.isPending}
      />
    </AdminPanel>
  )
}
