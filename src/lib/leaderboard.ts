import { type LeaderboardEntry } from '@/types/leaderboard'
import { redis } from './redis'

// Redis key structure
export const LEADERBOARD_KEY = 'snake:leaderboard'
export const SCORE_QUALIFICATION_THRESHOLD = 100 // Minimum score to qualify
export const MAX_LEADERBOARD_SIZE = 10

export async function addScoreToLeaderboard(entry: LeaderboardEntry): Promise<number> {
  try {
    // Store the full entry data as JSON in the member field
    const entryData = JSON.stringify(entry)
    await redis.zadd(LEADERBOARD_KEY, { score: entry.score, member: entryData })

    // Remove excess entries if we have more than MAX_LEADERBOARD_SIZE
    const currentSize = await redis.zcard(LEADERBOARD_KEY)
    if (currentSize > MAX_LEADERBOARD_SIZE) {
      // Remove the lowest scores to keep only the top MAX_LEADERBOARD_SIZE
      await redis.zremrangebyrank(LEADERBOARD_KEY, 0, currentSize - MAX_LEADERBOARD_SIZE - 1)
    }

    // Get the rank (position) of this score (0-indexed, so add 1)
    const rank = await redis.zrank(LEADERBOARD_KEY, entryData)
    return rank !== null ? rank + 1 : 0
  } catch {
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

    // Safety check: if leaderboard size is 0 but we got here, something is wrong
    if (leaderboardSize === 0) {
      return SCORE_QUALIFICATION_THRESHOLD
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
    return SCORE_QUALIFICATION_THRESHOLD // Fallback to default
  }
}

// Add a final safety wrapper to ensure we never return 0
export async function getQualificationThresholdSafe(): Promise<number> {
  const threshold = await getQualificationThreshold()
  const safeThreshold = Math.max(threshold, SCORE_QUALIFICATION_THRESHOLD)
  return safeThreshold
}
