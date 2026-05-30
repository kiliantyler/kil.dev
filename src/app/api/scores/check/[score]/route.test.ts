import { beforeEach, describe, expect, it, vi } from 'vitest'

import { checkScoreQualification } from '@/lib/leaderboard'
import { GET } from './route'

vi.mock('@/lib/leaderboard', () => ({
  checkScoreQualification: vi.fn(),
}))

const mockedCheckScoreQualification = vi.mocked(checkScoreQualification)

function checkScore(score?: string) {
  return GET(new Request('http://localhost/api/scores/check'), {
    params: Promise.resolve({ score }),
  })
}

describe('GET /api/scores/check/[score]', () => {
  beforeEach(() => {
    mockedCheckScoreQualification.mockReset()
    mockedCheckScoreQualification.mockResolvedValue({ qualifies: true, threshold: 100 })
  })

  it.each(['123abc', '1.5', '-1', '', 'abc'])('rejects malformed score param %s', async score => {
    const response = await checkScore(score)

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({ success: false })
    expect(mockedCheckScoreQualification).not.toHaveBeenCalled()
  })

  it('accepts strict non-negative integer score params', async () => {
    const response = await checkScore('123')

    expect(response.status).toBe(200)
    expect(mockedCheckScoreQualification).toHaveBeenCalledWith(123)
  })
})
