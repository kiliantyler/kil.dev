import { RAG } from '@convex-dev/rag'
import { APICallError, type EmbeddingModel } from 'ai'

import {
  ASK_KILIAN_DEFAULT_EMBEDDING_DIMENSIONS,
  ASK_KILIAN_DEFAULT_EMBEDDING_MODEL,
  ASK_KILIAN_SUPPORTED_EMBEDDING_DIMENSIONS,
  ASK_KILIAN_SUPPORTED_EMBEDDING_DIMENSIONS_MESSAGE,
  assertAskKilianEmbeddingDimensions,
  resolveAskKilianEmbeddingDimensions,
  resolveAskKilianEmbeddingModel,
} from '../src/lib/ask-kilian/config'
import { isPlaceholderSecret } from '../src/lib/env-secrets'
import { components } from './_generated/api'

type AskKilianRagFilters = {
  category: string
  categoryStatus: string
  status: 'active'
}
type AskKilianEmbeddingModel = Exclude<EmbeddingModel, string>
type VercelEmbeddingResponse = {
  data?: Array<{ embedding?: number[] }>
  usage?: {
    total_tokens?: number
    prompt_tokens?: number
  }
  error?: {
    message?: string
  }
}

export const ASK_KILIAN_NAMESPACE = 'public-site'
export {
  ASK_KILIAN_DEFAULT_EMBEDDING_DIMENSIONS,
  ASK_KILIAN_DEFAULT_EMBEDDING_MODEL,
  ASK_KILIAN_SUPPORTED_EMBEDDING_DIMENSIONS,
  ASK_KILIAN_SUPPORTED_EMBEDDING_DIMENSIONS_MESSAGE,
}
export const ASK_KILIAN_GATEWAY_EMBEDDINGS_URL = 'https://ai-gateway.vercel.sh/v1/embeddings'
export const ASK_KILIAN_GATEWAY_APP_URL = 'https://kil.dev'
export const ASK_KILIAN_GATEWAY_APP_TITLE = 'kil.dev'
export const ASK_KILIAN_GATEWAY_FEATURE_TAG = 'feature:ask-kilian-rag'
export const ASK_KILIAN_RAG_FILTER_NAMES: Array<keyof AskKilianRagFilters & string> = [
  'category',
  'categoryStatus',
  'status',
]

function parseEmbeddingResponseBody(responseBody: string): VercelEmbeddingResponse {
  if (!responseBody) return {}
  try {
    return JSON.parse(responseBody) as VercelEmbeddingResponse
  } catch {
    return {}
  }
}

function createRedactedEmbeddingRequestBody(requestBody: { model: string; input: string[]; dimensions: number }) {
  return {
    model: requestBody.model,
    dimensions: requestBody.dimensions,
    inputCount: requestBody.input.length,
  }
}

export function resolveEmbeddingModel(raw = process.env.ASK_KILIAN_EMBEDDING_MODEL): string {
  return resolveAskKilianEmbeddingModel(raw)
}

export function resolveEmbeddingDimensions(raw = process.env.ASK_KILIAN_EMBEDDING_DIMENSIONS): number {
  return resolveAskKilianEmbeddingDimensions(raw)
}

export function resolveGatewayProjectId(raw = process.env.VERCEL_PROJECT_ID): string {
  return raw?.trim() ?? ''
}

export function resolveGatewayReportingEnvironment({
  configured = process.env.ASK_KILIAN_GATEWAY_ENV,
  convexDeployment = process.env.CONVEX_DEPLOYMENT,
  vercelEnvironment = process.env.VERCEL_ENV,
}: {
  configured?: string
  convexDeployment?: string
  vercelEnvironment?: string
} = {}): string {
  const trimmedConfigured = configured?.trim()
  if (trimmedConfigured) return trimmedConfigured

  const trimmedVercelEnvironment = vercelEnvironment?.trim()
  if (trimmedVercelEnvironment) return trimmedVercelEnvironment

  const trimmedConvexDeployment = convexDeployment?.trim()
  if (!trimmedConvexDeployment) return ''
  if (trimmedConvexDeployment === 'prod' || trimmedConvexDeployment.startsWith('prod:')) return 'production'
  if (trimmedConvexDeployment === 'production' || trimmedConvexDeployment.startsWith('production:')) return 'production'
  if (trimmedConvexDeployment === 'preview' || trimmedConvexDeployment.startsWith('preview:')) return 'preview'
  if (trimmedConvexDeployment === 'dev' || trimmedConvexDeployment.startsWith('dev:')) return 'development'
  return ''
}

