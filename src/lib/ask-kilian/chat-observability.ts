import type { AskKilianClassificationBehavior, AskKilianClassificationScope } from './chat-classifier'
import type { AskKilianChatQuotaBucket, AskKilianChatStatus } from './chat-contracts'

export type AskKilianQuotaBucket = AskKilianChatQuotaBucket

export type AskKilianPostHogEventName =
  | 'ask_kilian_chat_started'
  | 'ask_kilian_chat_completed'
  | 'ask_kilian_chat_failed'
  | 'ask_kilian_quota_decision'
  | 'ask_kilian_classification_decision'

export type AskKilianPostHogEventInput = {
  event: AskKilianPostHogEventName
  distinctId: string
  traceId: string
  status: AskKilianChatStatus
  bucket: AskKilianQuotaBucket
  modelId: string
  latencyMs: number
  promptRevisionId: string
  runtimeConfigVersionId: string
  ragCorpusVersionKey: string
  retrievedCount: number
  classificationScope: AskKilianClassificationScope
  classificationBehavior: AskKilianClassificationBehavior
}

export type AskKilianPostHogEvent = {
  event: AskKilianPostHogEventName
  distinctId: string
  properties: {
    traceId: string
    status: AskKilianChatStatus
    bucket: AskKilianQuotaBucket
    modelId: string
    latencyMs: number
    promptRevisionId: string
    runtimeConfigVersionId: string
    ragCorpusVersionKey: string
    retrievedCount: number
    classificationScope: AskKilianClassificationScope
    classificationBehavior: AskKilianClassificationBehavior
  }
}

export type CaptureAskKilianPostHogEventInput = {
  posthogKey: string | undefined
  posthogHost: string | undefined
  event: AskKilianPostHogEvent
  fetchImplementation?: typeof fetch
}

export function buildAskKilianPostHogEvent(input: AskKilianPostHogEventInput): AskKilianPostHogEvent {
  return {
    event: input.event,
    distinctId: input.distinctId,
    properties: {
      traceId: input.traceId,
      status: input.status,
      bucket: input.bucket,
      modelId: input.modelId,
      latencyMs: input.latencyMs,
      promptRevisionId: input.promptRevisionId,
      runtimeConfigVersionId: input.runtimeConfigVersionId,
      ragCorpusVersionKey: input.ragCorpusVersionKey,
      retrievedCount: input.retrievedCount,
      classificationScope: input.classificationScope,
      classificationBehavior: input.classificationBehavior,
    },
  }
}

export async function captureAskKilianPostHogEvent({
  posthogKey,
  posthogHost,
  event,
  fetchImplementation = fetch,
}: CaptureAskKilianPostHogEventInput): Promise<void> {
  const apiKey = posthogKey?.trim() ?? ''
  const host = posthogHost?.trim().replace(/\/+$/u, '') ?? ''

  if (apiKey.length === 0 || host.length === 0) {
    return
  }

  await fetchImplementation(`${host}/capture/`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      api_key: apiKey,
      event: event.event,
      distinct_id: event.distinctId,
      properties: event.properties,
    }),
  })
}
