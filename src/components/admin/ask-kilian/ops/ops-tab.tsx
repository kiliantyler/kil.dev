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
import { ScrollArea } from '@/components/ui/scroll-area'
import type { AskKilianAdminWorkspaceController } from '../use-ask-kilian-admin-workspace'

export type AskKilianOpsSyncPreview = NonNullable<AskKilianAdminWorkspaceController['syncPreview']>

export type RepoSyncConfirmationSummary = {
  leadText: string
  countRows: { label: 'Created' | 'Changed' | 'Unchanged' | 'Retired' | 'Ignored admin'; value: number }[]
  sections: {
    label: 'Created keys' | 'Changed keys' | 'Unchanged keys' | 'Retired keys' | 'Ignored admin keys'
    keys: string[]
  }[]
}

export function canApplyRepoSync({
  syncPreview,
  syncPreviewStale,
  isPending,
}: Pick<AskKilianAdminWorkspaceController, 'syncPreview' | 'syncPreviewStale' | 'isPending'>) {
  return Boolean(syncPreview) && !syncPreviewStale && !isPending
}

export function buildRepoSyncConfirmationSummary(syncPreview: AskKilianOpsSyncPreview): RepoSyncConfirmationSummary {
  const { created, changed, unchanged, retired, ignoredAdmin } = syncPreview.counts

  return {
    leadText: `Latest preview will create ${created} entries, change ${changed} entries, leave ${unchanged} entries unchanged, retire ${retired} entries, and ignore ${ignoredAdmin} admin entries.`,
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

export function OpsTab({ workspace }: { workspace: AskKilianAdminWorkspaceController }) {
  const syncPreview = workspace.syncPreview
  const confirmationSummary = syncPreview ? buildRepoSyncConfirmationSummary(syncPreview) : null
  const applyDisabled = !canApplyRepoSync(workspace)

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
                  <AlertDialogDescription>{confirmationSummary.leadText}</AlertDialogDescription>
                </AlertDialogHeader>
                <RepoSyncSummary summary={confirmationSummary} />
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction type="button" onClick={workspace.actions.applyRepoSync}>
                    Apply repo sync
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            ) : null}
          </AlertDialog>
        </div>
      </div>

      {workspace.opsError ? <AdminAlert>{workspace.opsError}</AdminAlert> : null}

      {syncPreview ? (
        <div className="grid gap-4 rounded-md border border-border bg-muted/20 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold">Latest preview</h3>
              <p className="text-xs text-muted-foreground">
                {syncPreview.dryRun ? 'Dry run summary' : 'Applied sync summary'}
              </p>
            </div>
            {workspace.syncPreviewStale ? (
              <p className="rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground">
                Preview is stale
              </p>
            ) : null}
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

function RepoSyncSummary({ summary }: { summary: RepoSyncConfirmationSummary }) {
  return (
    <div className="grid gap-4">
      <dl className="grid grid-cols-2 gap-2 text-sm md:grid-cols-5">
        {summary.countRows.map(row => (
          <div key={row.label} className="rounded-md border border-border bg-background p-3">
            <dt className="text-xs text-muted-foreground uppercase">{row.label}</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums">{row.value}</dd>
          </div>
        ))}
      </dl>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {summary.sections.map(section => (
          <div key={section.label} className="min-w-0 rounded-md border border-border bg-background">
            <div className="border-b border-border px-3 py-2 text-sm font-medium">{section.label}</div>
            <ScrollArea className="max-h-40">
              {section.keys.length > 0 ? (
                <ul className="grid gap-1 p-3 text-xs">
                  {section.keys.map(key => (
                    <li key={key} className="rounded-sm bg-muted px-2 py-1 font-mono break-all text-muted-foreground">
                      {key}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="p-3 text-xs text-muted-foreground">No {section.label.toLowerCase()}.</p>
              )}
            </ScrollArea>
          </div>
        ))}
      </div>
    </div>
  )
}
