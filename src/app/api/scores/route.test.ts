import { beforeEach, describe, expect, it, vi } from 'vitest'

import { validateScoreSubmissionBySession, verifySignedScoreSubmission } from '@/lib/game-validation'
import { addScoreToLeaderboard } from '@/lib/leaderboard'
import { POST } from './route'

vi.mock('@/env', () => ({
  env: {
    NODE_ENV: 'test',
  },
}))

vi.mock('@/lib/game-validation', () => ({
  validateScoreSubmissionBySession: vi.fn(),
  verifySignedScoreSubmission: vi.fn(),
}))

vi.mock('@/lib/leaderboard', () => ({
  addScoreToLeaderboard: vi.fn(),
}))

const mockedValidateScoreSubmissionBySession = vi.mocked(validateScoreSubmissionBySession)
const mockedVerifySignedScoreSubmission = vi.mocked(verifySignedScoreSubmission)
const mockedAddScoreToLeaderboard = vi.mocked(addScoreToLeaderboard)

const validBody = {
  name: 'AB',
  score: 42,
  sessionId: 'session-123',
  timestamp: 1_717_171_717_000,
  signature: 'a'.repeat(64),
}

function submitScore(body: unknown) {
  return POST(
    new Request('http://localhost/api/scores', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    }) as never,
  )
}

describe('POST /api/scores', () => {
  beforeEach(() => {
    mockedValidateScoreSubmissionBySession.mockReset()
    mockedVerifySignedScoreSubmission.mockReset()
    mockedAddScoreToLeaderboard.mockReset()

    mockedVerifySignedScoreSubmission.mockResolvedValue({ success: true })
    mockedValidateScoreSubmissionBySession.mockResolvedValue({ success: true, validatedScore: 60 })
    mockedAddScoreToLeaderboard.mockResolvedValue(3)
  })

  it('submits a valid signed session-backed score with sanitized name and validated score', async () => {
    const response = await submitScore(validBody)

    expect(response.status).toBe(201)
    expect(mockedVerifySignedScoreSubmission).toHaveBeenCalledWith({
      sessionId: 'session-123',
      name: 'AB',
      score: 42,
      timestamp: 1_717_171_717_000,
      signature: 'a'.repeat(64),
    })
    expect(mockedValidateScoreSubmissionBySession).toHaveBeenCalledWith('session-123', 42)
    expect(mockedAddScoreToLeaderboard).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'ABA',
        score: 60,
      }),
    )
    await expect(response.json()).resolves.toEqual({
      success: true,
      position: 3,
      message: "Score submitted! You're ranked #3",
    })
  })

  it('rejects score submissions without session data before insertion', async () => {
    const response = await submitScore({ name: 'AB', score: 42 })

    expect(response.status).toBe(400)
    expect(mockedVerifySignedScoreSubmission).not.toHaveBeenCalled()
    expect(mockedValidateScoreSubmissionBySession).not.toHaveBeenCalled()
    expect(mockedAddScoreToLeaderboard).not.toHaveBeenCalled()
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: 'Missing session data. Score submissions must be validated.',
    })
  })

  it('rejects score submissions with invalid signatures before insertion', async () => {
    mockedVerifySignedScoreSubmission.mockResolvedValue({ success: false, message: 'Invalid signature' })

    const response = await submitScore(validBody)

    expect(response.status).toBe(400)
    expect(mockedValidateScoreSubmissionBySession).not.toHaveBeenCalled()
    expect(mockedAddScoreToLeaderboard).not.toHaveBeenCalled()
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: 'Signature verification failed',
    })
  })

  it('rejects score mismatches before insertion', async () => {
    mockedValidateScoreSubmissionBySession.mockResolvedValue({
      success: false,
      message: 'Submitted score does not match validated score',
    })

    const response = await submitScore(validBody)

    expect(response.status).toBe(400)
    expect(mockedAddScoreToLeaderboard).not.toHaveBeenCalled()
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: 'Score validation failed',
      details: 'Submitted score does not match validated score',
    })
  })
})
