import type { AskKilianPromptConfigSummary, AskKilianRuntimeConfigSummary } from './admin-workspace-shared'
import type { AskKilianClassificationDecision } from './chat-classifier'
import {
  buildAskKilianChatRequest,
  type AskKilianChatMessage,
  type AskKilianChatRequest,
  type AskKilianChatRequestInput,
  type AskKilianChatStatus,
} from './chat-contracts'
import type { AskKilianPostHogEventInput } from './chat-observability'
import type { AskKilianKnowledgeCategory } from './types'

const FIXED_ASK_KILIAN_GUARDRAILS = [
  'Ask Kilian only answers questions about Kilian, kil.dev, the site, projects, career, pets, themes, achievements, persona, and approved fun facts.',
  'Ground answers in retrieved context. If context is missing, say what you can safely infer from the configured persona instead of inventing plausible private facts.',
  'Do not reveal private contact details, addresses, credentials, exact hidden achievement unlock steps, or general-purpose AI assistance unrelated to Kilian or kil.dev.',
  'Keep answers concise, specific, and in the Ask Kilian voice.',
].join('\n')

const ASK_KILIAN_NO_RAG_CORPUS_VERSION_KEY = 'rag:no-rag:v1'
const ASK_KILIAN_PROVIDER_ERROR_TEXT = 'Ask Kilian could not finish this response.'

export type AskKilianChatEngineInput = AskKilianChatRequestInput & {
  distinctId: string
}

type AskKilianQuotaDecision = {
  allowed: boolean
  bucket: AskKilianChatRequest['quotaBucket']
  reason: string
  remainingDailyRequests: number
}

export type AskKilianRagEntry = {
  stableKey: string
  title: string
  category: AskKilianKnowledgeCategory
  score: number
  text: string
  contentHash?: string
}

type AskKilianModelMetadata = {
  modelId: string
  latencyMs: number
  inputTokens?: number
  outputTokens?: number
  finishReason?: string
}

type AskKilianTraceMessage = AskKilianChatMessage & {
  createdAt: number
}

type AskKilianTraceMetadata = {
  callerMode: AskKilianChatRequest['callerMode']
  quotaBucket: AskKilianChatRequest['quotaBucket']
  status: AskKilianChatStatus
  tier: AskKilianChatRequest['tier']
  includeSpoilers: boolean
  categories: AskKilianKnowledgeCategory[]
  promptRevisionId: string
  runtimeConfigVersionId: string
  ragCorpusVersionKey: string
  condensedQuery: string
  classification: AskKilianClassificationDecision
  retrievedEntries: Array<Omit<AskKilianRagEntry, 'text'>>
  quotaDecision: AskKilianQuotaDecision
  publicEquivalentQuotaDecision?: AskKilianQuotaDecision
  model: AskKilianModelMetadata
  posthogDistinctId?: string
  posthogTraceId?: string
  error?: string
}

export type AskKilianChatEngineDeps = {
  now: () => number
  createTraceId: () => string
  loadActivePromptConfig: () => Promise<AskKilianPromptConfigSummary | null>
  loadActiveRuntimeConfig: () => Promise<AskKilianRuntimeConfigSummary | null>
  classify: (input: {
    prompt: string
    tier: AskKilianChatRequest['tier']
    request: AskKilianChatRequest
  }) => Promise<AskKilianClassificationDecision>
  reserveQuota: (input: {
    bucket: AskKilianChatRequest['quotaBucket']
    estimatedTokens: number
    quota: AskKilianRuntimeConfigSummary['quota']
  }) => Promise<AskKilianQuotaDecision>
  searchRag: (input: {
    messages: AskKilianChatMessage[]
    latestUserMessage: string
    tier: AskKilianChatRequest['tier']
    includeSpoilers: boolean
    categories: AskKilianKnowledgeCategory[]
    limit: number
  }) => Promise<{
    condensedQuery?: string
    ragCorpusVersionKey: string
    entries: AskKilianRagEntry[]
  }>
  streamModel: (input: {
    modelId: string
    maxOutputTokens: number
    temperature: number
    systemPrompt: string
    messages: AskKilianChatMessage[]
    traceId: string
  }) => Promise<{
    text: string
    metadata: AskKilianModelMetadata
  }>
  recordConversation: (input: {
    traceId: string
    messages: AskKilianTraceMessage[]
    metadata: AskKilianTraceMetadata
  }) => Promise<{
    conversationId: string
    traceId: string
  }>
  captureMetric: (input: AskKilianPostHogEventInput) => Promise<void>
}

