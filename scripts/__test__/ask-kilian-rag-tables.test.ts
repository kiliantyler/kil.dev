import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'
import { ASK_KILIAN_DEFAULT_EMBEDDING_DIMENSIONS } from '../../src/lib/ask-kilian/config'
import {
  ASK_KILIAN_APP_TABLES,
  ASK_KILIAN_RAG_COMPONENT_PATH,
  ASK_KILIAN_RAG_TABLES,
  ASK_KILIAN_RAG_VECTOR_TABLES,
  classifyConvexDeployKey,
  requireDevSourceDeployKey,
  requirePreviewTargetDeployKey,
  vectorTableForDimensions,
} from '../ask-kilian-rag-tables'

const expectedRelationshipTables = ['namespaces', 'entries', 'chunks', 'content'] as const
const expectedVectorTables = [
  'vectors_128',
  'vectors_256',
  'vectors_512',
  'vectors_768',
  'vectors_1024',
  'vectors_1408',
  'vectors_1536',
  'vectors_2048',
  'vectors_3072',
  'vectors_4096',
] as const

function findConvexTypescriptFiles(dir = 'convex'): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const entryPath = path.join(dir, entry.name)
    if (entry.isDirectory()) return findConvexTypescriptFiles(entryPath)
    return entry.isFile() && entry.name.endsWith('.ts') ? [entryPath] : []
  })
}

describe('Ask Kilian RAG hydration table inventory', () => {
  it('includes the Ask Kilian app table', () => {
    expect(ASK_KILIAN_APP_TABLES).toEqual(['askKilianKnowledgeEntries'])
  })

  it('uses the dedicated RAG component path', () => {
    expect(ASK_KILIAN_RAG_COMPONENT_PATH).toBe('rag')
  })

  it('includes the RAG relationship tables and supported vector tables', () => {
    expect(ASK_KILIAN_RAG_VECTOR_TABLES).toEqual(expectedVectorTables)
    expect(ASK_KILIAN_RAG_TABLES).toEqual([...expectedRelationshipTables, ...expectedVectorTables])
  })

  it('includes the configured default embedding dimensions table', () => {
    expect(ASK_KILIAN_RAG_TABLES).toContain(vectorTableForDimensions(ASK_KILIAN_DEFAULT_EMBEDDING_DIMENSIONS))
  })

  it('does not duplicate table names', () => {
    const allTables = [...ASK_KILIAN_APP_TABLES, ...ASK_KILIAN_RAG_TABLES]

    expect(new Set(allTables).size).toBe(allTables.length)
  })

  it.each([
    ['dev:ktyler:kil-dev|dev-deploy-key', 'dev'],
    ['preview:ktyler:kil-dev|preview-deploy-key', 'preview'],
    ['prod:resolute-ptarmigan-441|prod-deploy-key', 'prod'],
    ['project:ktyler:kil-dev|project-deploy-key', 'project'],
    [undefined, 'missing'],
    ['', 'missing'],
    ['replace-with-convex-deploy-key', 'placeholder'],
    ['placeholder-convex-deploy-key', 'placeholder'],
    ['deployment-name-without-scope', 'unknown'],
  ] as const)('classifies Convex deploy key scope for %s', (key, classification) => {
    expect(classifyConvexDeployKey(key)).toBe(classification)
  })

  it('accepts only dev-scoped source deploy keys', () => {
    expect(requireDevSourceDeployKey('dev:ktyler:kil-dev|dev-deploy-key')).toBe('dev:ktyler:kil-dev|dev-deploy-key')

    for (const key of [
      'preview:ktyler:kil-dev|preview-deploy-key',
      'prod:resolute-ptarmigan-441|prod-deploy-key',
      'project:ktyler:kil-dev|project-deploy-key',
      undefined,
      'replace-with-convex-deploy-key',
      'deployment-name-without-scope',
    ]) {
      expect(() => requireDevSourceDeployKey(key)).toThrow(
        'ASK_KILIAN_RAG_SOURCE_CONVEX_DEPLOY_KEY must be a dev-scoped Convex deploy key',
      )
    }
  })

  it('accepts only preview-scoped target deploy keys', () => {
    expect(requirePreviewTargetDeployKey('preview:ktyler:kil-dev|preview-deploy-key')).toBe(
      'preview:ktyler:kil-dev|preview-deploy-key',
    )

    for (const key of [
      'dev:ktyler:kil-dev|dev-deploy-key',
      'prod:resolute-ptarmigan-441|prod-deploy-key',
      'project:ktyler:kil-dev|project-deploy-key',
      undefined,
      'replace-with-convex-deploy-key',
      'deployment-name-without-scope',
    ]) {
      expect(() => requirePreviewTargetDeployKey(key)).toThrow(
        'CONVEX_DEPLOY_KEY must be a preview-scoped Convex deploy key for preview hydration',
      )
    }
  })

  it('keeps the RAG component dedicated to Ask Kilian', () => {
    const consumers = findConvexTypescriptFiles()
      .filter(file => {
        const source = readFileSync(file, 'utf8')
        return source.includes('components.rag') || source.includes('app.use(rag)')
      })
      .toSorted()

    expect(consumers).toEqual(['convex/askKilianRag.ts', 'convex/convex.config.ts'])
  })
})
