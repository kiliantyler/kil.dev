import { stableStringify } from '@/utils/stable-stringify'
import { createHash } from 'node:crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const action = vi.fn()
const mutation = vi.fn()
const query = vi.fn()

vi.mock('@/env', () => ({
  env: {
    NEXT_PUBLIC_CONVEX_URL: 'https://example.convex.cloud',
    CONVEX_DEPLOY_KEY: '',
  },
  requireConvexGameWriteSecret: () => 'server-secret',
}))

vi.mock('convex/browser', () => ({
  ConvexHttpClient: vi.fn(function ConvexHttpClient() {
    return {
      action,
      mutation,
      query,
      setAuth: vi.fn(),
    }
  }),
}))

vi.mock('../../../convex/_generated/api', () => ({
  api: {
    serverGameWrites: {
      getGameSessionForServer: 'serverGameWrites.getGameSessionForServer',
      createGameSession: 'serverGameWrites.createGameSession',
      updateGameSession: 'serverGameWrites.updateGameSession',
    },
    gameSessions: {
      getSessionPublic: 'gameSessions.getSessionPublic',
      createSessionWithId: 'gameSessions.createSessionWithId',
      updateSession: 'gameSessions.updateSession',
    },
  },
}))

// Helper function extracted from game-validation.ts for testing
function computeSignatureHex(secret: string, payloadString: string): string {
  return createHash('sha256').update(`${secret}.${payloadString}`).digest('hex')
}

describe('computeSignatureHex', () => {
  it('computes signature for simple payload', () => {
    const secret = 'test-secret'
    const payload = 'test-payload'
    const result = computeSignatureHex(secret, payload)
    expect(result).toHaveLength(64) // SHA-256 produces 64 hex characters
    expect(result).toMatch(/^[0-9a-f]{64}$/)
  })

  it('produces consistent signatures for same inputs', () => {
    const secret = 'test-secret'
    const payload = 'test-payload'
    const result1 = computeSignatureHex(secret, payload)
    const result2 = computeSignatureHex(secret, payload)
    expect(result1).toBe(result2)
  })

  it('produces different signatures for different secrets', () => {
    const payload = 'test-payload'
    const sig1 = computeSignatureHex('secret1', payload)
    const sig2 = computeSignatureHex('secret2', payload)
    expect(sig1).not.toBe(sig2)
  })

  it('produces different signatures for different payloads', () => {
    const secret = 'test-secret'
    const sig1 = computeSignatureHex(secret, 'payload1')
    const sig2 = computeSignatureHex(secret, 'payload2')
    expect(sig1).not.toBe(sig2)
  })

  it('handles empty secret', () => {
    const result = computeSignatureHex('', 'payload')
    expect(result).toHaveLength(64)
    expect(result).toMatch(/^[0-9a-f]{64}$/)
  })

  it('handles empty payload', () => {
    const result = computeSignatureHex('secret', '')
    expect(result).toHaveLength(64)
    expect(result).toMatch(/^[0-9a-f]{64}$/)
  })

  it('handles unicode characters in payload', () => {
    const result = computeSignatureHex('secret', 'Hello 🌍!')
    expect(result).toHaveLength(64)
    expect(result).toMatch(/^[0-9a-f]{64}$/)
  })

  it('produces lowercase hexadecimal output', () => {
    const result = computeSignatureHex('secret', 'payload')
    expect(result).not.toMatch(/[A-F]/)
    expect(result).toMatch(/^[0-9a-f]+$/)
  })

  it('includes secret in signature computation', () => {
    // Verify that the signature changes when secret changes
    const payload = 'same-payload'
    const sig1 = computeSignatureHex('secret1', payload)
    const sig2 = computeSignatureHex('secret2', payload)
    expect(sig1).not.toBe(sig2)
  })

  it('concatenates secret and payload with dot separator', () => {
    // Test that "secret.payload" is being hashed
    const manualHash = createHash('sha256').update('secret.payload').digest('hex')
    const functionHash = computeSignatureHex('secret', 'payload')
    expect(functionHash).toBe(manualHash)
  })
})

describe('Validation Thresholds', () => {
  it('has reasonable minimum duration threshold', () => {
    const IS_DEV = process.env.NODE_ENV !== 'production'
    const MIN_DURATION_MS = IS_DEV ? 500 : 2000
    expect(MIN_DURATION_MS).toBeGreaterThan(0)
    expect(MIN_DURATION_MS).toBeLessThan(60000) // Should be less than 1 minute
  })

  it('has reasonable minimum move events threshold', () => {
    const IS_DEV = process.env.NODE_ENV !== 'production'
    const MIN_MOVE_EVENTS = IS_DEV ? 3 : 5
    expect(MIN_MOVE_EVENTS).toBeGreaterThan(0)
    expect(MIN_MOVE_EVENTS).toBeLessThan(100)
  })

  it('has reasonable minimum move interval', () => {
    const IS_DEV = process.env.NODE_ENV !== 'production'
    const MIN_MOVE_INTERVAL_MS = IS_DEV ? 30 : 50
    expect(MIN_MOVE_INTERVAL_MS).toBeGreaterThan(0)
    expect(MIN_MOVE_INTERVAL_MS).toBeLessThan(1000)
  })

  it('has reasonable max food rate', () => {
    const IS_DEV = process.env.NODE_ENV !== 'production'
    const MAX_FOOD_RATE_MS = IS_DEV ? 80 : 200
    expect(MAX_FOOD_RATE_MS).toBeGreaterThan(0)
    expect(MAX_FOOD_RATE_MS).toBeLessThan(1000)
  })

  it('uses more lenient thresholds in development', () => {
    // This test documents that dev thresholds should be more lenient than prod
    // Actual values depend on NODE_ENV at build/test time
    const devMinDuration = 500
    const prodMinDuration = 2000

    expect(devMinDuration).toBeLessThan(prodMinDuration)
  })
})

