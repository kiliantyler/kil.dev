'use client'

import {
  AdminAlert,
  adminInputClassName,
  adminSmallInputClassName,
  adminTextareaClassName,
} from '@/components/admin/admin-panel'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  assertAdminEditStableKeyAllowed,
  normalizeAdminKnowledgeSlug,
  validateAdminKnowledgeEntryInput,
  type AdminKnowledgeEntrySaveInput,
  type AdminWorkspaceKnowledgeEntry,
} from '@/lib/ask-kilian/admin-workspace-shared'
import {
  ASK_KILIAN_CATEGORIES,
  ASK_KILIAN_SPOILER_LEVELS,
  ASK_KILIAN_TIERS,
  type AskKilianKnowledgeCategory,
  type AskKilianSpoilerLevel,
  type AskKilianTier,
} from '@/lib/ask-kilian/types'
import { cn } from '@/utils/utils'
import { useEffect, useMemo, useState } from 'react'

export type EntryEditorDraft = {
  slug: string
  title: string
  category: AskKilianKnowledgeCategory
  minTier: AskKilianTier
  spoilerLevel: AskKilianSpoilerLevel
  importance: number
  text: string
}

type EntryEditorValidationResult =
  | { ok: true; input: AdminKnowledgeEntrySaveInput; normalizedSlug: string }
  | {
      ok: false
      message: string
      fieldErrors?: Partial<Record<keyof EntryEditorDraft, string>>
      normalizedSlug: string
    }

function slugFromStableKey(stableKey: string) {
  return stableKey.startsWith('admin:') ? stableKey.slice('admin:'.length) : stableKey
}

export function buildEntryEditorDraft(entry: AdminWorkspaceKnowledgeEntry): EntryEditorDraft {
  return {
    slug: slugFromStableKey(entry.stableKey),
    title: entry.title,
    category: entry.category,
    minTier: entry.minTier,
    spoilerLevel: entry.spoilerLevel,
    importance: entry.importance,
    text: entry.text ?? '',
  }
}

export function applyEntryEditorTitleChange(draft: EntryEditorDraft, nextTitle: string): EntryEditorDraft {
  return { ...draft, title: nextTitle }
}

export function buildEntryEditorSaveInput(
  draft: EntryEditorDraft,
  entry: AdminWorkspaceKnowledgeEntry,
): AdminKnowledgeEntrySaveInput {
  return {
    mode: 'edit',
    originalStableKey: entry.stableKey as `admin:${string}`,
    currentStatus: entry.status === 'disabled' ? 'disabled' : 'active',
    slug: draft.slug,
    title: draft.title,
    category: draft.category,
    minTier: draft.minTier,
    spoilerLevel: draft.spoilerLevel,
    importance: draft.importance,
    text: draft.text,
  }
}

export function validateEntryEditorDraftForSave(
  draft: EntryEditorDraft,
  entry: AdminWorkspaceKnowledgeEntry,
  existingStableKeys: Set<string>,
): EntryEditorValidationResult {
  const validation = validateAdminKnowledgeEntryInput(draft)
  if (!validation.ok) {
    return {
      ok: false,
      message: Object.values(validation.errors)[0] ?? 'Invalid Ask Kilian admin entry',
      fieldErrors: validation.errors,
      normalizedSlug: validation.normalizedSlug,
    }
  }

  const input = buildEntryEditorSaveInput(draft, entry)
  try {
    assertAdminEditStableKeyAllowed(input, existingStableKeys)
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Unable to save Ask Kilian admin entry',
      normalizedSlug: validation.normalizedSlug,
    }
  }

  return { ok: true, input, normalizedSlug: validation.normalizedSlug }
}

export function isEntryEditorDraftDirty(draft: EntryEditorDraft, entry: AdminWorkspaceKnowledgeEntry) {
  const baseline = buildEntryEditorDraft(entry)
  return JSON.stringify(draft) !== JSON.stringify(baseline)
}

export function resolveEntryEditorCloseRequest({
  saving,
  nextOpen,
  draft,
  entry,
}: {
  saving: boolean
  nextOpen: boolean
  draft: EntryEditorDraft
  entry: AdminWorkspaceKnowledgeEntry
}) {
  if (!nextOpen && saving) return 'keep-open'
  if (nextOpen || !isEntryEditorDraftDirty(draft, entry)) return 'set-open'
  return 'confirm-discard'
}

type EntryEditorDialogProps = {
  open: boolean
  entry: AdminWorkspaceKnowledgeEntry
  entries: AdminWorkspaceKnowledgeEntry[]
  onOpenChange: (open: boolean) => void
  onSave: (input: AdminKnowledgeEntrySaveInput) => Promise<void> | void
  isPending?: boolean
}

