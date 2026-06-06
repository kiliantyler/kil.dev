'use client'

import { AdminAlert, AdminPanel } from '@/components/admin/pet-gallery/admin-panel'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ChevronDown } from 'lucide-react'
import { hasAskKilianRepoSyncChanges } from '../repo-sync-preview'
import type { AskKilianAdminWorkspaceController } from '../use-ask-kilian-admin-workspace'

export type AskKilianOpsSyncPreview = NonNullable<AskKilianAdminWorkspaceController['syncPreview']>

type RepoSyncCountRow = { label: 'Created' | 'Changed' | 'Unchanged' | 'Retired' | 'Ignored admin'; value: number }
type RepoSyncKeySection = {
  label: 'Created keys' | 'Changed keys' | 'Unchanged keys' | 'Retired keys' | 'Ignored admin keys'
  keys: string[]
}

export type RepoSyncConfirmationSummary = {
  countRows: RepoSyncCountRow[]
  sections: RepoSyncKeySection[]
}

const repoSyncApplyCountLabels = new Set<RepoSyncCountRow['label']>(['Created', 'Changed', 'Retired'])
const repoSyncApplySectionLabels = new Set<RepoSyncKeySection['label']>([
  'Created keys',
  'Changed keys',
  'Retired keys',
])

export function canApplyRepoSync({
  syncPreview,
  syncPreviewStale,
  isPending,
}: Pick<AskKilianAdminWorkspaceController, 'syncPreview' | 'syncPreviewStale' | 'isPending'>) {
  return Boolean(syncPreview && hasAskKilianRepoSyncChanges(syncPreview)) && !syncPreviewStale && !isPending
}

export function buildRepoSyncConfirmationSummary(syncPreview: AskKilianOpsSyncPreview): RepoSyncConfirmationSummary {
  const { created, changed, unchanged, retired, ignoredAdmin } = syncPreview.counts

  return {
    countRows: [
      { label: 'Created', value: created },
      { label: 'Changed', value: changed },
      { label: 'Unchanged', value: unchanged },
      { label: 'Retired', value: retired },
      { label: 'Ignored admin', value: ignoredAdmin },
    ],
    sections: [
      { label: 'Created keys', keys: syncPreview.keys.created },
      { label: 'Changed keys', keys: syncPreview.keys.changed },
      { label: 'Unchanged keys', keys: syncPreview.keys.unchanged },
      { label: 'Retired keys', keys: syncPreview.keys.retired },
      { label: 'Ignored admin keys', keys: syncPreview.keys.ignoredAdmin },
    ],
  }
}

export function getRepoSyncApplyKeySections(summary: RepoSyncConfirmationSummary) {
  return summary.sections.filter(section => repoSyncApplySectionLabels.has(section.label) && section.keys.length > 0)
}

function getApplyRepoSyncDisabledReason({
  syncPreview,
  syncPreviewStale,
  isPending,
}: Pick<AskKilianAdminWorkspaceController, 'syncPreview' | 'syncPreviewStale' | 'isPending'>) {
  if (syncPreview) {
    if (syncPreviewStale) return 'Run a fresh preview before applying.'
    if (isPending) return 'Wait for the current request to finish.'
    if (!hasAskKilianRepoSyncChanges(syncPreview)) return 'No repo changes to apply.'
    return null
  }

  return 'Run a preview before applying.'
}

export function OpsTab({ workspace }: { workspace: AskKilianAdminWorkspaceController }) {
  const syncPreview = workspace.syncPreview
  const confirmationSummary = syncPreview ? buildRepoSyncConfirmationSummary(syncPreview) : null
  const applyDisabled = !canApplyRepoSync(workspace)
  const applyDisabledReason = getApplyRepoSyncDisabledReason(workspace)
  const previewLabel = syncPreview?.dryRun ? 'Dry-run preview' : 'Applied sync summary'
  const previewStatus = workspace.syncPreviewStale ? 'stale' : applyDisabled ? 'locked' : 'ready to apply'

  return (
    <AdminPanel data-testid="ask-kilian-ops-tab" className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">Ops</h2>
          <p className="text-sm text-muted-foreground">Preview repo knowledge changes before applying them.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={workspace.actions.previewRepoSync} disabled={workspace.isPending}>
            Preview repo sync
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" disabled={applyDisabled}>
                Apply repo sync
              </Button>
            </AlertDialogTrigger>
            {confirmationSummary ? (
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Apply repo sync?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Apply the latest repo sync preview to Ask Kilian knowledge. This does not generate a response.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <RepoSyncApplyConfirmation summary={confirmationSummary} />
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction type="button" disabled={applyDisabled} onClick={workspace.actions.applyRepoSync}>
                    Apply repo sync
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            ) : null}
          </AlertDialog>
        </div>
      </div>
      {applyDisabledReason ? <p className="text-xs text-muted-foreground">{applyDisabledReason}</p> : null}

      {workspace.opsError ? <AdminAlert>{workspace.opsError}</AdminAlert> : null}

      {syncPreview ? (
        <div className="grid gap-4 border-y border-border bg-muted/15 py-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold">{previewLabel}</h3>
              <p className="text-xs text-muted-foreground">Latest repo sync report</p>
            </div>
            <p className="border-l border-border py-1 pl-3 text-xs text-muted-foreground">{previewStatus}</p>
          </div>
          {confirmationSummary ? <RepoSyncSummary summary={confirmationSummary} /> : null}
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
          Run a preview before applying repo knowledge changes.
        </div>
      )}

      {workspace.isPending && syncPreview ? (
        <p className="text-xs text-muted-foreground">Keeping the latest preview visible while the request finishes.</p>
      ) : null}
    </AdminPanel>
  )
}

