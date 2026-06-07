import { env } from '@/env'
import { api } from '../../../convex/_generated/api'
import { classifyAskKilianPrompt } from './chat-classifier'
import {
  createAskKilianChatEngine,
  type AskKilianChatEngineInput,
  type AskKilianRagEntry,
} from './chat-engine'
import { buildAskKilianPostHogEvent, captureAskKilianPostHogEvent } from './chat-observability'
import { createAskKilianConvexServerClient } from './convex-server-client'
import { streamText } from 'ai'
import type { FunctionReference } from 'convex/server'
import { randomUUID } from 'node:crypto'

export type AskKilianChatForAdminInput = Omit<AskKilianChatEngineInput, 'callerMode'>
export type GenerateAskKilianChatAdminInput = Omit<AskKilianChatForAdminInput, 'distinctId'>

type StreamTextOptions = Parameters<typeof streamText>[0]
type StreamTextMessages = Extract<StreamTextOptions, { messages: unknown }>['messages']

type RuntimeRagSearchResult = {
  ragCorpusVersionKey: string
  entries?: AskKilianRagEntry[]
  results?: AskKilianRagEntry[]
}

type AskKilianChatRuntimeApi = {
  askKilianChat: {
    getActivePromptConfigForAdmin: FunctionReference<'action', 'public', Record<string, never>, unknown>
    getActiveRuntimeConfigForAdmin: FunctionReference<'action', 'public', Record<string, never>, unknown>
    reserveQuotaForAdmin: FunctionReference<'action', 'public', Record<string, unknown>, unknown>
    searchRuntimeRagForAdmin: FunctionReference<'action', 'public', Record<string, unknown>, RuntimeRagSearchResult>
    recordConversationForAdmin: FunctionReference<'action', 'public', Record<string, unknown>, unknown>
  }
}

const askKilianChatApi = (api as unknown as AskKilianChatRuntimeApi).askKilianChat

export async function runAskKilianChatForAdmin(input: AskKilianChatForAdminInput) {
  const client = await createAskKilianConvexServerClient()
  const engine = createAskKilianChatEngine({
    now: () => Date.now(),
    createTraceId: () => randomUUID(),
    loadActivePromptConfig: () => client.action(askKilianChatApi.getActivePromptConfigForAdmin, {}) as never,
    loadActiveRuntimeConfig: () => client.action(askKilianChatApi.getActiveRuntimeConfigForAdmin, {}) as never,
    classify: classifyAskKilianPrompt,
    reserveQuota: args => client.action(askKilianChatApi.reserveQuotaForAdmin, args) as never,
    async searchRag(args) {
      const result = await client.action(askKilianChatApi.searchRuntimeRagForAdmin, args)
      return {
        ragCorpusVersionKey: result.ragCorpusVersionKey,
        entries: result.entries ?? result.results ?? [],
      }
    },
    async streamModel(args) {
      const startedAt = Date.now()
      const result = streamText({
        model: args.modelId as StreamTextOptions['model'],
        system: args.systemPrompt,
        messages: args.messages as StreamTextMessages,
        maxOutputTokens: args.maxOutputTokens,
        temperature: args.temperature,
      })
      const [text, usage, finishReason] = await Promise.all([result.text, result.usage, result.finishReason])

      return {
        text,
        metadata: {
          modelId: args.modelId,
          latencyMs: Date.now() - startedAt,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          finishReason,
        },
      }
    },
    recordConversation: args => client.action(askKilianChatApi.recordConversationForAdmin, args) as never,
    async captureMetric(args) {
      await captureAskKilianPostHogEvent({
        posthogKey: env.NEXT_PUBLIC_POSTHOG_KEY,
        posthogHost: env.NEXT_PUBLIC_POSTHOG_HOST,
        event: buildAskKilianPostHogEvent(args),
      })
    },
  })

  return engine.run({ ...input, callerMode: 'admin_test' })
}
