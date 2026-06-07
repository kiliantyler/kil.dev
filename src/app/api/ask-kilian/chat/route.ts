import { requireAdminAuthContext } from '@/lib/admin-auth'
import { runAskKilianChatForAdmin, type GenerateAskKilianChatAdminInput } from '@/lib/ask-kilian/chat-runtime'
import { ASK_KILIAN_CATEGORIES, type AskKilianKnowledgeCategory } from '@/lib/ask-kilian/types'
import { NextResponse } from 'next/server'

const ADMIN_ONLY_MESSAGE = 'Ask Kilian chat is admin-only until KTY-67.'
const INVALID_REQUEST_MESSAGE = 'Invalid Ask Kilian chat request.'
const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store',
}

export async function POST(request: Request) {
  let admin: Awaited<ReturnType<typeof requireAdminAuthContext>>

  try {
    admin = await requireAdminAuthContext()
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: ADMIN_ONLY_MESSAGE,
      },
      {
        status: 403,
        headers: NO_STORE_HEADERS,
      },
    )
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return invalidRequestResponse()
  }

  const input = parseAskKilianChatRequestBody(body)
  if (!input.ok) {
    return invalidRequestResponse()
  }

  const result = await runAskKilianChatForAdmin({
    ...input.value,
    distinctId: admin.email,
  })

  return NextResponse.json(result, {
    headers: NO_STORE_HEADERS,
  })
}

type ParseAskKilianChatRequestBodyResult =
  | {
      ok: true
      value: GenerateAskKilianChatAdminInput
    }
  | {
      ok: false
    }

function invalidRequestResponse() {
  return NextResponse.json(
    {
      ok: false,
      message: INVALID_REQUEST_MESSAGE,
    },
    {
      status: 400,
      headers: NO_STORE_HEADERS,
    },
  )
}

function parseAskKilianChatRequestBody(body: unknown): ParseAskKilianChatRequestBodyResult {
  const record =
    body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : undefined

  if (!record || !Array.isArray(record.messages)) {
    return { ok: false }
  }

  const messages = parseMessages(record.messages)
  if (!messages) {
    return { ok: false }
  }

  const categories = parseCategories(record.categories, 'categories' in record)
  if (!categories) {
    return { ok: false }
  }

  return {
    ok: true,
    value: {
      messages,
      tier: record.tier === 0 || record.tier === 2 ? record.tier : 1,
      includeSpoilers: record.includeSpoilers === true,
      categories,
      promptOverride: typeof record.promptOverride === 'string' ? record.promptOverride : undefined,
      runtimeModelOverride: typeof record.runtimeModelOverride === 'string' ? record.runtimeModelOverride : undefined,
    } as GenerateAskKilianChatAdminInput,
  }
}

function parseMessages(messages: unknown[]): GenerateAskKilianChatAdminInput['messages'] | undefined {
  const parsedMessages: GenerateAskKilianChatAdminInput['messages'] = []

  for (const message of messages) {
    if (!message || typeof message !== 'object' || Array.isArray(message)) {
      return undefined
    }

    const record = message as Record<string, unknown>
    if ((record.role !== 'user' && record.role !== 'assistant') || typeof record.content !== 'string') {
      return undefined
    }

    parsedMessages.push({
      role: record.role,
      content: record.content,
    })
  }

  return parsedMessages
}

function parseCategories(
  value: unknown,
  hasCategoriesField: boolean,
): GenerateAskKilianChatAdminInput['categories'] | undefined {
  if (!hasCategoriesField) {
    return []
  }

  if (!Array.isArray(value)) {
    return undefined
  }

  const categories: AskKilianKnowledgeCategory[] = []

  for (const category of value) {
    if (typeof category !== 'string' || !ASK_KILIAN_CATEGORIES.includes(category as AskKilianKnowledgeCategory)) {
      return undefined
    }

    categories.push(category as AskKilianKnowledgeCategory)
  }

  return categories
}
