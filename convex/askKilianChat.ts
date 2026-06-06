export function normalizeAskKilianQuotaDay(timestamp: number) {
  return new Date(timestamp).toISOString().slice(0, 10)
}

export function stableShortHash(input: string) {
  let hash = 0x811C9DC5

  for (const character of input) {
    hash ^= character.codePointAt(0) ?? 0
    hash = Math.imul(hash, 0x01000193)
  }

  const unsignedHash = hash < 0 ? hash + 0x1_0000_0000 : hash

  return Math.trunc(unsignedHash).toString(16).padStart(8, '0')
}

export function buildAskKilianRagCorpusVersionKey(input: {
  entries: Array<{ stableKey: string; contentHash: string }>
  ragFilterVersion: number
  embeddingModel: string
  embeddingDimensions: number
}) {
  const fingerprint = input.entries
    .map(entry => `${entry.stableKey}:${entry.contentHash}`)
    .toSorted()
    .join('|')
  const hash = stableShortHash(
    JSON.stringify({
      fingerprint,
      ragFilterVersion: input.ragFilterVersion,
      embeddingModel: input.embeddingModel,
      embeddingDimensions: input.embeddingDimensions,
    }),
  )

  return `rag:v${input.ragFilterVersion}:${hash}`
}