type AskKilianChatEngineDiagnostics = {
  promptRevisionId?: string
  runtimeConfigVersionId?: string
  ragCorpusVersionKey?: string
  classification?: AskKilianClassificationDecision
  quotaDecision?: AskKilianQuotaDecision
  retrievedEntries?: Array<Omit<AskKilianRagEntry, 'text'>>
  model?: AskKilianModelMetadata
  conversationId?: string
}

export type AskKilianChatEngineResult =
  | {
      ok: true
      status: Exclude<AskKilianChatStatus, 'failed'>
      text: string
      traceId: string
      diagnostics: AskKilianChatEngineDiagnostics
    }
  | {
      ok: false
      status: 'failed'
      reason: string
      traceId: string
      diagnostics: AskKilianChatEngineDiagnostics
    }

export function createAskKilianChatEngine(deps: AskKilianChatEngineDeps) {
  return {
    run: (input: AskKilianChatEngineInput) => runAskKilianChatEngine(deps, input),
  }
}

async function runAskKilianChatEngine(
  deps: AskKilianChatEngineDeps,
  input: AskKilianChatEngineInput,
): Promise<AskKilianChatEngineResult> {
  const traceId = deps.createTraceId()
  const requestValidationResult = buildAskKilianChatRequest(input, {
    validateConversationLength: false,
  })

  if (!requestValidationResult.ok) {
    return {
      ok: false,
      status: 'failed',
      reason: requestValidationResult.error.code,
      traceId,
      diagnostics: {},
    }
  }

  const [promptConfig, runtimeConfig] = await Promise.all([
    deps.loadActivePromptConfig(),
    deps.loadActiveRuntimeConfig(),
  ])

  if (!promptConfig) {
    return {
      ok: false,
      status: 'failed',
      reason: 'missing_active_prompt_config',
      traceId,
      diagnostics: {},
    }
  }

  if (!runtimeConfig) {
    return {
      ok: false,
      status: 'failed',
      reason: 'missing_active_runtime_config',
      traceId,
      diagnostics: {
        promptRevisionId: promptConfig.id,
      },
    }
  }

  const runtimeRequestResult = buildAskKilianChatRequest(input, {
    conversationWindow: runtimeConfig.conversationWindow,
  })

  if (!runtimeRequestResult.ok) {
    return {
      ok: false,
      status: 'failed',
      reason: runtimeRequestResult.error.code,
      traceId,
      diagnostics: {
        promptRevisionId: promptConfig.id,
        runtimeConfigVersionId: runtimeConfig.id,
      },
    }
  }

  const request = runtimeRequestResult.request
  const baseDiagnostics = {
    promptRevisionId: promptConfig.id,
    runtimeConfigVersionId: runtimeConfig.id,
  } satisfies AskKilianChatEngineDiagnostics
  const classification = await deps.classify({
    prompt: request.latestUserMessage,
    tier: request.tier,
    request,
  })
  const quotaDecision = await deps.reserveQuota({
    bucket: request.quotaBucket,
    estimatedTokens: estimateChatTokens(request, runtimeConfig),
    quota: runtimeConfig.quota,
  })

  if (!quotaDecision.allowed) {
    return {
      ok: false,
      status: 'failed',
      reason: quotaDecision.reason,
      traceId,
      diagnostics: {
        ...baseDiagnostics,
        classification,
        quotaDecision,
      },
    }
  }

  let providerStage: 'rag' | 'model' = 'rag'
  let ragResult: Awaited<ReturnType<AskKilianChatEngineDeps['searchRag']>> | undefined
  let modelResult: Awaited<ReturnType<typeof buildHandledResponse>> | undefined

  try {
    ragResult = shouldUseRagAndModel(classification)
      ? await deps.searchRag({
          messages: request.messages,
          latestUserMessage: request.latestUserMessage,
          tier: request.tier,
          includeSpoilers: request.includeSpoilers,
          categories: request.categories,
          limit: runtimeConfig.ragLimit,
        })
      : {
          condensedQuery: request.latestUserMessage,
          ragCorpusVersionKey: ASK_KILIAN_NO_RAG_CORPUS_VERSION_KEY,
          entries: [],
        }
    providerStage = 'model'
    modelResult = await buildHandledResponse({
      deps,
      traceId,
      request,
      promptConfig,
      runtimeConfig,
      classification,
      ragEntries: ragResult.entries,
    })
  } catch (error) {
    return handleReservedProviderFailure({
      deps,
      input,
      traceId,
      request,
      promptConfig,
      runtimeConfig,
      classification,
      quotaDecision,
      reason: `${providerStage}_error`,
      error,
      ragResult,
    })
  }

  if (ragResult === undefined || modelResult === undefined) {
    return handleReservedProviderFailure({
      deps,
      input,
      traceId,
      request,
      promptConfig,
      runtimeConfig,
      classification,
      quotaDecision,
      reason: 'model_error',
      error: new Error('Ask Kilian provider result was not produced'),
      ragResult,
    })
  }

  const retrievedEntries = ragResult.entries.map(toRetrievedEntryRef)
  const modelMetadata = modelResult.model
  const metadata: AskKilianTraceMetadata = {
    callerMode: request.callerMode,
    quotaBucket: request.quotaBucket,
    status: modelResult.status,
    tier: request.tier,
    includeSpoilers: request.includeSpoilers,
    categories: request.categories,
    promptRevisionId: promptConfig.id,
    runtimeConfigVersionId: runtimeConfig.id,
    ragCorpusVersionKey: ragResult.ragCorpusVersionKey,
    condensedQuery: ragResult.condensedQuery ?? request.latestUserMessage,
    classification,
    retrievedEntries,
    quotaDecision,
    model: modelMetadata,
    posthogDistinctId: input.distinctId,
    posthogTraceId: traceId,
  }
  const traceMessages = buildTraceMessages(request.messages, modelResult.text, deps.now())
  let conversationId: string

  try {
    const conversation = await deps.recordConversation({
      traceId,
      messages: traceMessages,
      metadata,
    })
    conversationId = conversation.conversationId
  } catch {
    return {
      ok: false,
      status: 'failed',
      reason: 'logging_error',
      traceId,
      diagnostics: {
        ...baseDiagnostics,
        ragCorpusVersionKey: ragResult.ragCorpusVersionKey,
        classification,
        quotaDecision,
        retrievedEntries,
        model: modelMetadata,
      },
    }
  }

  try {
    await deps.captureMetric({
      event: metricEventForStatus(modelResult.status),
      distinctId: input.distinctId,
      traceId,
      status: modelResult.status,
      bucket: request.quotaBucket,
      modelId: modelMetadata.modelId,
      latencyMs: modelMetadata.latencyMs,
      promptRevisionId: promptConfig.id,
      runtimeConfigVersionId: runtimeConfig.id,
      ragCorpusVersionKey: ragResult.ragCorpusVersionKey,
      retrievedCount: retrievedEntries.length,
      classificationScope: classification.scope,
      classificationBehavior: classification.behavior,
    })
  } catch {
    // Metrics are intentionally best effort; conversation logging is the durable trace.
  }

  return {
    ok: true,
    status: modelResult.status,
    text: modelResult.text,
    traceId,
    diagnostics: {
      ...baseDiagnostics,
      ragCorpusVersionKey: ragResult.ragCorpusVersionKey,
      classification,
      quotaDecision,
      retrievedEntries,
      model: modelMetadata,
      conversationId,
    },
  }
}

