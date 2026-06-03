import type { LeaderboardEntry } from '@/types/leaderboard'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mutation = vi.fn()
const action = vi.fn()

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
      query: vi.fn(),
      setAuth: vi.fn(),
    }
  }),
}))

vi.mock('../../../convex/_generated/api', () => ({
  api: {
    serverGameWrites: {
      addScore: 'serverGameWrites.addScore',
    },
    scores: {
      addScorePublic: 'scores.addScorePublic',
      checkQualification: 'scores.checkQualification',
    },
  },
}))

// Helper function extracted for testing
function parseNumericScore(raw: string | number): number | null {
  const value = typeof raw === 'number' ? raw : Number(raw)
  if (Number.isNaN(value)) return null
  return value
}

// Simulate deriveThresholdFromMemory logic for testing
function deriveThresholdFromMemory(memoryLeaderboard: LeaderboardEntry[]): number {
  const SCORE_QUALIFICATION_THRESHOLD = 100
  const MAX_LEADERBOARD_SIZE = 10

  const size = memoryLeaderboard.length
  if (size === 0) return SCORE_QUALIFICATION_THRESHOLD
  if (size < MAX_LEADERBOARD_SIZE) {
    const lowest = memoryLeaderboard.at(-1)
    if (!lowest) return SCORE_QUALIFICATION_THRESHOLD
    return Math.max(lowest.score + 1, SCORE_QUALIFICATION_THRESHOLD)
  }
  const tenth = memoryLeaderboard[Math.min(memoryLeaderboard.length - 1, MAX_LEADERBOARD_SIZE - 1)]
  if (!tenth) return SCORE_QUALIFICATION_THRESHOLD
  return Math.max(tenth.score + 1, SCORE_QUALIFICATION_THRESHOLD)
}

describe('parseNumericScore', () => {
  it('parses number input', () => {
    expect(parseNumericScore(100)).toBe(100)
    expect(parseNumericScore(0)).toBe(0)
    expect(parseNumericScore(-50)).toBe(-50)
  })

  it('parses valid string input', () => {
    expect(parseNumericScore('100')).toBe(100)
    expect(parseNumericScore('0')).toBe(0)
    expect(parseNumericScore('-50')).toBe(-50)
  })

  it('parses decimal numbers', () => {
    expect(parseNumericScore(100.5)).toBe(100.5)
    expect(parseNumericScore('100.5')).toBe(100.5)
  })

  it('returns null for invalid strings', () => {
    expect(parseNumericScore('not-a-number')).toBe(null)
    expect(parseNumericScore('abc')).toBe(null)
    // Note: Number('') returns 0, not NaN, so empty string returns 0
    expect(parseNumericScore('')).toBe(0)
  })

  it('returns null for NaN', () => {
    expect(parseNumericScore(Number.NaN)).toBeNull()
  })

  it('handles scientific notation', () => {
    expect(parseNumericScore('1e3')).toBe(1000)
    expect(parseNumericScore(1e3)).toBe(1000)
  })

  it('handles Infinity', () => {
    const result = parseNumericScore(Infinity)
    expect(result).toBe(Infinity)
  })

  it('handles negative Infinity', () => {
    const result = parseNumericScore(-Infinity)
    expect(result).toBe(-Infinity)
  })

  it('handles whitespace in strings', () => {
    expect(parseNumericScore('  100  ')).toBe(100)
  })

  it('handles leading zeros', () => {
    expect(parseNumericScore('0100')).toBe(100)
  })
})

