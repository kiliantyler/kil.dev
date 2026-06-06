'use client'

import {
  applyAskKilianRepoSyncAction,
  disableAskKilianAdminEntryAction,
  getAskKilianAdminWorkspaceStateAction,
  getAskKilianKnowledgeEntryAction,
  previewAskKilianRepoSyncAction,
  previewAskKilianRetrievalAction,
  reenableAskKilianAdminEntryAction,
  saveAskKilianAdminEntryAction,
} from '@/app/admin/ask-kilian/actions'
import type {
  AdminKnowledgeEntrySaveInput,
  AdminWorkspaceKnowledgeEntry,
  AskKilianAdminWorkspaceState,
} from '@/lib/ask-kilian/admin-workspace'
import type { AskKilianKnowledgeCategory, AskKilianTier } from '@/lib/ask-kilian/types'
import { useMemo, useRef, useState, useTransition } from 'react'

export type AskKilianRetrievalPreview = Awaited<ReturnType<typeof previewAskKilianRetrievalAction>>
export type AskKilianSyncPreview = Awaited<ReturnType<typeof previewAskKilianRepoSyncAction>>

export function useAskKilianAdminWorkspace(initialState: AskKilianAdminWorkspaceState) {
  const [state, setState] = useState(initialState)
  const [selectedStableKey, setSelectedStableKey] = useState(initialState.selectedStableKey ?? null)
  const [selectedDetail, setSelectedDetail] = useState<AdminWorkspaceKnowledgeEntry | null>(null)
  const [knowledgeError, setKnowledgeError] = useState<string | null>(null)
  const [opsError, setOpsError] = useState<string | null>(null)
  const [syncPreview, setSyncPreview] = useState<AskKilianSyncPreview | null>(null)
  const [syncPreviewStale, setSyncPreviewStale] = useState(false)
  const [retrievalError, setRetrievalError] = useState<string | null>(null)
  const [retrievalPreview, setRetrievalPreview] = useState<AskKilianRetrievalPreview | null>(null)
  const [isPending, startTransition] = useTransition()
  const selectedStableKeyRef = useRef<string | null>(initialState.selectedStableKey ?? null)
  const latestDetailRequestStableKey = useRef<string | null>(null)

  const selectedEntry = useMemo(
    () => state.entries.find(entry => entry.stableKey === selectedStableKey) ?? null,
    [selectedStableKey, state.entries],
  )

  function applyState(nextState: AskKilianAdminWorkspaceState) {
    const nextSelectedStableKey =
      selectedStableKeyRef.current && nextState.entries.some(entry => entry.stableKey === selectedStableKeyRef.current)
        ? selectedStableKeyRef.current
        : (nextState.selectedStableKey ?? nextState.entries[0]?.stableKey ?? null)

    selectedStableKeyRef.current = nextSelectedStableKey
    latestDetailRequestStableKey.current = nextSelectedStableKey
    setState(nextState)
    setSelectedStableKey(nextSelectedStableKey)
    setSelectedDetail(current =>
      current?.stableKey === nextSelectedStableKey &&
      nextState.entries.some(entry => entry.stableKey === nextSelectedStableKey)
        ? current
        : null,
    )
  }

  function refresh() {
    startTransition(() => {
      void getAskKilianAdminWorkspaceStateAction()
        .then(applyState)
        .catch(error => {
          setKnowledgeError(error instanceof Error ? error.message : 'Unable to refresh Ask Kilian admin state')
        })
    })
  }

  function selectEntry(stableKey: string) {
    selectedStableKeyRef.current = stableKey
    latestDetailRequestStableKey.current = stableKey
    setSelectedStableKey(stableKey)
    setSelectedDetail(current => (current?.stableKey === stableKey ? current : null))
    setKnowledgeError(null)
    startTransition(() => {
      void getAskKilianKnowledgeEntryAction(stableKey)
        .then(detail => {
          if (latestDetailRequestStableKey.current === stableKey && detail?.stableKey === stableKey) {
            setSelectedDetail(detail)
          }
        })
        .catch(error => {
          if (latestDetailRequestStableKey.current === stableKey) {
            setKnowledgeError(error instanceof Error ? error.message : 'Unable to load Ask Kilian entry detail')
          }
        })
    })
  }

  function saveEntry(input: AdminKnowledgeEntrySaveInput) {
    setKnowledgeError(null)
    startTransition(() => {
      void saveAskKilianAdminEntryAction(input)
        .then(applyState)
        .catch(error => {
          setKnowledgeError(error instanceof Error ? error.message : 'Unable to save Ask Kilian entry')
        })
    })
  }

  function disableEntry(stableKey: string) {
    setKnowledgeError(null)
    startTransition(() => {
      void disableAskKilianAdminEntryAction(stableKey)
        .then(applyState)
        .catch(error => {
          setKnowledgeError(error instanceof Error ? error.message : 'Unable to disable Ask Kilian entry')
        })
    })
  }

  function reenableEntry(stableKey: string) {
    setKnowledgeError(null)
    startTransition(() => {
      void reenableAskKilianAdminEntryAction(stableKey)
        .then(applyState)
        .catch(error => {
          setKnowledgeError(error instanceof Error ? error.message : 'Unable to re-enable Ask Kilian entry')
        })
    })
  }

  function previewRepoSync() {
    setOpsError(null)
    startTransition(() => {
      void previewAskKilianRepoSyncAction()
        .then(summary => {
          setSyncPreview(summary)
          setSyncPreviewStale(false)
        })
        .catch(error => {
          setOpsError(error instanceof Error ? error.message : 'Unable to preview Ask Kilian repo sync')
        })
    })
  }

  function applyRepoSync() {
    if (!syncPreview || syncPreviewStale) return
    setOpsError(null)
    startTransition(() => {
      void applyAskKilianRepoSyncAction()
        .then(result => {
          setSyncPreview(result.sync)
          setSyncPreviewStale(false)
          applyState(result.state)
        })
        .catch(error => {
          setOpsError(error instanceof Error ? error.message : 'Unable to apply Ask Kilian repo sync')
        })
    })
  }

  function previewRetrieval(input: {
    prompt: string
    tier: AskKilianTier
    includeSpoilers: boolean
    categories: AskKilianKnowledgeCategory[]
    limit: number
  }) {
    setRetrievalError(null)
    startTransition(() => {
      void previewAskKilianRetrievalAction(input)
        .then(setRetrievalPreview)
        .catch(error => {
          setRetrievalError(error instanceof Error ? error.message : 'Unable to run Ask Kilian retrieval preview')
        })
    })
  }

  return {
    state,
    selectedEntry,
    selectedDetail: selectedDetail ?? selectedEntry,
    knowledgeError,
    opsError,
    syncPreview,
    syncPreviewStale,
    retrievalError,
    retrievalPreview,
    isPending,
    actions: {
      refresh,
      selectEntry,
      saveEntry,
      disableEntry,
      reenableEntry,
      previewRepoSync,
      applyRepoSync,
      markSyncPreviewStale: () => setSyncPreviewStale(true),
      previewRetrieval,
    },
  }
}

export type AskKilianAdminWorkspaceController = ReturnType<typeof useAskKilianAdminWorkspace>
