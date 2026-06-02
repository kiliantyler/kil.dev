import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const hookSource = readFileSync(resolve(import.meta.dirname, 'use-leaderboard.ts'), 'utf8')

describe('useLeaderboard score submission path', () => {
  it('submits scores through the scores API route', () => {
    expect(hookSource).toContain("fetch('/api/scores'")
    expect(hookSource).toContain("method: 'POST'")
    expect(hookSource).toContain("'Content-Type': 'application/json'")
    expect(hookSource).toContain('JSON.stringify({')
    expect(hookSource).toContain('sessionId,')
    expect(hookSource).toContain('timestamp,')
    expect(hookSource).toContain('signature,')
  })

  it('does not use a direct Convex score submission action', () => {
    expect(hookSource).not.toContain('useAction')
    expect(hookSource).not.toContain('api.scoreSubmission.verifyAndSubmitScore')
  })
})
