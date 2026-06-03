import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const convexRoot = resolve(import.meta.dirname, '..')
const srcRoot = resolve(convexRoot, '../src')

type ConvexFunctionKind = 'action' | 'internalAction' | 'internalMutation' | 'internalQuery' | 'mutation' | 'query'

function readSourceFiles(root: string): string {
  return readdirSync(root)
    .flatMap(entry => {
      const path = resolve(root, entry)
      const stat = statSync(path)
      if (stat.isDirectory()) return readSourceFiles(path)
      if (/\.(?:test|spec)\.(?:ts|tsx)$/.test(entry)) return []
      if (!/\.(?:ts|tsx)$/.test(entry)) return []
      return readFileSync(path, 'utf8')
    })
    .join('\n')
}

function readConvexExports(modulePath: string): Record<string, ConvexFunctionKind> {
  const source = readFileSync(resolve(convexRoot, modulePath), 'utf8')
  return Object.fromEntries(
    Array.from(
      source.matchAll(
        /export const (?<name>\w+) = (?<kind>action|internalAction|internalMutation|internalQuery|mutation|query)\(/g,
      ),
    )
      .map(match => [match.groups?.name, match.groups?.kind] as const)
      .filter((entry): entry is readonly [string, ConvexFunctionKind] => Boolean(entry[0]) && Boolean(entry[1])),
  )
}

describe('public game write surface', () => {
  it('does not call scoreSubmission from browser or app source', () => {
    const source = readSourceFiles(srcRoot)

    expect(source).not.toContain('api.scoreSubmission')
  })

  it('keeps sensitive game session exports internal except the public read', () => {
    expect(readConvexExports('gameSessions.ts')).toEqual({
      cleanupExpiredSessions: 'internalMutation',
      createSessionWithId: 'internalMutation',
      getSession: 'internalQuery',
      getSessionPublic: 'query',
      updateSession: 'internalMutation',
    })
  })

  it('keeps score writes internal and exposes only public reads', () => {
    expect(readConvexExports('scores.ts')).toEqual({
      addScore: 'internalMutation',
      checkQualification: 'query',
      getLeaderboard: 'query',
    })
  })

  it('keeps the public game write bridge limited to secret-gated server actions', () => {
    expect(readConvexExports('serverGameWrites.ts')).toEqual({
      addScore: 'action',
      createGameSession: 'action',
      getGameSessionForServer: 'action',
      updateGameSession: 'action',
    })
  })

  it('keeps verifyAndSubmitScore out of public actions', () => {
    const source = readFileSync(resolve(convexRoot, 'scoreSubmission.ts'), 'utf8')

    expect(source).not.toContain('import { action }')
    expect(source).toContain('internalAction')
    expect(source).toContain('export const verifyAndSubmitScore = internalAction')
  })

  it('gates the dev score seeding mutation with the game write secret', () => {
    const source = readFileSync(resolve(convexRoot, 'dev/seedScores.ts'), 'utf8')

    expect(source).toContain('writeSecret: v.string()')
    expect(source).toContain('process.env.CONVEX_GAME_WRITE_SECRET')
    expect(source).toContain('Convex game write secret is not configured')
    expect(source).toContain('Unauthorized game write')
  })
})
