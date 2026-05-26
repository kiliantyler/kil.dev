import type { AdminWorkspacePhotoPatch } from '@/lib/pet-gallery/admin-workspace'

export type PendingPhotoPatchState = {
  patches: Map<string, AdminWorkspacePhotoPatch>
  timeouts: Map<string, ReturnType<typeof setTimeout>>
}

export async function flushPendingPhotoPatchState({
  pending,
  savePatch,
  trackMutation,
}: {
  pending: PendingPhotoPatchState
  savePatch: (photoDocId: string, patch: AdminWorkspacePhotoPatch) => Promise<unknown>
  trackMutation: <T>(mutation: Promise<T>) => Promise<T>
}) {
  const entries = [...pending.patches.entries()]

  for (const [photoDocId, timeout] of pending.timeouts.entries()) {
    clearTimeout(timeout)
    pending.timeouts.delete(photoDocId)
  }

  await Promise.all(
    entries.map(([photoDocId, patch]) =>
      trackMutation(
        savePatch(photoDocId, patch).then(result => {
          if (pending.patches.get(photoDocId) === patch) {
            pending.patches.delete(photoDocId)
          }
          return result
        }),
      ),
    ),
  )
}
