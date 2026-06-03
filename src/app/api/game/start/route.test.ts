import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createGameSession } from '@/lib/game-validation'
import { POST } from './route'

vi.mock('@/lib/game-validation', () => ({
  createGameSession: vi.fn(),
}))

const mockedCreateGameSession = vi.mocked(createGameSession)

function startGame() {
  return POST(new Request('http://localhost/api/game/start', { method: 'POST' }) as never)
}

describe('POST /api/game/start', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    mockedCreateGameSession.mockReset()
    mockedCreateGameSession.mockResolvedValue({
      sessionId: 'session-123',
      secret: 'secret-123',
      seed: 12345,
    })
  })

  it('starts a game session', async () => {
    const response = await startGame()

    expect(response.status).toBe(200)
    expect(mockedCreateGameSession).toHaveBeenCalledTimes(1)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    await expect(response.json()).resolves.toEqual({
      success: true,
      sessionId: 'session-123',
      secret: 'secret-123',
      seed: 12345,
      message: 'Game session started',
    })
  })

  it('returns a server error when session creation fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mockedCreateGameSession.mockRejectedValue(new Error('Convex unavailable'))

    const response = await startGame()

    expect(response.status).toBe(500)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: 'Failed to start game session',
    })
  })
})
