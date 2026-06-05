#!/usr/bin/env bun
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'

import {
  ASK_KILIAN_APP_TABLES,
  ASK_KILIAN_RAG_COMPONENT_PATH,
  ASK_KILIAN_RAG_TABLES,
  requireDevSourceDeployKey,
  requirePreviewTargetDeployKey,
} from './ask-kilian-rag-tables'

const execFileAsync = promisify(execFile)

type HydrationEnv = Record<string, string | undefined>
type RunOptions = { env: NodeJS.ProcessEnv }
type ExtractSnapshotTableOptions = { component?: string; outputDir?: string }
type ExtractedSnapshotTable = { filePath: string; rowCount: number }

export type HydrateAskKilianPreviewRagDeps = {
  mkdtemp: (prefix: string) => Promise<string>
  rm: (path: string, options: { recursive: true; force: true }) => Promise<void>
  extractSnapshotTable: (
    snapshotZip: string,
    table: string,
    options?: ExtractSnapshotTableOptions,
  ) => Promise<ExtractedSnapshotTable>
  run: (command: string, options: RunOptions) => Promise<string>
  log: (message: string) => void
}

function shellQuote(value: string) {
  return `'${value.replaceAll("'", String.raw`'\''`)}'`
}

function commandEnv(env: HydrationEnv, convexDeployKey: string): NodeJS.ProcessEnv {
  const rest = { ...env }
  delete rest.ASK_KILIAN_RAG_SOURCE_CONVEX_DEPLOY_KEY
  delete rest.CONVEX_DEPLOY_KEY

  return {
    ...process.env,
    ...rest,
    CONVEX_DEPLOY_KEY: convexDeployKey,
  }
}

function targetDeploymentFromEnv(env: HydrationEnv) {
  const convexUrl = env.NEXT_PUBLIC_CONVEX_URL?.trim()
  if (!convexUrl) return 'unknown-preview'

  try {
    return new URL(convexUrl).hostname.replace(/\.convex\.(cloud|site)$/, '')
  } catch {
    return 'unknown-preview'
  }
}

function snapshotPathCandidates(table: string, options: ExtractSnapshotTableOptions) {
  if (options.component) {
    return [`components/${options.component}/${table}/documents.jsonl`, `${options.component}/${table}/documents.jsonl`]
  }

  return [`${table}/documents.jsonl`, `tables/${table}/documents.jsonl`]
}

async function extractSnapshotTable(
  snapshotZip: string,
  table: string,
  options: ExtractSnapshotTableOptions = {},
): Promise<ExtractedSnapshotTable> {
  let content: string | undefined

  for (const candidate of snapshotPathCandidates(table, options)) {
    try {
      const { stdout } = await execFileAsync('unzip', ['-p', snapshotZip, candidate], { encoding: 'utf8' })
      content = stdout
      break
    } catch {
      // Convex export paths have changed across CLI versions; try the next known shape.
    }
  }

  if (content === undefined) {
    const tableName = options.component ? `${options.component}.${table}` : table
    throw new Error(`Unable to find Convex export documents for table ${tableName}`)
  }

  const outputDir = options.outputDir ?? tmpdir()
  await mkdir(outputDir, { recursive: true })
  const filePath = path.join(outputDir, `${options.component ? `${options.component}-` : ''}${table}.jsonl`)
  await writeFile(filePath, content)

  return {
    filePath,
    rowCount: content.split('\n').filter(line => line.trim()).length,
  }
}

function createDefaultDeps(): HydrateAskKilianPreviewRagDeps {
  return {
    mkdtemp,
    rm,
    extractSnapshotTable,
    log: message => console.log(message),
    run: async (command, options) => {
      const { stdout } = await execFileAsync('bash', ['-lc', command], {
        env: options.env,
        encoding: 'utf8',
      })
      return stdout
    },
  }
}

export async function hydrateAskKilianPreviewRag(
  { env = process.env }: { env?: HydrationEnv } = {},
  deps: HydrateAskKilianPreviewRagDeps = createDefaultDeps(),
) {
  if (env.VERCEL_ENV !== 'preview') {
    throw new Error('Preview RAG hydration only runs for Vercel preview deployments')
  }

  const sourceKey = requireDevSourceDeployKey(env.ASK_KILIAN_RAG_SOURCE_CONVEX_DEPLOY_KEY)
  const targetKey = requirePreviewTargetDeployKey(env.CONVEX_DEPLOY_KEY)
  if (sourceKey === undefined) {
    throw new Error('ASK_KILIAN_RAG_SOURCE_CONVEX_DEPLOY_KEY must be a dev-scoped Convex deploy key')
  }
  if (targetKey === undefined) {
    throw new Error('CONVEX_DEPLOY_KEY must be a preview-scoped Convex deploy key for preview hydration')
  }

  const targetDeployment = targetDeploymentFromEnv(env)
  const tempDir = await deps.mkdtemp(path.join(tmpdir(), 'ask-kilian-preview-rag-'))
  const sourceSnapshotZip = path.join(tempDir, 'source.zip')

  deps.log(`[ask-kilian:hydrate] hydrating Ask Kilian RAG tables into preview ${targetDeployment}`)

  try {
    await deps.run(`bunx convex export --path ${shellQuote(sourceSnapshotZip)}`, {
      env: commandEnv(env, sourceKey),
    })

    for (const table of ASK_KILIAN_APP_TABLES) {
      const extracted = await deps.extractSnapshotTable(sourceSnapshotZip, table, {
        outputDir: path.join(tempDir, 'app'),
      })
      await deps.run(`bunx convex import --replace -y --table ${table} ${shellQuote(extracted.filePath)}`, {
        env: commandEnv(env, targetKey),
      })
      deps.log(`[ask-kilian:hydrate] replaced app table ${table} (${extracted.rowCount} rows)`)
    }

    for (const table of ASK_KILIAN_RAG_TABLES) {
      const extracted = await deps.extractSnapshotTable(sourceSnapshotZip, table, {
        component: ASK_KILIAN_RAG_COMPONENT_PATH,
        outputDir: path.join(tempDir, ASK_KILIAN_RAG_COMPONENT_PATH),
      })
      await deps.run(
        `bunx convex import --replace -y --component ${ASK_KILIAN_RAG_COMPONENT_PATH} --table ${table} ${shellQuote(extracted.filePath)}`,
        {
          env: commandEnv(env, targetKey),
        },
      )
      deps.log(`[ask-kilian:hydrate] replaced RAG component table ${table} (${extracted.rowCount} rows)`)
    }
  } finally {
    await deps.rm(tempDir, { recursive: true, force: true })
  }

  return { hydrated: true as const, targetDeployment }
}

if (import.meta.main) {
  try {
    const result = await hydrateAskKilianPreviewRag()
    console.log(JSON.stringify(result, null, 2))
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}
