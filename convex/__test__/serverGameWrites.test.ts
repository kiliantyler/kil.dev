import { beforeEach, describe, expect, it, vi } from 'vitest'
import { internal } from '../_generated/api'
import { addScore, assertValidGameWriteSecret, createGameSession, updateGameSession } from '../serverGameWrites'

type ActionForTest = {
  _handler: (ctx: unknown, args: Record<string, unknown>) => Promise<unknown>
}

const getActionHandler = (action: unknown) => (action as ActionForTest)._handler

describe('assertValidGameWriteSecret', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
  })

  it('accepts the configured write secret', () => {
    vi.stubEnv('CONVEX_GAME_WRITE_SECRET', 'server-secret')
    expect(() => assertValidGameWriteSecret('server-secret')).not.toThrow()
  })

  it('rejects a missing deployment secret', () => {
    vi.stubEnv('CONVEX_GAME_WRITE_SECRET', '')
    expect(() => assertValidGameWriteSecret('server-secret')).toThrow('Convex game write secret is not configured')
  })

  it('rejects a mismatched caller secret', () => {
    vi.stubEnv('CONVEX_GAME_WRITE_SECRET', 'server-secret')
    expect(() => assertValidGameWriteSecret('wrong-secret')).toThrow('Unauthorized game write')
  })
})

describe('server game write actions', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    vi.stubEnv('CONVEX_GAME_WRITE_SECRET', 'server-secret')
  })

  it('createGameSession delegates to runMutation after auth', async () => {
    const runMutation = vi.fn().mockResolvedValue('session-id')
    const result = await getActionHandler(createGameSession)(
      { runMutation },
      { writeSecret: 'server-secret', sessionSecret: 'session-secret', seed: 123 },
    )

    expect(result).toBe('session-id')
    expect(runMutation).toHaveBeenCalledWith(internal.gameSessions.createSessionWithId, {
      secret: 'session-secret',
      seed: 123,
    })
  })

  it('updateGameSession delegates to runMutation after auth', async () => {
    const runMutation = vi.fn().mockResolvedValue(null)
    const result = await getActionHandler(updateGameSession)(
      { runMutation },
      { writeSecret: 'server-secret', sessionId: 'session-id', isActive: false, validatedScore: 456 },
    )

    expect(result).toBeNull()
    expect(runMutation).toHaveBeenCalledWith(internal.gameSessions.updateSession, {
      sessionId: 'session-id',
      isActive: false,
      validatedScore: 456,
    })
  })

  it('addScore delegates to runMutation after auth', async () => {
    const runMutation = vi.fn().mockResolvedValue(3)
    const result = await getActionHandler(addScore)(
      { runMutation },
      { writeSecret: 'server-secret', name: 'AAA', score: 789 },
    )

    expect(result).toBe(3)
    expect(runMutation).toHaveBeenCalledWith(internal.scores.addScore, {
      name: 'AAA',
      score: 789,
    })
  })
})
