import { ConvexHttpClient } from 'convex/browser'

import { api } from '../convex/_generated/api'
import type { AskKilianRuntimeEnvStatus, SyncSummary } from '../convex/askKilianKnowledge'
import { buildAskKilianKnowledgeEntries } from '../src/lib/ask-kilian/knowledge-sources'
import type { AskKilianKnowledgeEntry } from '../src/lib/ask-kilian/types'
import { isPlaceholderSecret } from '../src/lib/env-secrets'

const MIN_FULL_MANIFEST_ENTRY_COUNT = 10
type ConvexActionClient = Pick<ConvexHttpClient, 'action'>

export type SyncAskKilianKnowledgeDeps = {
  createClient: (convexUrl: string) => ConvexActionClient
  buildEntries: () => AskKilianKnowledgeEntry[]
}

export function parseSyncAskKilianArgs(args: string[]) {
  let dryRun = false
  for (const arg of args) {
    if (arg === '--dry-run') {
      dryRun = true
      continue
    }
    throw new Error(`Unknown Ask Kilian sync option: ${arg}`)
  }
  return { dryRun }
}

export function resolveSyncMode(env: { NEXT_PUBLIC_CONVEX_URL?: string; ASK_KILIAN_CONVEX_ACCESS_TOKEN?: string }) {
  const convexUrl = env.NEXT_PUBLIC_CONVEX_URL?.trim()
  const accessToken = env.ASK_KILIAN_CONVEX_ACCESS_TOKEN?.trim()

  if (!convexUrl) {
    throw new Error('Missing NEXT_PUBLIC_CONVEX_URL for Ask Kilian knowledge sync')
  }
  if (!accessToken) {
    throw new Error('Missing ASK_KILIAN_CONVEX_ACCESS_TOKEN for Ask Kilian knowledge sync')
  }
  if (isPlaceholderSecret(accessToken)) {
    throw new Error('Replace placeholder ASK_KILIAN_CONVEX_ACCESS_TOKEN for Ask Kilian knowledge sync')
  }

  return { convexUrl, accessToken }
}

function createDefaultDeps(): SyncAskKilianKnowledgeDeps {
  return {
    createClient: convexUrl => new ConvexHttpClient(convexUrl),
    buildEntries: buildAskKilianKnowledgeEntries,
  }
}

function assertFullManifestEntries(entries: AskKilianKnowledgeEntry[]) {
  if (entries.length < MIN_FULL_MANIFEST_ENTRY_COUNT) {
    throw new Error(
      `Ask Kilian knowledge sync built only ${entries.length} entries; refusing full-manifest sync below ${MIN_FULL_MANIFEST_ENTRY_COUNT}`,
    )
  }
}

export async function syncAskKilianKnowledge(
  {
    dryRun,
    convexUrl,
    accessToken,
  }: {
    dryRun: boolean
    convexUrl: string
    accessToken: string
  },
  deps: SyncAskKilianKnowledgeDeps = createDefaultDeps(),
): Promise<SyncSummary> {
  const entries = deps.buildEntries()
  assertFullManifestEntries(entries)
  const client = deps.createClient(convexUrl)

  const runtimeEnvStatus: AskKilianRuntimeEnvStatus = await client.action(
    api.askKilianKnowledge.verifyRuntimeEnvForServer,
    {
      accessToken,
    },
  )
  if (!runtimeEnvStatus.ok) {
    throw new Error('Ask Kilian Convex runtime environment verification failed')
  }

  return await client.action(api.askKilianKnowledge.syncRepoKnowledgeForServer, {
    accessToken,
    entries,
    dryRun,
    isFullManifest: true,
  })
}

async function main() {
  const args = parseSyncAskKilianArgs(process.argv.slice(2))
  const { convexUrl, accessToken } = resolveSyncMode({
    NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
    ASK_KILIAN_CONVEX_ACCESS_TOKEN: process.env.ASK_KILIAN_CONVEX_ACCESS_TOKEN,
  })
  const result = await syncAskKilianKnowledge({ dryRun: args.dryRun, convexUrl, accessToken })
  console.log(JSON.stringify(result, null, 2))
}

if (import.meta.main) {
  try {
    await main()
  } catch (error) {
    console.error(error)
    process.exitCode = 1
  }
}