async function handleReservedProviderFailure({
  deps,
  input,
  traceId,
  request,
  promptConfig,
  runtimeConfig,
  classification,
  quotaDecision,
  reason,
  error,
  ragResult,
}: {
  deps: AskKilianChatEngineDeps
  input: AskKilianChatEngineInput
  traceId: string
  request: AskKilianChatRequest
  promptConfig: AskKilianPromptConfigSummary
  runtimeConfig: AskKilianRuntimeConfigSummary
  classification: AskKilianClassificationDecision
  quotaDecision: AskKilianQuotaDecision
  reason: 'rag_error' | 'model_error'
  error: unknown
  ragResult?: Awaited<ReturnType<AskKilianChatEngineDeps['searchRag']>>
}): Promise<AskKilianChatEngineResult> {
  const errorMessage = error instanceof Error ? error.message : 'Unknown Ask Kilian provider failure'
  const modelMetadata = buildFailedModelMetadata(request, runtimeConfig)
  const retrievedEntries = ragResult?.entries.map(toRetrievedEntryRef) ?? []
  const ragCorpusVersionKey = ragResult?.ragCorpusVersionKey ?? ASK_KILIAN_NO_RAG_CORPUS_VERSION_KEY
  const metadata: AskKilianTraceMetadata = {
    callerMode: request.callerMode,
    quotaBucket: request.quotaBucket,
    status: 'failed',
    tier: request.tier,
    includeSpoilers: request.includeSpoilers,
    categories: request.categories,
    promptRevisionId: promptConfig.id,
    runtimeConfigVersionId: runtimeConfig.id,
    ragCorpusVersionKey,
    condensedQuery: ragResult?.condensedQuery ?? request.latestUserMessage,
    classification,
    retrievedEntries,
    quotaDecision,
    model: modelMetadata,
    posthogDistinctId: input.distinctId,
    posthogTraceId: traceId,
    error: errorMessage,
  }
  let conversationId: string | undefined

  try {
    const conversation = await deps.recordConversation({
      traceId,
      messages: buildTraceMessages(request.messages, ASK_KILIAN_PROVIDER_ERROR_TEXT, deps.now()),
      metadata,
    })
    conversationId = conversation.conversationId
  } catch {
    // The structured failure result should still reach the caller when durable logging is unavailable.
  }

  try {
    await deps.captureMetric({
      event: 'ask_kilian_chat_failed',
      distinctId: input.distinctId,
      traceId,
      status: 'failed',
      bucket: request.quotaBucket,
      modelId: modelMetadata.modelId,
      latencyMs: modelMetadata.latencyMs,
      promptRevisionId: promptConfig.id,
      runtimeConfigVersionId: runtimeConfig.id,
      ragCorpusVersionKey,
      retrievedCount: retrievedEntries.length,
      classificationScope: classification.scope,
      classificationBehavior: classification.behavior,
    })
  } catch {
    // Metrics are intentionally best effort; conversation logging is the durable trace.
  }

  return {
    ok: false,
    status: 'failed',
    reason,
    traceId,
    diagnostics: {
      promptRevisionId: promptConfig.id,
      runtimeConfigVersionId: runtimeConfig.id,
      ragCorpusVersionKey,
      classification,
      quotaDecision,
      retrievedEntries,
      model: modelMetadata,
      conversationId,
    },
  }
}