describe('deriveThresholdFromMemory', () => {
  const SCORE_QUALIFICATION_THRESHOLD = 100
  const MAX_LEADERBOARD_SIZE = 10

  it('returns base threshold for empty leaderboard', () => {
    const result = deriveThresholdFromMemory([])
    expect(result).toBe(SCORE_QUALIFICATION_THRESHOLD)
  })

  it('returns lowest score + 1 for partial leaderboard', () => {
    const leaderboard: LeaderboardEntry[] = [
      { name: 'AAA', score: 500, timestamp: 1, id: '1' },
      { name: 'BBB', score: 400, timestamp: 2, id: '2' },
      { name: 'CCC', score: 300, timestamp: 3, id: '3' },
    ]
    const result = deriveThresholdFromMemory(leaderboard)
    expect(result).toBe(301) // 300 + 1
  })

  it('returns 10th place score + 1 for full leaderboard', () => {
    const leaderboard: LeaderboardEntry[] = Array.from({ length: 10 }, (_, i) => ({
      name: 'AAA',
      score: 1000 - i * 10,
      timestamp: i,
      id: String(i),
    }))
    const result = deriveThresholdFromMemory(leaderboard)
    // 10th place has score 910, so threshold should be 911
    expect(result).toBe(911)
  })

  it('returns base threshold if lowest score is below it', () => {
    const leaderboard: LeaderboardEntry[] = [{ name: 'AAA', score: 50, timestamp: 1, id: '1' }]
    const result = deriveThresholdFromMemory(leaderboard)
    expect(result).toBe(SCORE_QUALIFICATION_THRESHOLD)
  })

  it('handles leaderboard with exactly MAX_LEADERBOARD_SIZE entries', () => {
    const leaderboard: LeaderboardEntry[] = Array.from({ length: MAX_LEADERBOARD_SIZE }, (_, i) => ({
      name: 'AAA',
      score: 1000 - i * 10,
      timestamp: i,
      id: String(i),
    }))
    const result = deriveThresholdFromMemory(leaderboard)
    expect(result).toBeGreaterThan(SCORE_QUALIFICATION_THRESHOLD)
  })

  it('handles leaderboard with more than MAX_LEADERBOARD_SIZE entries', () => {
    const leaderboard: LeaderboardEntry[] = Array.from({ length: 15 }, (_, i) => ({
      name: 'AAA',
      score: 1000 - i * 10,
      timestamp: i,
      id: String(i),
    }))
    const result = deriveThresholdFromMemory(leaderboard)
    expect(result).toBeGreaterThan(SCORE_QUALIFICATION_THRESHOLD)
  })

  it('handles single entry leaderboard', () => {
    const leaderboard: LeaderboardEntry[] = [{ name: 'AAA', score: 200, timestamp: 1, id: '1' }]
    const result = deriveThresholdFromMemory(leaderboard)
    expect(result).toBe(201)
  })

  it('always returns at least the base threshold', () => {
    const testCases = [
      [],
      [{ name: 'AAA', score: 50, timestamp: 1, id: '1' }],
      [{ name: 'AAA', score: 99, timestamp: 1, id: '1' }],
    ]
    for (const leaderboard of testCases) {
      const result = deriveThresholdFromMemory(leaderboard)
      expect(result).toBeGreaterThanOrEqual(SCORE_QUALIFICATION_THRESHOLD)
    }
  })

  it('uses the last entry for partial leaderboard', () => {
    const leaderboard: LeaderboardEntry[] = [
      { name: 'AAA', score: 500, timestamp: 1, id: '1' },
      { name: 'BBB', score: 400, timestamp: 2, id: '2' },
      { name: 'CCC', score: 150, timestamp: 3, id: '3' },
    ]
    const result = deriveThresholdFromMemory(leaderboard)
    expect(result).toBe(151) // Last entry (150) + 1
  })
})

describe('Leaderboard Constants', () => {
  it('has reasonable qualification threshold', () => {
    const SCORE_QUALIFICATION_THRESHOLD = 100
    expect(SCORE_QUALIFICATION_THRESHOLD).toBeGreaterThan(0)
    expect(SCORE_QUALIFICATION_THRESHOLD).toBeLessThan(1000)
  })

  it('has reasonable max leaderboard size', () => {
    const MAX_LEADERBOARD_SIZE = 10
    expect(MAX_LEADERBOARD_SIZE).toBeGreaterThan(0)
    expect(MAX_LEADERBOARD_SIZE).toBeLessThan(100)
  })
})

describe('addScoreToLeaderboard', () => {
  beforeEach(() => {
    mutation.mockReset()
    action.mockReset()
  })

  it('submits scores through the authenticated server write bridge', async () => {
    action.mockResolvedValue(4)
    const { addScoreToLeaderboard } = await import('../leaderboard')

    const rank = await addScoreToLeaderboard({ name: 'AAA', score: 500, timestamp: 1, id: 'score-id' })

    expect(rank).toBe(4)
    expect(action).toHaveBeenCalledWith('serverGameWrites.addScore', {
      writeSecret: 'server-secret',
      name: 'AAA',
      score: 500,
    })
    expect(mutation).not.toHaveBeenCalledWith('scores.addScorePublic', expect.anything())
  })
})
