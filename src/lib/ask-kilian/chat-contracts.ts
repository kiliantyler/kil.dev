import type { AskKilianKnowledgeCategory, AskKilianTier } from './types'

export const ASK_KILIAN_CHAT_MAX_INPUT_LENGTH = 2_000
export const ASK_KILIAN_CHAT_MAX_CONVERSATION_LENGTH = 6_000
export const ASK_KILIAN_CHAT_CONTEXT_WINDOW = 6

const ASK_KILIAN_CHAT_CALLER_MODES = ['admin_test', 'public'] as const
const ASK_KILIAN_CHAT_QUOTA_BUCKETS = ['admin_test', 'public'] as const
const ASK_KILIAN_CHAT_STATUSES = ['completed', 'refused', 'clarifying', 'failed'] as const

type AskKilianChatCallerMode = (typeof ASK_KILIAN_CHAT_CALLER_MODES)[number]
export type AskKilianChatQuotaBucket = (typeof ASK_KILIAN_CHAT_QUOTA_BUCKETS)[number]
export type AskKilianChatStatus = (typeof ASK_KILIAN_CHAT_STATUSES)[number]

export type AskKilianChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type AskKilianChatRequestInput = {
  callerMode: AskKilianChatCallerMode
  messages: AskKilianChatMessage[]
  tier: AskKilianTier
  includeSpoilers: boolean
  categories: readonly AskKilianKnowledgeCategory[]
  promptOverride?: string
  runtimeModelOverride?: string
}

export type AskKilianChatRequest = {
  callerMode: AskKilianChatCallerMode
  messages: AskKilianChatMessage[]
  latestUserMessage: string
  quotaBucket: AskKilianChatQuotaBucket
  tier: AskKilianTier
  includeSpoilers: boolean
  categories: AskKilianKnowledgeCategory[]
  promptOverride?: string
  runtimeModelOverride?: string
}

type AskKilianChatRequestError =
  | {
      code: 'empty_input'
      message: string
    }
  | {
      code: 'input_too_large'
      message: string
    }

export type BuildAskKilianChatRequestResult =
  | {
      ok: true
      request: AskKilianChatRequest
    }
  | {
      ok: false
      error: AskKilianChatRequestError
    }

export type BuildAskKilianChatRequestOptions = {
  conversationWindow?: number
}

export function normalizeAskKilianConversationWindow(
  messages: readonly AskKilianChatMessage[],
  conversationWindow = ASK_KILIAN_CHAT_CONTEXT_WINDOW,
): AskKilianChatMessage[] {
  const windowSize = normalizeConversationWindowSize(conversationWindow)

  return messages
    .map(message => ({
      role: message.role,
      content: message.content.trim(),
    }))
    .filter(message => message.content.length > 0)
    .slice(-windowSize)
}

export function buildAskKilianChatRequest(
  input: AskKilianChatRequestInput,
  options: BuildAskKilianChatRequestOptions = {},
): BuildAskKilianChatRequestResult {
  const latestUserMessage = findLatestUserMessage(input.messages)

  if (latestUserMessage.length === 0) {
    return {
      ok: false,
      error: {
        code: 'empty_input',
        message: 'Enter a message before asking Ask Kilian.',
      },
    }
  }

  if (latestUserMessage.length > ASK_KILIAN_CHAT_MAX_INPUT_LENGTH) {
    return {
      ok: false,
      error: {
        code: 'input_too_large',
        message: `Ask Kilian messages must be ${ASK_KILIAN_CHAT_MAX_INPUT_LENGTH} characters or fewer.`,
      },
    }
  }

  const messages = normalizeAskKilianConversationWindow(input.messages, options.conversationWindow)
  const conversationLength = messages.reduce((total, message) => total + message.content.length, 0)

  if (conversationLength > ASK_KILIAN_CHAT_MAX_CONVERSATION_LENGTH) {
    return {
      ok: false,
      error: {
        code: 'input_too_large',
        message: `Ask Kilian conversations must be ${ASK_KILIAN_CHAT_MAX_CONVERSATION_LENGTH} characters or fewer.`,
      },
    }
  }

  const request: AskKilianChatRequest = {
    callerMode: input.callerMode,
    messages,
    latestUserMessage,
    quotaBucket: input.callerMode,
    tier: input.tier,
    includeSpoilers: input.includeSpoilers,
    categories: [...input.categories],
  }

  const promptOverride = trimOptionalOverride(input.promptOverride)
  const runtimeModelOverride = trimOptionalOverride(input.runtimeModelOverride)

  if (promptOverride !== undefined) {
    request.promptOverride = promptOverride
  }

  if (runtimeModelOverride !== undefined) {
    request.runtimeModelOverride = runtimeModelOverride
  }

  return {
    ok: true,
    request,
  }
}

function normalizeConversationWindowSize(value: number): number {
  if (!Number.isFinite(value)) return ASK_KILIAN_CHAT_CONTEXT_WINDOW
  return Math.max(1, Math.floor(value))
}

function findLatestUserMessage(messages: readonly AskKilianChatMessage[]): string {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]

    if (message?.role === 'user') {
      return message.content.trim()
    }
  }

  return ''
}

function trimOptionalOverride(value: string | undefined): string | undefined {
  const trimmedValue = value?.trim()

  return trimmedValue === undefined || trimmedValue.length === 0 ? undefined : trimmedValue
}