export function EntryEditorDialog({
  open,
  entry,
  entries,
  onOpenChange,
  onSave,
  isPending = false,
}: EntryEditorDialogProps) {
  const [draft, setDraft] = useState<EntryEditorDraft>(() => buildEntryEditorDraft(entry))
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof EntryEditorDraft, string>>>({})
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const existingStableKeys = useMemo(() => new Set(entries.map(knowledgeEntry => knowledgeEntry.stableKey)), [entries])
  const normalizedSlug = normalizeAdminKnowledgeSlug(draft.slug)
  const finalStableKey = normalizedSlug ? `admin:${normalizedSlug}` : 'admin:'
  const repoEntryPassed = entry?.source === 'repo'

  useEffect(() => {
    if (!open) return
    setDraft(buildEntryEditorDraft(entry))
    setError(null)
    setFieldErrors({})
    setConfirmDiscardOpen(false)
    setSaving(false)
  }, [entry, open])

  function requestOpenChange(nextOpen: boolean) {
    const closeRequest = resolveEntryEditorCloseRequest({ saving, nextOpen, draft, entry })
    if (closeRequest === 'keep-open') return
    if (closeRequest === 'set-open') {
      onOpenChange(nextOpen)
      return
    }
    setConfirmDiscardOpen(true)
  }

  function updateDraft<K extends keyof EntryEditorDraft>(key: K, value: EntryEditorDraft[K]) {
    setDraft(current => ({ ...current, [key]: value }))
    setFieldErrors(current => ({ ...current, [key]: undefined }))
    setError(null)
  }

  function updateTitle(title: string) {
    setDraft(current => applyEntryEditorTitleChange(current, title))
    setFieldErrors(current => ({ ...current, title: undefined, slug: undefined }))
    setError(null)
  }

  async function handleSave() {
    if (repoEntryPassed) return
    const result = validateEntryEditorDraftForSave(draft, entry, existingStableKeys)
    if (!result.ok) {
      setError(result.message)
      setFieldErrors(result.fieldErrors ?? {})
      return
    }
    setSaving(true)
    try {
      await onSave(result.input)
      onOpenChange(false)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save Ask Kilian entry')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={requestOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit admin entry</DialogTitle>
            <DialogDescription>Manage manually curated Ask Kilian knowledge entries.</DialogDescription>
          </DialogHeader>
          {repoEntryPassed ? (
            <AdminAlert>Repo entries are not editable here. Edit the source file and run repo sync.</AdminAlert>
          ) : (
            <form
              className="flex flex-col gap-4"
              onSubmit={event => {
                event.preventDefault()
                void handleSave()
              }}>
              {error ? <AdminAlert>{error}</AdminAlert> : null}
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Slug" error={fieldErrors.slug}>
                  <input
                    className={cn(adminInputClassName, 'w-full')}
                    value={draft.slug}
                    onChange={event => updateDraft('slug', event.currentTarget.value)}
                    required
                  />
                </Field>
                <Field label="Final stable key">
                  <output className="flex h-9 items-center rounded-md border border-border bg-muted/40 px-3 font-mono text-sm">
                    {finalStableKey}
                  </output>
                </Field>
              </div>
              <Field label="Title" error={fieldErrors.title}>
                <input
                  className={cn(adminInputClassName, 'w-full')}
                  value={draft.title}
                  onChange={event => updateTitle(event.currentTarget.value)}
                  required
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-4">
                <Field label="Category" error={fieldErrors.category}>
                  <Select
                    value={draft.category}
                    onValueChange={value => updateDraft('category', value as AskKilianKnowledgeCategory)}>
                    <SelectTrigger aria-label="Category" className="w-full" size="sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {ASK_KILIAN_CATEGORIES.map(category => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Min tier" error={fieldErrors.minTier}>
                  <Select
                    value={String(draft.minTier)}
                    onValueChange={value => updateDraft('minTier', Number(value) as AskKilianTier)}>
                    <SelectTrigger aria-label="Minimum tier" className="w-full" size="sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {ASK_KILIAN_TIERS.map(tier => (
                          <SelectItem key={tier} value={String(tier)}>
                            {tier}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Spoiler" error={fieldErrors.spoilerLevel}>
                  <Select
                    value={draft.spoilerLevel}
                    onValueChange={value => updateDraft('spoilerLevel', value as AskKilianSpoilerLevel)}>
                    <SelectTrigger aria-label="Spoiler level" className="w-full" size="sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {ASK_KILIAN_SPOILER_LEVELS.map(level => (
                          <SelectItem key={level} value={level}>
                            {level}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Importance" error={fieldErrors.importance}>
                  <input
                    className={cn(adminSmallInputClassName, 'w-full')}
                    type="number"
                    min="0"
                    max="1"
                    step="0.05"
                    value={draft.importance}
                    onChange={event => updateDraft('importance', Number(event.currentTarget.value))}
                    required
                  />
                </Field>
              </div>
              <Field label="Text" error={fieldErrors.text}>
                <textarea
                  className={cn(adminTextareaClassName, 'min-h-52 w-full')}
                  value={draft.text}
                  onChange={event => updateDraft('text', event.currentTarget.value)}
                  required
                />
              </Field>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" disabled={saving} onClick={() => requestOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending || saving}>
                  {saving ? 'Saving entry' : 'Save entry'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
      <AlertDialog open={confirmDiscardOpen && !saving} onOpenChange={setConfirmDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>Closing this editor will lose the current draft.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              disabled={saving}
              onClick={() => {
                setConfirmDiscardOpen(false)
                onOpenChange(false)
              }}>
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-sm font-medium">
      <span>{label}</span>
      {children}
      {error ? <span className="text-xs font-normal text-destructive">{error}</span> : null}
    </label>
  )
}