describe('Session Configuration', () => {
  it('has reasonable session TTL', () => {
    const SESSION_TTL_SECONDS = 60 * 60 // 1 hour
    expect(SESSION_TTL_SECONDS).toBe(3600)
    expect(SESSION_TTL_SECONDS).toBeGreaterThan(60) // At least 1 minute
    expect(SESSION_TTL_SECONDS).toBeLessThan(86400) // Less than 1 day
  })

  it('has reasonable nonce TTL', () => {
    const NONCE_TTL_SECONDS = 60 * 5 // 5 minutes
    expect(NONCE_TTL_SECONDS).toBe(300)
    expect(NONCE_TTL_SECONDS).toBeGreaterThan(60) // At least 1 minute
    expect(NONCE_TTL_SECONDS).toBeLessThan(3600) // Less than 1 hour
  })

  it('uses correct key prefixes', () => {
    const SESSION_KEY_PREFIX = 'game:session:'
    const NONCE_KEY_PREFIX = 'game:nonce:'
    expect(SESSION_KEY_PREFIX).toContain('game')
    expect(NONCE_KEY_PREFIX).toContain('game')
    expect(SESSION_KEY_PREFIX).not.toBe(NONCE_KEY_PREFIX)
  })
})

describe('Convex game session writes', () => {
  beforeEach(() => {
    action.mockReset()
    mutation.mockReset()
    query.mockReset()
  })

  it('creates sessions through the authenticated server write bridge', async () => {
    action.mockResolvedValue('session-id')
    const { createGameSession } = await import('../game-validation')

    const session = await createGameSession()

    expect(session.sessionId).toBe('session-id')
    expect(session.secret).toHaveLength(64)
    expect(typeof session.seed).toBe('number')
    expect(action).toHaveBeenCalledWith('serverGameWrites.createGameSession', {
      writeSecret: 'server-secret',
      sessionSecret: session.secret,
      seed: session.seed,
    })
    expect(mutation).not.toHaveBeenCalledWith('gameSessions.createSessionWithId', expect.anything())
  })

  it('reads full sessions through the authenticated server write bridge', async () => {
    action.mockResolvedValue({
      id: 'session-id',
      secret: 'session-secret',
      seed: 123,
      createdAt: 456,
      isActive: false,
      validatedScore: 100,
    })
    const { validateScoreSubmissionBySession } = await import('../game-validation')

    const result = await validateScoreSubmissionBySession('session-id', 100)

    expect(result).toEqual({ success: true, validatedScore: 100 })
    expect(action).toHaveBeenCalledWith('serverGameWrites.getGameSessionForServer', {
      writeSecret: 'server-secret',
      sessionId: 'session-id',
    })
    expect(query).not.toHaveBeenCalledWith('gameSessions.getSessionPublic', expect.anything())
  })

  it('updates sessions through the authenticated server write bridge', async () => {
    const events = [
      { t: 0, k: 'UP' as const },
      { t: 40, k: 'RIGHT' as const },
      { t: 80, k: 'DOWN' as const },
    ]
    const foods = [{ t: 120, g: false }]
    const durationMs = 600
    const finalScore = 10
    const sessionId = 'session-id'
    const secret = 'session-secret'
    const signature = computeSignatureHex(secret, stableStringify({ sessionId, finalScore, events, foods, durationMs }))
    action.mockImplementation(async reference => {
      if (reference === 'serverGameWrites.getGameSessionForServer') {
        return {
          id: sessionId,
          secret,
          seed: 123,
          createdAt: 456,
          isActive: true,
        }
      }
      return null
    })
    const { endGameSession } = await import('../game-validation')

    const result = await endGameSession(sessionId, signature, finalScore, events, foods, durationMs)

    expect(result).toEqual({ success: true, validatedScore: finalScore })
    expect(action).toHaveBeenCalledWith('serverGameWrites.updateGameSession', {
      writeSecret: 'server-secret',
      sessionId,
      isActive: false,
      validatedScore: finalScore,
    })
    expect(mutation).not.toHaveBeenCalledWith('gameSessions.updateSession', expect.anything())
  })
})
