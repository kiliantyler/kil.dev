'use client'

import { AdminAlert, AdminPanel } from '@/components/admin/pet-gallery/admin-panel'
import {
  BottomDrawer,
  BottomDrawerContent,
  BottomDrawerDescription,
  BottomDrawerHeader,
  BottomDrawerTitle,
} from '@/components/ui/bottom-drawer'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { useRef, useState } from 'react'
import type { AskKilianAdminWorkspaceController } from '../use-ask-kilian-admin-workspace'
import { EntryEditorDialog } from './entry-editor-dialog'
import { KnowledgeDetail } from './knowledge-detail'
import { KnowledgeTable } from './knowledge-table'

export function KnowledgeTab({ workspace }: { workspace: AskKilianAdminWorkspaceController }) {
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingStableKey, setEditingStableKey] = useState<string | null>(null)
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false)
  const stableKeyButtonRefs = useRef(new Map<string, HTMLButtonElement>())
  const editingEntry =
    editingStableKey === null
      ? null
      : (workspace.state.entries.find(entry => entry.stableKey === editingStableKey && entry.source === 'admin') ??
        null)

  function openCreateEditor() {
    setEditingStableKey(null)
    setEditorOpen(true)
  }

  function openEditEditor(stableKey: string) {
    const entry = workspace.state.entries.find(
      candidate => candidate.stableKey === stableKey && candidate.source === 'admin' && candidate.status !== 'retired',
    )
    if (!entry) return
    workspace.actions.selectEntry(stableKey)
    setEditingStableKey(stableKey)
    setMobileDetailOpen(false)
    setEditorOpen(true)
  }

  function selectEntry(stableKey: string) {
    workspace.actions.selectEntry(stableKey)
    if (typeof globalThis.matchMedia === 'function' && globalThis.matchMedia('(max-width: 1023px)').matches) {
      setMobileDetailOpen(true)
    }
  }

  function setStableKeyButtonRef(stableKey: string, element: HTMLButtonElement | null) {
    if (element) stableKeyButtonRefs.current.set(stableKey, element)
    else stableKeyButtonRefs.current.delete(stableKey)
  }

  function closeMobileDetail() {
    setMobileDetailOpen(false)
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
        <Button type="button" onClick={openCreateEditor}>
          New admin entry
        </Button>
      </div>
      {workspace.knowledgeError ? <AdminAlert>{workspace.knowledgeError}</AdminAlert> : null}
      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(22rem,0.85fr)]">
        <KnowledgeTable
          entries={workspace.state.entries}
          selectedStableKey={workspace.selectedEntry?.stableKey ?? null}
          onSelectEntry={selectEntry}
          onEditEntry={openEditEditor}
          onDisableEntry={workspace.actions.disableEntry}
          onReenableEntry={workspace.actions.reenableEntry}
          onStableKeyButtonRef={setStableKeyButtonRef}
          isPending={workspace.isPending}
        />
        <aside className="hidden min-h-0 lg:block">
          <KnowledgeDetail entry={workspace.selectedDetail} onEditEntry={openEditEditor} />
        </aside>
      </div>
      <BottomDrawer
        open={mobileDetailOpen}
        onOpenChange={open => (open ? setMobileDetailOpen(true) : closeMobileDetail())}>
        <BottomDrawerContent className="max-h-[85vh] px-4 pb-4 lg:hidden">
          <BottomDrawerHeader className="px-0 text-left">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <BottomDrawerTitle>Knowledge detail</BottomDrawerTitle>
                <BottomDrawerDescription>
                  {workspace.selectedDetail?.stableKey ?? 'No entry selected'}
                </BottomDrawerDescription>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Close knowledge detail"
                onClick={closeMobileDetail}>
                <X aria-hidden="true" />
              </Button>
            </div>
          </BottomDrawerHeader>
          <KnowledgeDetail entry={workspace.selectedDetail} onEditEntry={openEditEditor} />
        </BottomDrawerContent>
      </BottomDrawer>
      <EntryEditorDialog
        open={editorOpen}
        entry={editingEntry}
        entries={workspace.state.entries}
        onOpenChange={setEditorOpen}
        onSave={workspace.actions.saveEntry}
        isPending={workspace.isPending}
      />
    </AdminPanel>
  )
}
