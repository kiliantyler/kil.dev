#!/usr/bin/env bun
import { isPlaceholderSecret } from '../src/lib/env-secrets'

export const ASK_KILIAN_APP_TABLES = ['askKilianKnowledgeEntries'] as const

export const ASK_KILIAN_RAG_COMPONENT_PATH = 'rag'

export const ASK_KILIAN_RAG_VECTOR_TABLES = [
  'vectors_128',
  'vectors_256',
  'vectors_512',
  'vectors_768',
  'vectors_1024',
  'vectors_1408',
  'vectors_1536',
  'vectors_2048',
  'vectors_3072',
  'vectors_4096',
] as const

export const ASK_KILIAN_RAG_TABLES = [
  'namespaces',
  'entries',
  'chunks',
  'content',
  ...ASK_KILIAN_RAG_VECTOR_TABLES,
] as const

export type ConvexDeployKeyClassification =
  | 'dev'
  | 'preview'
  | 'prod'
  | 'project'
  | 'missing'
  | 'placeholder'
  | 'unknown'

export function vectorTableForDimensions(dimensions: number) {
  return `vectors_${dimensions}` as `vectors_${number}`
}

export function classifyConvexDeployKey(key: string | undefined): ConvexDeployKeyClassification {
  const trimmedKey = key?.trim()
  if (!trimmedKey) return 'missing'
  if (isPlaceholderSecret(trimmedKey)) return 'placeholder'

  const scope = trimmedKey.split(':', 1)[0]
  if (scope === 'dev' || scope === 'preview' || scope === 'prod' || scope === 'project') return scope

  return 'unknown'
}

export function requireDevSourceDeployKey(key: string | undefined) {
  const trimmedKey = key?.trim()
  if (classifyConvexDeployKey(trimmedKey) !== 'dev') {
    throw new Error('ASK_KILIAN_RAG_SOURCE_CONVEX_DEPLOY_KEY must be a dev-scoped Convex deploy key')
  }

  return trimmedKey
}

export function requirePreviewTargetDeployKey(key: string | undefined) {
  const trimmedKey = key?.trim()
  if (classifyConvexDeployKey(trimmedKey) !== 'preview') {
    throw new Error('CONVEX_DEPLOY_KEY must be a preview-scoped Convex deploy key for preview hydration')
  }

  return trimmedKey
}