async function buildHandledResponse({
  deps,
  traceId,
  request,
  promptConfig,
  runtimeConfig,
  classification,
  ragEntries,
}: {
  deps: AskKilianChatEngineDeps
  traceId: string
  request: AskKilianChatRequest
  promptConfig: AskKilianPromptConfigSummary
  runtimeConfig: AskKilianRuntimeConfigSummary
  classification: AskKilianClassificationDecision
  ragEntries: AskKilianRagEntry[]
}): Promise<{
  status: Exclude<AskKilianChatStatus, 'failed'>
  text: string
  model: AskKilianModelMetadata
}> {
  if (classification.behavior === 'fake_lore') {
    return {
      status: 'completed',
      text: deterministicTextForBehavior(classification),
      model: {
        modelId: 'deterministic',
        latencyMs: 0,
        finishReason: classification.behavior,
      },
    }
  }

  if (classification.behavior === 'answer') {
    const streamResult = await deps.streamModel({
      modelId: request.runtimeModelOverride ?? runtimeConfig.modelId,
      maxOutputTokens: runtimeConfig.maxOutputTokens,
      temperature: runtimeConfig.temperature,
      systemPrompt: buildSystemPrompt({
        promptText: request.promptOverride ?? promptConfig.promptText,
        classification,
        ragEntries,
      }),
      messages: request.messages,
      traceId,
    })

    return {
      status: 'completed',
      text: streamResult.text,
      model: streamResult.metadata,
    }
  }

  const status = deterministicStatusForBehavior(classification)

  return {
    status,
    text: deterministicTextForBehavior(classification),
    model: {
      modelId: 'deterministic',
      latencyMs: 0,
      finishReason: classification.behavior,
    },
  }
}

