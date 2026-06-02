import { beforeEach, describe, expect, it, vi } from 'vitest'

import { endGameSession } from '@/lib/game-validation'
import { POST } from './route'

vi.mock('@/lib/game-validation', () => ({
  endGameSession: vi.fn(),
}))

const mockedEndGameSession = vi.mocked(endGameSession)

const validBody = {
  sessionId: 'session-123',
  signature: 'signature-123',
  finalScore: 60,
  events: [
    { t: 100, k: 'UP' },
    { t: 200, k: 'RIGHT' },
  ],
  foods: [
    { t: 150, g: false },
    { t: 250, g: true },
  ],
  durationMs: 1000,
}

function endGame(body: unknown) {
  return POST(
    new Request('http://localhost/api/game/end', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    }) as never,
  )
}

describe('POST /api/game/end', () => {
  beforeEach(() => {
    mockedEndGameSession.mockReset()
    mockedEndGameSession.mockResolvedValue({ success: true, validatedScore: 60 })
  })

  it('ends a valid game session', async () => {
    const response = await endGame(validBody)

    expect(response.status).toBe(200)
    expect(mockedEndGameSession).toHaveBeenCalledWith(
      'session-123',
      'signature-123',
      60,
      validBody.events,
      validBody.foods,
      1000,
    )
    await expect(response.json()).resolves.toEqual({
      success: true,
      validatedScore: 60,
      message: 'Game session ended and score validated',
    })
  })

  it('rejects malformed request bodies before validation', async () => {
    const response = await endGame({ sessionId: '', signature: '', finalScore: 'nope' })

    expect(response.status).toBe(400)
    expect(mockedEndGameSession).not.toHaveBeenCalled()
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      message: 'Invalid request body',
    })
  })

  it('returns helper validation failures', async () => {
    mockedEndGameSession.mockResolvedValue({ success: false, message: 'Invalid signature' })

    const response = await endGame(validBody)

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: 'Invalid signature',
    })
  })
})