function createGatewayRequestHeaders({
  environment = resolveGatewayReportingEnvironment(),
  projectId = resolveGatewayProjectId(),
}: {
  environment?: string
  projectId?: string
} = {}) {
  const trimmedProjectId = resolveGatewayProjectId(projectId)
  const trimmedEnvironment = environment?.trim()

  return {
    'http-referer': ASK_KILIAN_GATEWAY_APP_URL,
    'x-title': ASK_KILIAN_GATEWAY_APP_TITLE,
    ...(trimmedProjectId ? { 'ai-o11y-project-id': trimmedProjectId } : {}),
    ...(trimmedEnvironment ? { 'ai-o11y-environment': trimmedEnvironment } : {}),
    ...(trimmedEnvironment
      ? { 'ai-reporting-tags': `${ASK_KILIAN_GATEWAY_FEATURE_TAG},env:${trimmedEnvironment}` }
      : {}),
  }
}

export function createAskKilianGatewayEmbeddingModel({
  apiKey = process.env.AI_GATEWAY_API_KEY,
  dimensions = resolveEmbeddingDimensions(),
  fetchImplementation = fetch,
  model = resolveEmbeddingModel(),
  projectId = resolveGatewayProjectId(),
}: {
  apiKey?: string
  dimensions?: number
  fetchImplementation?: typeof fetch
  model?: string
  projectId?: string
} = {}): AskKilianEmbeddingModel {
  assertAskKilianEmbeddingDimensions(dimensions)

  return {
    specificationVersion: 'v3',
    provider: 'vercel-ai-gateway',
    modelId: model,
    maxEmbeddingsPerCall: 100,
    supportsParallelCalls: true,
    async doEmbed(options) {
      const trimmedApiKey = apiKey?.trim()
      if (!trimmedApiKey) {
        throw new Error('Missing AI_GATEWAY_API_KEY for Ask Kilian embeddings')
      }
      if (isPlaceholderSecret(trimmedApiKey)) {
        throw new Error('Replace placeholder AI_GATEWAY_API_KEY for Ask Kilian embeddings')
      }
      const trimmedProjectId = resolveGatewayProjectId(projectId)
      if (!trimmedProjectId) {
        throw new Error('Missing VERCEL_PROJECT_ID for Ask Kilian Gateway project attribution')
      }

      const requestBody = {
        model,
        input: options.values,
        dimensions,
      }
      let response: Response
      try {
        response = await fetchImplementation(ASK_KILIAN_GATEWAY_EMBEDDINGS_URL, {
          method: 'POST',
          headers: {
            ...options.headers,
            ...createGatewayRequestHeaders({ projectId: trimmedProjectId }),
            authorization: `Bearer ${trimmedApiKey}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: options.abortSignal,
        })
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          throw error
        }
        throw new APICallError({
          message: 'Ask Kilian embedding request failed before receiving an HTTP response',
          url: ASK_KILIAN_GATEWAY_EMBEDDINGS_URL,
          requestBodyValues: createRedactedEmbeddingRequestBody(requestBody),
          cause: error,
          isRetryable: true,
        })
      }
      const responseBody = await response.text()
      const body = parseEmbeddingResponseBody(responseBody)
      const responseHeaders = Object.fromEntries(response.headers.entries())

      if (!response.ok) {
        throw new APICallError({
          message: body.error?.message ?? `Ask Kilian embedding request failed with HTTP ${response.status}`,
          url: ASK_KILIAN_GATEWAY_EMBEDDINGS_URL,
          requestBodyValues: createRedactedEmbeddingRequestBody(requestBody),
          statusCode: response.status,
          responseHeaders,
          responseBody,
          data: body,
        })
      }

      const embeddings = body.data?.map(item => item.embedding)
      if (!embeddings || embeddings.length !== options.values.length || embeddings.some(embedding => !embedding)) {
        throw new Error('Ask Kilian embedding response did not include an embedding for every input value')
      }
      const validatedEmbeddings: number[][] = []
      for (const embedding of embeddings) {
        if (!Array.isArray(embedding)) {
          throw new TypeError('Ask Kilian embedding response did not include an embedding for every input value')
        }
        if (embedding.length !== dimensions) {
          throw new Error(
            `Ask Kilian embedding response returned a vector with ${embedding.length} dimensions; expected ${dimensions}`,
          )
        }
        if (embedding.some(value => typeof value !== 'number' || !Number.isFinite(value))) {
          throw new Error('Ask Kilian embedding response returned a vector with non-finite values')
        }
        validatedEmbeddings.push(embedding)
      }

      return {
        embeddings: validatedEmbeddings,
        usage: {
          tokens: body.usage?.total_tokens ?? body.usage?.prompt_tokens ?? 0,
        },
        response: {
          headers: responseHeaders,
          body,
        },
        warnings: [],
      }
    },
  }
}

export const askKilianRag = new RAG<AskKilianRagFilters>(components.rag, {
  textEmbeddingModel: createAskKilianGatewayEmbeddingModel(),
  embeddingDimension: resolveEmbeddingDimensions(),
  filterNames: ASK_KILIAN_RAG_FILTER_NAMES,
})