function RepoSyncApplyConfirmation({ summary }: { summary: RepoSyncConfirmationSummary }) {
  const changedRows = summary.countRows.filter(row => repoSyncApplyCountLabels.has(row.label) && row.value > 0)
  const keySections = getRepoSyncApplyKeySections(summary)
  const unchanged = summary.countRows.find(row => row.label === 'Unchanged')?.value ?? 0
  const ignoredAdmin = summary.countRows.find(row => row.label === 'Ignored admin')?.value ?? 0

  return (
    <div className="grid gap-3 border-y border-border py-3">
      {changedRows.length ? (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          {changedRows.map(row => (
            <div key={row.label} className="flex items-baseline justify-between gap-4">
              <dt className="text-muted-foreground">{row.label}</dt>
              <dd className="font-semibold tabular-nums">{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-sm text-muted-foreground">No created, changed, or retired entries.</p>
      )}
      {keySections.length ? (
        <div className="grid gap-2">
          <p className="text-xs font-medium text-muted-foreground uppercase">Affected keys</p>
          <ScrollArea className="h-48 border-l border-border">
            <div className="grid gap-3 py-1 pl-3 text-xs">
              {keySections.map(section => (
                <section key={section.label} className="grid gap-1">
                  <h4 className="font-medium">{section.label}</h4>
                  <ul className="grid gap-1">
                    {section.keys.map(key => (
                      <li key={key} className="font-mono break-all text-muted-foreground">
                        {key}
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </ScrollArea>
        </div>
      ) : null}
      <p className="text-xs text-muted-foreground">{unchanged} entries are unchanged.</p>
      {ignoredAdmin > 0 ? (
        <p className="text-xs text-muted-foreground">{ignoredAdmin} admin entries are ignored.</p>
      ) : null}
    </div>
  )
}

function RepoSyncSummary({ summary }: { summary: RepoSyncConfirmationSummary }) {
  return (
    <div className="grid gap-4">
      <dl className="grid grid-cols-2 border-y border-border text-sm md:grid-cols-5">
        {summary.countRows.map(row => (
          <div key={row.label} className="border-border px-3 py-3 not-last:border-r max-md:border-b">
            <dt className="text-xs text-muted-foreground uppercase">{row.label}</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums">{row.value}</dd>
          </div>
        ))}
      </dl>
      <div className="divide-y divide-border border-y border-border">
        {summary.sections.map(section => (
          <Collapsible key={section.label} defaultOpen={section.keys.length > 0} className="group/collapsible min-w-0">
            <section className="min-w-0 py-3">
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <span className="flex min-w-0 items-center gap-2">
                    <ChevronDown
                      aria-hidden="true"
                      className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]/collapsible:rotate-180"
                    />
                    <span className="truncate text-sm font-medium">{section.label}</span>
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">{section.keys.length}</span>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2">
                  {section.keys.length > 0 ? (
                    <ScrollArea className="h-40 border-l border-border">
                      <ul className="grid gap-1 py-1 pl-3 text-xs">
                        {section.keys.map(key => (
                          <li key={key} className="font-mono break-all text-muted-foreground">
                            {key}
                          </li>
                        ))}
                      </ul>
                    </ScrollArea>
                  ) : (
                    <p className="text-xs text-muted-foreground">No {section.label.toLowerCase()}.</p>
                  )}
                </div>
              </CollapsibleContent>
            </section>
          </Collapsible>
        ))}
      </div>
    </div>
  )
}
