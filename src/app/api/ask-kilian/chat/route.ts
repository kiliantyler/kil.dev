import { requireAdminAuthContext } from '@/lib/admin-auth'
import { runAskKilianChatForAdmin, type GenerateAskKilianChatAdminInput } from '@/lib/ask-kilian/chat-runtime'
import { NextResponse } from 'next/server'

const ADMIN_ONLY_MESSAGE = 'Ask Kilian chat is admin-only until KTY-67.'
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

  const input = parseAskKilianChatRequestBody(await request.json())
  const result = await runAskKilianChatForAdmin({
    ...input,
    distinctId: admin.email,
  })

  return NextResponse.json(result, {
    headers: NO_STORE_HEADERS,
  })
}

function parseAskKilianChatRequestBody(body: unknown): GenerateAskKilianChatAdminInput {
  const record = body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : {}

  return {
    messages: Array.isArray(record.messages) ? record.messages : [],
    tier: record.tier === 0 || record.tier === 2 ? record.tier : 1,
    includeSpoilers: record.includeSpoilers === true,
    categories: Array.isArray(record.categories) ? record.categories : [],
    promptOverride: typeof record.promptOverride === 'string' ? record.promptOverride : undefined,
    runtimeModelOverride: typeof record.runtimeModelOverride === 'string' ? record.runtimeModelOverride : undefined,
  } as GenerateAskKilianChatAdminInput
}
