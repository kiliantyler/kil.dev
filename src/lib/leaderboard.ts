import { env } from '@/env'
import { type LeaderboardEntry } from '@/types/leaderboard'
import { stableStringify } from '@/utils/stable-stringify'
import { isDev } from '@/utils/utils'
import { redis } from './redis'

type RedisPipelineResult<T> = [Error | null, T]

// Redis key structure
export const LEADERBOARD_KEY = 'snake:leaderboard'
export const SCORE_QUALIFICATION_THRESHOLD = 100 // Minimum score to qualify
export const MAX_LEADERBOARD_SIZE = 10

// In-memory fallback for development/local if Redis is unavailable
const memoryLeaderboard: LeaderboardEntry[] = []

function addScoreToMemory(entry: LeaderboardEntry): number {
  memoryLeaderboard.push(entry)
  memoryLeaderboard.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return a.timestamp - b.timestamp
  })
  if (memoryLeaderboard.length > MAX_LEADERBOARD_SIZE) {
    memoryLeaderboard.splice(MAX_LEADERBOARD_SIZE)
  }
  const rank = memoryLeaderboard.findIndex(e => e.id === entry.id)
  return rank >= 0 ? rank + 1 : 0
}

function getLeaderboardFromMemory(): LeaderboardEntry[] {
  return [...memoryLeaderboard]
}

export async function addScoreToLeaderboard(entry: LeaderboardEntry): Promise<number> {
  try {
    // Store the full entry data as JSON in the member field
    const entryData = stableStringify(entry)

    // Use Redis pipeline to atomically execute zadd, zcard, and zrevrank
    const pipeline = redis.pipeline()
    pipeline.zadd(LEADERBOARD_KEY, { score: entry.score, member: entryData })
    pipeline.zcard(LEADERBOARD_KEY)
    pipeline.zrevrank(LEADERBOARD_KEY, entryData)

    // Execute the pipeline and get the results
    const results = await pipeline.exec()

    // Unpack and validate pipeline results: each item is [error, value]
    if (!Array.isArray(results) || results.length < 3) {
      throw new Error('Unexpected Redis pipeline results shape')
    }

    const [zaddErr] = results[0] as RedisPipelineResult<number | string>
    if (zaddErr) {
      console.error('Redis pipeline zadd error:', zaddErr)
      throw new Error('Failed to add score to leaderboard (zadd)')
    }

    const [zcardErr, zcardResult] = results[1] as RedisPipelineResult<number | string>
    if (zcardErr) {
      console.error('Redis pipeline zcard error:', zcardErr)
      throw new Error('Failed to read leaderboard size (zcard)')
    }

    const [zrevrankErr, zrevrankResult] = results[2] as RedisPipelineResult<number | null>
    if (zrevrankErr) {
      console.error('Redis pipeline zrevrank error:', zrevrankErr)
      throw new Error('Failed to read leaderboard rank (zrevrank)')
    }

    const currentSize = Number(zcardResult)
    const rank = zrevrankResult !== null ? Number(zrevrankResult) : null

    // Remove excess entries if we have more than MAX_LEADERBOARD_SIZE
    if (currentSize > MAX_LEADERBOARD_SIZE) {
      // Remove the lowest scores to keep only the top MAX_LEADERBOARD_SIZE
      await redis.zremrangebyrank(LEADERBOARD_KEY, 0, currentSize - MAX_LEADERBOARD_SIZE - 1)
    }

    // Return rank (0-indexed, so add 1) or 0 if rank is null
    return rank !== null ? rank + 1 : 0
  } catch {
    // Fallback to in-memory leaderboard in non-production
    if (isDev()) {
      return addScoreToMemory(entry)
    }
    throw new Error('Failed to add score to leaderboard')
  }
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  try {
    // Get top scores from Redis sorted set
    const scores = await redis.zrange(LEADERBOARD_KEY, 0, MAX_LEADERBOARD_SIZE - 1, { withScores: true, rev: true })

    const leaderboard: LeaderboardEntry[] = []

    // Handle the response format from Upstash Redis
    if (Array.isArray(scores)) {
      for (let i = 0; i < scores.length; i += 2) {
        const entryData = scores[i] as string

        try {
          // Check if entryData is already an object (not a string)
          if (typeof entryData === 'object') {
            leaderboard.push(entryData as LeaderboardEntry)
          } else {
            const entry = JSON.parse(entryData) as LeaderboardEntry
            leaderboard.push(entry)
          }
        } catch {
          // Skip invalid entries
        }
      }
    }

    return leaderboard
  } catch {
    // Fallback to in-memory leaderboard in non-production
    if (isDev()) return getLeaderboardFromMemory()
    return [] // Return empty array on error
  }
}

export async function getQualificationThreshold(): Promise<number> {
  try {
    // Get the current leaderboard size
    const leaderboardSize = await redis.zcard(LEADERBOARD_KEY)

    if (leaderboardSize === 0) {
      return SCORE_QUALIFICATION_THRESHOLD // Default threshold if leaderboard is empty
    }

    // If we have fewer than 10 entries, use the lowest score + 1 as threshold
    if (leaderboardSize < MAX_LEADERBOARD_SIZE) {
      const scores = await redis.zrange(LEADERBOARD_KEY, 0, 0, { withScores: true, rev: false })
      if (scores.length >= 2) {
        const lowestScore = scores[1] as number
        const threshold = lowestScore + 1 // Must beat the lowest score, not just tie it
        // Ensure threshold is never 0 or negative
        return Math.max(threshold, SCORE_QUALIFICATION_THRESHOLD)
      }
    }

    // If we have 10 or more entries, get the 10th highest score + 1
    const scores = await redis.zrange(LEADERBOARD_KEY, MAX_LEADERBOARD_SIZE - 1, MAX_LEADERBOARD_SIZE - 1, {
      withScores: true,
      rev: true,
    })

    if (scores.length < 2) {
      return SCORE_QUALIFICATION_THRESHOLD
    }

    const tenthHighestScore = scores[1] as number
    const threshold = tenthHighestScore + 1 // Must beat the 10th highest score, not just tie it
    // Ensure threshold is never 0 or negative
    return Math.max(threshold, SCORE_QUALIFICATION_THRESHOLD)
  } catch {
    // Fallback: derive threshold from in-memory leaderboard when available
    if (env.NODE_ENV !== 'production') {
      const size = memoryLeaderboard.length
      if (size === 0) return SCORE_QUALIFICATION_THRESHOLD
      if (size < MAX_LEADERBOARD_SIZE) {
        const lowest = memoryLeaderboard[memoryLeaderboard.length - 1]
        if (lowest) return Math.max(lowest.score + 1, SCORE_QUALIFICATION_THRESHOLD)
        return SCORE_QUALIFICATION_THRESHOLD
      }
      const tenth = memoryLeaderboard[Math.min(memoryLeaderboard.length - 1, MAX_LEADERBOARD_SIZE - 1)]
      if (tenth) return Math.max(tenth.score + 1, SCORE_QUALIFICATION_THRESHOLD)
      return SCORE_QUALIFICATION_THRESHOLD
    }
    return SCORE_QUALIFICATION_THRESHOLD // Fallback to default
  }
}

// Add a final safety wrapper to ensure we never return 0
export async function getQualificationThresholdSafe(): Promise<number> {
  const threshold = await getQualificationThreshold()
  const safeThreshold = Math.max(threshold, SCORE_QUALIFICATION_THRESHOLD)
  return safeThreshold
}
