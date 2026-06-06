export type AskKilianRepoSyncCounts = {
  created: number
  changed: number
  unchanged: number
  retired: number
  ignoredAdmin: number
}

export function hasAskKilianRepoSyncChanges(syncPreview: { counts: AskKilianRepoSyncCounts }) {
  const { created, changed, retired } = syncPreview.counts

  return created + changed + retired > 0
}
