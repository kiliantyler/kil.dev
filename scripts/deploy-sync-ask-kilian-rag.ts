#!/usr/bin/env bun
import type { SyncSummary } from '../convex/askKilianKnowledge'
import { isPlaceholderSecret } from '../src/lib/env-secrets.js'
import { hydrateAskKilianPreviewRag, type HydrateAskKilianPreviewRagDeps } from './hydrate-ask-kilian-preview-rag'
import { syncAskKilianKnowledge, type SyncIfChangedSummary } from './sync-ask-kilian-knowledge'

type DeploySyncEnv = Record<string, string | undefined>
type DeploySyncEnvironment = 'preview' | 'production'
type DeploySyncResult =
  | { skipped: true; reason: 'outside-vercel' | 'unsupported-vercel-env' }
  | {
      skipped: false
      environment: DeploySyncEnvironment
      result: SyncSummary | SyncIfChangedSummary
    }

type HydratePreview = (
  options: { env: DeploySyncEnv },
  deps?: HydrateAskKilianPreviewRagDeps,
) => Promise<{ hydrated: true; targetDeployment: string }>

type SyncIfChanged = (options: {
  convexUrl: string
  accessToken: string
  mode: 'ifChanged'
}) => Promise<SyncSummary | SyncIfChangedSummary>

export type DeploySyncAskKilianRagDeps = {
  hydratePreview: HydratePreview
  syncIfChanged: SyncIfChanged
  log: (message: string) => void
}

function createDefaultDeps(): DeploySyncAskKilianRagDeps {
  return {
    hydratePreview: hydrateAskKilianPreviewRag,
    syncIfChanged: syncAskKilianKnowledge,
    log: message => console.log(message),
  }
}

function resolveDeploySyncEnv(env: DeploySyncEnv) {
  const convexUrl = (env.NEXT_PUBLIC_CONVEX_URL ?? env.CONVEX_URL)?.trim()
  const accessToken = env.ASK_KILIAN_CONVEX_ACCESS_TOKEN?.trim()

  if (!convexUrl) {
    throw new Error('Missing Convex URL for Ask Kilian deploy sync')
  }
  if (!accessToken) {
    throw new Error('Missing ASK_KILIAN_CONVEX_ACCESS_TOKEN for Ask Kilian deploy sync')
  }
  if (isPlaceholderSecret(accessToken)) {
    throw new Error('Replace placeholder ASK_KILIAN_CONVEX_ACCESS_TOKEN for Ask Kilian deploy sync')
  }

  return { convexUrl, accessToken }
}

function requireGatewayEnv(env: DeploySyncEnv, expected: DeploySyncEnvironment) {
  if (env.ASK_KILIAN_GATEWAY_ENV !== expected) {
    throw new Error(`ASK_KILIAN_GATEWAY_ENV must be ${expected} for Vercel ${expected} deploy sync`)
  }
}

function formatCounts(counts: SyncSummary['counts']) {
  return `created=${counts.created}, changed=${counts.changed}, retired=${counts.retired}, unchanged=${counts.unchanged}, ignoredAdmin=${counts.ignoredAdmin}`
}

function logSyncResult(
  deps: Pick<DeploySyncAskKilianRagDeps, 'log'>,
  environment: DeploySyncEnvironment,
  result: SyncSummary | SyncIfChangedSummary,
) {
  if ('skipped' in result) {
    if (result.skipped) {
      deps.log(
        `[ask-kilian:deploy-sync] ${environment} sync skipped; no repo knowledge changes detected (${formatCounts(result.diff.counts)})`,
      )
      return
    }

    deps.log(
      `[ask-kilian:deploy-sync] ${environment} sync applied repo knowledge changes (${formatCounts(result.sync.counts)})`,
    )
    return
  }

  deps.log(`[ask-kilian:deploy-sync] ${environment} sync completed (${formatCounts(result.counts)})`)
}

export async function deploySyncAskKilianRag(
  { env = process.env }: { env?: DeploySyncEnv } = {},
  deps: DeploySyncAskKilianRagDeps = createDefaultDeps(),
): Promise<DeploySyncResult> {
  if (env.VERCEL !== '1' && env.KIL_DEV_ENABLE_DEPLOY_SYNC !== '1') {
    return { skipped: true, reason: 'outside-vercel' }
  }

  if (env.VERCEL_ENV !== 'preview' && env.VERCEL_ENV !== 'production') {
    return { skipped: true, reason: 'unsupported-vercel-env' }
  }

  const environment = env.VERCEL_ENV
  requireGatewayEnv(env, environment)
  const { convexUrl, accessToken } = resolveDeploySyncEnv(env)
  deps.log(`[ask-kilian:deploy-sync] starting ${environment} deploy sync against ${convexUrl}`)

  if (environment === 'preview') {
    deps.log('[ask-kilian:deploy-sync] hydrating preview RAG before if-changed sync')
    const hydration = await deps.hydratePreview({ env })
    deps.log(`[ask-kilian:deploy-sync] preview RAG hydration completed for ${hydration.targetDeployment}`)
  } else {
    deps.log('[ask-kilian:deploy-sync] running production if-changed sync')
  }

  deps.log('[ask-kilian:deploy-sync] checking repo knowledge changes')
  const result = await deps.syncIfChanged({
    convexUrl,
    accessToken,
    mode: 'ifChanged',
  })
  logSyncResult(deps, environment, result)
  deps.log(`[ask-kilian:deploy-sync] ${environment} deploy sync completed`)

  return { skipped: false, environment, result }
}

if (import.meta.main) {
  try {
    const result = await deploySyncAskKilianRag()
    console.log(JSON.stringify(result, null, 2))
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}
