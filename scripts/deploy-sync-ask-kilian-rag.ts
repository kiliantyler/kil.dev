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

  if (environment === 'preview') {
    deps.log('[ask-kilian:deploy-sync] hydrating preview RAG before if-changed sync')
    await deps.hydratePreview({ env })
  } else {
    deps.log('[ask-kilian:deploy-sync] running production if-changed sync')
  }

  const result = await deps.syncIfChanged({
    convexUrl,
    accessToken,
    mode: 'ifChanged',
  })

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
