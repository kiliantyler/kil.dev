import { APICallError, embed } from 'ai'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

import * as sharedAskKilianConfig from '../../src/lib/ask-kilian/config'

async function importAskKilianRag() {
  vi.stubEnv('AI_GATEWAY_API_KEY', '')
  vi.stubEnv('VERCEL_PROJECT_ID', 'prj_test')
  vi.stubEnv('ASK_KILIAN_GATEWAY_ENV', '')
  vi.stubEnv('ASK_KILIAN_EMBEDDING_DIMENSIONS', '')
  vi.stubEnv('ASK_KILIAN_EMBEDDING_MODEL', '')
  vi.resetModules()
  return import('../askKilianRag')
}

describe('Ask Kilian RAG configuration', () => {
  const embedding2048 = Array.from({ length: 2048 }, (_, index) => index / 2048)

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('keeps the Gateway embedding model and 2048-dimension default synchronized', async () => {
    vi.stubEnv('ASK_KILIAN_EMBEDDING_DIMENSIONS', '')
    const { ASK_KILIAN_DEFAULT_EMBEDDING_DIMENSIONS, ASK_KILIAN_DEFAULT_EMBEDDING_MODEL, askKilianRag } =
      await importAskKilianRag()

    expect(ASK_KILIAN_DEFAULT_EMBEDDING_MODEL).toBe(sharedAskKilianConfig.ASK_KILIAN_DEFAULT_EMBEDDING_MODEL)
    expect(ASK_KILIAN_DEFAULT_EMBEDDING_DIMENSIONS).toBe(sharedAskKilianConfig.ASK_KILIAN_DEFAULT_EMBEDDING_DIMENSIONS)
    expect(askKilianRag.options.embeddingDimension).toBe(2048)
  })

  it('uses exactly the filters supplied by the sync entry filterValues', async () => {
    vi.stubEnv('ASK_KILIAN_EMBEDDING_DIMENSIONS', '')
    const { ASK_KILIAN_RAG_FILTER_NAMES, askKilianRag } = await importAskKilianRag()

    expect(ASK_KILIAN_RAG_FILTER_NAMES).toEqual(['category', 'categoryStatus', 'status'])
    expect(askKilianRag.options.filterNames).toEqual(['category', 'categoryStatus', 'status'])
  })

  it('keeps Convex embedding defaults synchronized with .env.example', async () => {
    const { ASK_KILIAN_DEFAULT_EMBEDDING_DIMENSIONS, ASK_KILIAN_DEFAULT_EMBEDDING_MODEL } = await importAskKilianRag()
    const envExample = readFileSync(join(process.cwd(), '.env.example'), 'utf8')

    expect(envExample).toContain(`ASK_KILIAN_EMBEDDING_MODEL=${ASK_KILIAN_DEFAULT_EMBEDDING_MODEL}`)
    expect(envExample).toContain(`ASK_KILIAN_EMBEDDING_DIMENSIONS=${ASK_KILIAN_DEFAULT_EMBEDDING_DIMENSIONS}`)
  })

  it.each(['', '   ', undefined])('falls back to the default dimensions for blank value %s', async value => {
    vi.stubEnv('ASK_KILIAN_EMBEDDING_DIMENSIONS', '')
    const { ASK_KILIAN_DEFAULT_EMBEDDING_DIMENSIONS, resolveEmbeddingDimensions } = await importAskKilianRag()

    expect(resolveEmbeddingDimensions(value)).toBe(ASK_KILIAN_DEFAULT_EMBEDDING_DIMENSIONS)
  })

  it.each(['0', '-1', '1.5', '2048abc', 'not-a-number', '999', '2560'])(
    'rejects unsupported configured dimensions value %s',
    async value => {
      const { resolveEmbeddingDimensions } = await importAskKilianRag()

      expect(() => resolveEmbeddingDimensions(value)).toThrow(
        'ASK_KILIAN_EMBEDDING_DIMENSIONS must be one of 128, 256, 512, 768, 1024, 1408, 1536, 2048, 3072, 4096',
      )
    },
  )

  it('accepts trimmed positive integer dimensions', async () => {
    const { resolveEmbeddingDimensions } = await importAskKilianRag()

    expect(resolveEmbeddingDimensions(' 2048 ')).toBe(2048)
  })

  it('falls back to the default model for blank values', async () => {
    vi.stubEnv('ASK_KILIAN_EMBEDDING_MODEL', '')
    const { ASK_KILIAN_DEFAULT_EMBEDDING_MODEL, resolveEmbeddingModel } = await importAskKilianRag()

    expect(resolveEmbeddingModel()).toBe(ASK_KILIAN_DEFAULT_EMBEDDING_MODEL)
    expect(resolveEmbeddingModel('   ')).toBe(ASK_KILIAN_DEFAULT_EMBEDDING_MODEL)
    expect(resolveEmbeddingModel(' custom/model ')).toBe('custom/model')
  })

  it('resolves explicit and inferred Gateway reporting environments', async () => {
    const { resolveGatewayReportingEnvironment } = await importAskKilianRag()

    expect(resolveGatewayReportingEnvironment({ configured: ' preview ' })).toBe('preview')
    expect(resolveGatewayReportingEnvironment({ vercelEnvironment: 'production' })).toBe('production')
    expect(resolveGatewayReportingEnvironment({ convexDeployment: 'dev:fast-alpaca-175' })).toBe('development')
    expect(resolveGatewayReportingEnvironment({ convexDeployment: 'preview:branch-name' })).toBe('preview')
    expect(resolveGatewayReportingEnvironment({ convexDeployment: 'prod:resolute-ptarmigan-441' })).toBe('production')
  })

  it('requests reduced-dimension Gateway embeddings for Convex RAG', async () => {
    const { ASK_KILIAN_GATEWAY_EMBEDDINGS_URL, createAskKilianGatewayEmbeddingModel } = await importAskKilianRag()
    const fetchImplementation = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          data: [{ embedding: embedding2048 }],
          usage: { total_tokens: 3 },
        }),
        {
          headers: { 'x-test': 'ok' },
          status: 200,
        },
      )
    })
    const embeddingModel = createAskKilianGatewayEmbeddingModel({
      apiKey: 'test-key',
      dimensions: 2048,
      fetchImplementation,
      model: 'alibaba/qwen3-embedding-4b',
    })

    vi.stubEnv('ASK_KILIAN_GATEWAY_ENV', 'development')
    const result = await embeddingModel.doEmbed({ values: ['hello'], headers: { 'x-extra': 'header' } })

    expect(fetchImplementation).toHaveBeenCalledWith(
      ASK_KILIAN_GATEWAY_EMBEDDINGS_URL,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          authorization: 'Bearer test-key',
          'content-type': 'application/json',
          'ai-o11y-project-id': 'prj_test',
          'ai-o11y-environment': 'development',
          'ai-reporting-tags': 'feature:ask-kilian-rag,env:development',
          'http-referer': 'https://kil.dev',
          'x-title': 'kil.dev',
          'x-extra': 'header',
        }),
        body: JSON.stringify({
          model: 'alibaba/qwen3-embedding-4b',
          input: ['hello'],
          dimensions: 2048,
        }),
      }),
    )
    expect(result.embeddings).toEqual([embedding2048])
    expect(result.usage?.tokens).toBe(3)
  })

  it('fails closed when an embedding key is missing', async () => {
    const { createAskKilianGatewayEmbeddingModel } = await importAskKilianRag()
    const embeddingModel = createAskKilianGatewayEmbeddingModel({
      apiKey: '   ',
      fetchImplementation: vi.fn(),
    })

    await expect(embeddingModel.doEmbed({ values: ['hello'] })).rejects.toThrow(
      'Missing AI_GATEWAY_API_KEY for Ask Kilian embeddings',
    )
  })

  it.each(['replace-with-ai-gateway-api-key', 'placeholder-ai-gateway-api-key', 'your-api-key-here'])(
    'fails closed when an embedding key still has placeholder value %s',
    async apiKey => {
      const { createAskKilianGatewayEmbeddingModel } = await importAskKilianRag()
      const embeddingModel = createAskKilianGatewayEmbeddingModel({
        apiKey,
        fetchImplementation: vi.fn(),
      })

      await expect(embeddingModel.doEmbed({ values: ['hello'] })).rejects.toThrow(
        'Replace placeholder AI_GATEWAY_API_KEY for Ask Kilian embeddings',
      )
    },
  )

  it('fails closed when Gateway project attribution is missing', async () => {
    const { createAskKilianGatewayEmbeddingModel } = await importAskKilianRag()
    const embeddingModel = createAskKilianGatewayEmbeddingModel({
      apiKey: 'test-key',
      fetchImplementation: vi.fn(),
      projectId: '   ',
    })

    await expect(embeddingModel.doEmbed({ values: ['hello'] })).rejects.toThrow(
      'Missing VERCEL_PROJECT_ID for Ask Kilian Gateway project attribution',
    )
  })

  it('fails closed when a returned embedding has the wrong dimensions', async () => {
    const { createAskKilianGatewayEmbeddingModel } = await importAskKilianRag()
    const embeddingModel = createAskKilianGatewayEmbeddingModel({
      apiKey: 'test-key',
      dimensions: 2048,
      fetchImplementation: vi.fn(async () => {
        return new Response(JSON.stringify({ data: [{ embedding: [0.1, 0.2, 0.3] }] }), { status: 200 })
      }),
    })

    await expect(embeddingModel.doEmbed({ values: ['hello'] })).rejects.toThrow(
      'Ask Kilian embedding response returned a vector with 3 dimensions; expected 2048',
    )
  })

  it('fails closed when a returned embedding contains non-finite values', async () => {
    const { createAskKilianGatewayEmbeddingModel } = await importAskKilianRag()
    const invalidEmbedding = [...embedding2048]
    invalidEmbedding[42] = Number.NaN
    const embeddingModel = createAskKilianGatewayEmbeddingModel({
      apiKey: 'test-key',
      dimensions: 2048,
      fetchImplementation: vi.fn(async () => {
        return new Response(JSON.stringify({ data: [{ embedding: invalidEmbedding }] }), { status: 200 })
      }),
    })

    await expect(embeddingModel.doEmbed({ values: ['hello'] })).rejects.toThrow(
      'Ask Kilian embedding response returned a vector with non-finite values',
    )
  })

  it.each([
    [429, true],
    [500, true],
    [400, false],
  ] as const)('throws an AI SDK APICallError with retryable=%s for HTTP %s', async (status, isRetryable) => {
    const { createAskKilianGatewayEmbeddingModel } = await importAskKilianRag()
    const embeddingModel = createAskKilianGatewayEmbeddingModel({
      apiKey: 'test-key',
      dimensions: 2048,
      fetchImplementation: vi.fn(async () => {
        return new Response(JSON.stringify({ error: { message: `Gateway failed with ${status}` } }), {
          headers: { 'retry-after-ms': '100' },
          status,
        })
      }),
    })

    let caughtError: unknown
    try {
      await embeddingModel.doEmbed({ values: ['hello'] })
    } catch (error) {
      caughtError = error
    }

    expect(APICallError.isInstance(caughtError)).toBe(true)
    expect(caughtError).toMatchObject({
      isRetryable,
      message: `Gateway failed with ${status}`,
      requestBodyValues: {
        model: 'alibaba/qwen3-embedding-4b',
        dimensions: 2048,
        inputCount: 1,
      },
      statusCode: status,
      responseHeaders: expect.objectContaining({ 'retry-after-ms': '100' }),
    })
    expect(caughtError).not.toMatchObject({
      requestBodyValues: expect.objectContaining({ input: ['hello'] }),
    })
  })

  it('throws a retryable AI SDK APICallError for non-JSON 5xx Gateway errors', async () => {
    const { createAskKilianGatewayEmbeddingModel } = await importAskKilianRag()
    const embeddingModel = createAskKilianGatewayEmbeddingModel({
      apiKey: 'test-key',
      dimensions: 2048,
      fetchImplementation: vi.fn(async () => {
        return new Response('upstream temporarily unavailable', {
          headers: { 'content-type': 'text/plain' },
          status: 503,
        })
      }),
    })

    let caughtError: unknown
    try {
      await embeddingModel.doEmbed({ values: ['hello'] })
    } catch (error) {
      caughtError = error
    }

    expect(APICallError.isInstance(caughtError)).toBe(true)
    expect(caughtError).toMatchObject({
      isRetryable: true,
      message: 'Ask Kilian embedding request failed with HTTP 503',
      requestBodyValues: {
        model: 'alibaba/qwen3-embedding-4b',
        dimensions: 2048,
        inputCount: 1,
      },
      responseBody: 'upstream temporarily unavailable',
      statusCode: 503,
    })
    expect(caughtError).not.toMatchObject({
      requestBodyValues: expect.objectContaining({ input: ['hello'] }),
    })
  })

  it('retries transient network failures through the AI SDK retry wrapper', async () => {
    const { createAskKilianGatewayEmbeddingModel } = await importAskKilianRag()
    const fetchImplementation = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: [{ embedding: embedding2048 }], usage: { total_tokens: 3 } }), {
          status: 200,
        }),
      )
    const embeddingModel = createAskKilianGatewayEmbeddingModel({
      apiKey: 'test-key',
      dimensions: 2048,
      fetchImplementation,
    })

    const result = await embed({ model: embeddingModel, value: 'hello', maxRetries: 1 })

    expect(fetchImplementation).toHaveBeenCalledTimes(2)
    expect(result.embedding).toEqual(embedding2048)
  })
})
