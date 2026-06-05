export const ASK_KILIAN_DEFAULT_EMBEDDING_MODEL = 'alibaba/qwen3-embedding-4b'
export const ASK_KILIAN_DEFAULT_EMBEDDING_DIMENSIONS = 2048
export const ASK_KILIAN_SUPPORTED_EMBEDDING_DIMENSIONS = [128, 256, 512, 768, 1024, 1408, 1536, 2048, 3072, 4096]
export const ASK_KILIAN_SUPPORTED_EMBEDDING_DIMENSIONS_MESSAGE = `ASK_KILIAN_EMBEDDING_DIMENSIONS must be one of ${ASK_KILIAN_SUPPORTED_EMBEDDING_DIMENSIONS.join(', ')}`

/**
 * @param {number} dimensions
 */
export function isSupportedAskKilianEmbeddingDimensions(dimensions) {
  return ASK_KILIAN_SUPPORTED_EMBEDDING_DIMENSIONS.some(supportedDimensions => supportedDimensions === dimensions)
}

/**
 * @param {number} dimensions
 */
export function assertAskKilianEmbeddingDimensions(dimensions) {
  if (!Number.isInteger(dimensions) || !isSupportedAskKilianEmbeddingDimensions(dimensions)) {
    throw new Error(ASK_KILIAN_SUPPORTED_EMBEDDING_DIMENSIONS_MESSAGE)
  }
}

/**
 * @param {string | undefined} raw
 */
export function resolveAskKilianEmbeddingModel(raw) {
  return raw?.trim() || ASK_KILIAN_DEFAULT_EMBEDDING_MODEL
}

/**
 * @param {string | undefined} raw
 */
export function resolveAskKilianEmbeddingDimensions(raw) {
  const trimmed = raw?.trim()
  const dimensions = trimmed ? Number(trimmed) : ASK_KILIAN_DEFAULT_EMBEDDING_DIMENSIONS

  assertAskKilianEmbeddingDimensions(dimensions)

  return dimensions
}