function shouldUseRagAndModel(classification: AskKilianClassificationDecision) {
  return classification.behavior === 'answer'
}

function buildFailedModelMetadata(
  request: AskKilianChatRequest,
  runtimeConfig: AskKilianRuntimeConfigSummary,
): AskKilianModelMetadata {
  return {
    modelId: request.runtimeModelOverride ?? runtimeConfig.modelId,
    latencyMs: 0,
    finishReason: 'error',
  }
}

function buildSystemPrompt({
  promptText,
  classification,
  ragEntries,
}: {
  promptText: string
  classification: AskKilianClassificationDecision
  ragEntries: AskKilianRagEntry[]
}) {
  return [
    promptText.trim(),
    '',
    'Fixed guardrails:',
    FIXED_ASK_KILIAN_GUARDRAILS,
    '',
    'Classification:',
    `Scope: ${classification.scope}`,
    `Behavior: ${classification.behavior}`,
    `Topic: ${classification.topic}`,
    `Reason: ${classification.reason}`,
    '',
    'Retrieved RAG context:',
    ragEntries.length > 0
      ? ragEntries
          .map(
            (entry, index) =>
              `${index + 1}. [${entry.stableKey}] ${entry.title}\nCategory: ${entry.category}\nScore: ${entry.score.toFixed(3)}\n${entry.text}`,
          )
          .join('\n\n')
      : 'No retrieved entries.',
  ].join('\n')
}

function deterministicStatusForBehavior(
  classification: AskKilianClassificationDecision,
): Exclude<AskKilianChatStatus, 'failed' | 'completed'> {
  if (classification.behavior === 'clarify') return 'clarifying'
  if (classification.behavior === 'redirect' && classification.scope === 'achievement_spoiler_request') {
    return 'clarifying'
  }
  return 'refused'
}

function deterministicTextForBehavior(classification: AskKilianClassificationDecision) {
  if (classification.behavior === 'clarify') {
    return 'Ask Kilian can help with Kilian, kil.dev, projects, career, pets, themes, achievements, and site lore. Ask with one of those angles and I can answer properly.'
  }

  if (classification.behavior === 'redirect' && classification.scope === 'achievement_spoiler_request') {
    return 'Ask Kilian can give achievement hints, but not exact unlock spoilers. Try asking for a nudge instead.'
  }

  if (classification.behavior === 'redirect') {
    return 'Ask Kilian is for questions about Kilian and kil.dev, not general-purpose AI work. Ask about the site, projects, career, pets, themes, or achievements.'
  }

  if (classification.behavior === 'fake_lore') {
    return 'Obviously fake lore: Kilian lives inside a tiny filing cabinet under kil.dev, where every drawer contains another even smaller portfolio site. Real private facts stay private.'
  }

  return 'Ask Kilian cannot help with private facts or sensitive personal details.'
}

function buildTraceMessages(
  messages: readonly AskKilianChatMessage[],
  assistantText: string,
  createdAt: number,
): AskKilianTraceMessage[] {
  return [
    ...messages.map(message => ({
      role: message.role,
      content: message.content,
      createdAt,
    })),
    {
      role: 'assistant' as const,
      content: assistantText,
      createdAt,
    },
  ]
}

function toRetrievedEntryRef(entry: AskKilianRagEntry): Omit<AskKilianRagEntry, 'text'> {
  return {
    stableKey: entry.stableKey,
    title: entry.title,
    category: entry.category,
    score: entry.score,
    contentHash: entry.contentHash,
  }
}

function estimateChatTokens(request: AskKilianChatRequest, runtimeConfig: AskKilianRuntimeConfigSummary) {
  const inputCharacters = request.messages.reduce((total, message) => total + message.content.length, 0)
  return Math.ceil(inputCharacters / 4) + runtimeConfig.maxOutputTokens
}

function metricEventForStatus(status: AskKilianChatStatus) {
  if (status === 'completed') return 'ask_kilian_chat_completed'
  if (status === 'failed') return 'ask_kilian_chat_failed'
  return 'ask_kilian_classification_decision'
}
