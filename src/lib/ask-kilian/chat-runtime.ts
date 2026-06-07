import { env } from '@/env'
import { streamText } from 'ai'
import { randomUUID } from 'node:crypto'
import { api } from '../../../convex/_generated/api'
import { classifyAskKilianPrompt } from './chat-classifier'
import { createAskKilianChatEngine, type AskKilianChatEngineInput, type AskKilianRagEntry } from './chat-engine'
import { buildAskKilianPostHogEvent, captureAskKilianPostHogEvent } from './chat-observability'
import { createAskKilianConvexServerClient } from './convex-server-client'

export type AskKilianChatForAdminInput = Omit<AskKilianChatEngineInput, 'callerMode'>
export type GenerateAskKilianChatAdminInput = Omit<AskKilianChatForAdminInput, 'distinctId'>

type StreamTextOptions = Parameters<typeof streamText>[0]
type StreamTextMessages = Extract<StreamTextOptions, { messages: unknown }>['messages']

type RuntimeRagSearchResult = {
  condensedQuery: string
  ragCorpusVersionKey: string
  results: AskKilianRagEntry[]
}

export async function runAskKilianChatForAdmin(input: AskKilianChatForAdminInput) {
  const client = await createAskKilianConvexServerClient()
  const engine = createAskKilianChatEngine({
    now: () => Date.now(),
    createTraceId: () => randomUUID(),
    loadActivePromptConfig: () => client.action(api.askKilianChat.getActivePromptConfigForAdmin, {}),
    loadActiveRuntimeConfig: () => client.action(api.askKilianChat.getActiveRuntimeConfigForAdmin, {}),
    classify: classifyAskKilianPrompt,
    reserveQuota: args => client.action(api.askKilianChat.reserveQuotaForAdmin, args),
    async searchRag(args) {
      const result: RuntimeRagSearchResult = await client.action(api.askKilianChat.searchRuntimeRagForAdmin, args)
      return {
        condensedQuery: result.condensedQuery,
        ragCorpusVersionKey: result.ragCorpusVersionKey,
        entries: result.results,
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
    recordConversation: args => client.action(api.askKilianChat.recordConversationForAdmin, args),
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
