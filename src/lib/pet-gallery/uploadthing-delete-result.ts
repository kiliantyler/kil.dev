export function uploadThingDeleteResultError(
  result: { success: boolean; deletedCount: number },
  expectedCount: number,
) {
  if (!result.success || result.deletedCount !== expectedCount) {
    return `UploadThing deleted ${result.deletedCount} of ${expectedCount} files`
  }
}
