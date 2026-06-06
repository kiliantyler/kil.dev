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
  const [pendingOperations, setPendingOperations] = useState(0)
  const selectedStableKeyRef = useRef<string | null>(initialState.selectedStableKey ?? null)
  const latestDetailRequestStableKey = useRef<string | null>(null)
  const latestRetrievalRequestId = useRef(0)
  const pendingOperationKeys = useRef(new Set<string>())

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
    setSelectedDetail(null)
  }

  function runWorkspaceOperation(operation: () => Promise<void>, key?: string) {
    if (key && pendingOperationKeys.current.has(key)) return false
    if (key) pendingOperationKeys.current.add(key)
    setPendingOperations(count => count + 1)
    void operation().finally(() => {
      if (key) pendingOperationKeys.current.delete(key)
      setPendingOperations(count => Math.max(0, count - 1))
    })
    return true
  }

  function refresh() {
    runWorkspaceOperation(async () => {
      try {
        const nextState = await getAskKilianAdminWorkspaceStateAction()
        startTransition(() => applyState(nextState))
      } catch (error) {
        setKnowledgeError(error instanceof Error ? error.message : 'Unable to refresh Ask Kilian admin state')
      }
    }, 'refresh')
  }

  async function loadEntryDetail(stableKey: string) {
    selectedStableKeyRef.current = stableKey
    latestDetailRequestStableKey.current = stableKey
    setSelectedStableKey(stableKey)
    setSelectedDetail(current => (current?.stableKey === stableKey ? current : null))
    setKnowledgeError(null)
    setPendingOperations(count => count + 1)
    try {
      const detail = await getAskKilianKnowledgeEntryAction(stableKey)
      if (latestDetailRequestStableKey.current === stableKey && detail?.stableKey === stableKey) {
        setSelectedDetail(detail)
        return detail
      }
      return null
    } catch (error) {
      if (latestDetailRequestStableKey.current === stableKey) {
        setKnowledgeError(error instanceof Error ? error.message : 'Unable to load Ask Kilian entry detail')
      }
      return null
    } finally {
      setPendingOperations(count => Math.max(0, count - 1))
    }
  }

  function selectEntry(stableKey: string) {
    startTransition(() => {
      void loadEntryDetail(stableKey)
    })
  }

  function saveEntry(input: AdminKnowledgeEntrySaveInput) {
    setKnowledgeError(null)
    setPendingOperations(count => count + 1)
    return saveAskKilianAdminEntryAction(input)
      .then(nextState => {
        startTransition(() => applyState(nextState))
        setSyncPreviewStale(syncPreview !== null)
      })
      .catch(error => {
        const message = error instanceof Error ? error.message : 'Unable to save Ask Kilian entry'
        setKnowledgeError(message)
        throw new Error(message)
      })
      .finally(() => setPendingOperations(count => Math.max(0, count - 1)))
  }

  function disableEntry(stableKey: string) {
    setKnowledgeError(null)
    runWorkspaceOperation(async () => {
      try {
        const nextState = await disableAskKilianAdminEntryAction(stableKey)
        startTransition(() => applyState(nextState))
        setSyncPreviewStale(syncPreview !== null)
      } catch (error) {
        setKnowledgeError(error instanceof Error ? error.message : 'Unable to disable Ask Kilian entry')
      }
    }, `disable:${stableKey}`)
  }

  function reenableEntry(stableKey: string) {
    setKnowledgeError(null)
    runWorkspaceOperation(async () => {
      try {
        const nextState = await reenableAskKilianAdminEntryAction(stableKey)
        startTransition(() => applyState(nextState))
        setSyncPreviewStale(syncPreview !== null)
      } catch (error) {
        setKnowledgeError(error instanceof Error ? error.message : 'Unable to re-enable Ask Kilian entry')
      }
    }, `reenable:${stableKey}`)
  }

  function previewRepoSync() {
    setOpsError(null)
    runWorkspaceOperation(async () => {
      try {
        const summary = await previewAskKilianRepoSyncAction()
        setSyncPreview(summary)
        setSyncPreviewStale(false)
      } catch (error) {
        setOpsError(error instanceof Error ? error.message : 'Unable to preview Ask Kilian repo sync')
      }
    }, 'previewRepoSync')
  }

  function applyRepoSync() {
    if (!syncPreview || syncPreviewStale) return
    setOpsError(null)
    runWorkspaceOperation(async () => {
      try {
        const result = await applyAskKilianRepoSyncAction(syncPreview.confirmationToken)
        setSyncPreview(result.sync)
        setSyncPreviewStale(true)
        startTransition(() => applyState(result.state))
      } catch (error) {
        setOpsError(error instanceof Error ? error.message : 'Unable to apply Ask Kilian repo sync')
      }
    }, 'applyRepoSync')
  }

  function previewRetrieval(input: {
    prompt: string
    tier: AskKilianTier
    includeSpoilers: boolean
    categories: AskKilianKnowledgeCategory[]
    limit: number
  }) {
    setRetrievalError(null)
    runWorkspaceOperation(async () => {
      const requestId = latestRetrievalRequestId.current + 1
      latestRetrievalRequestId.current = requestId
      try {
        const preview = await previewAskKilianRetrievalAction(input)
        if (latestRetrievalRequestId.current === requestId) setRetrievalPreview(preview)
      } catch (error) {
        if (latestRetrievalRequestId.current === requestId) {
          setRetrievalError(error instanceof Error ? error.message : 'Unable to run Ask Kilian retrieval preview')
        }
      }
    }, 'previewRetrieval')
  }

  const isOperationPending = isPending || pendingOperations > 0

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
    isPending: isOperationPending,
    actions: {
      refresh,
      selectEntry,
      loadEntryDetail,
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
