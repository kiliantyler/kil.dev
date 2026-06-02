import { env, requireConvexGameWriteSecret } from '@/env'
import type { LeaderboardEntry } from '@/types/leaderboard'
import { ConvexHttpClient } from 'convex/browser'

const SCORE_QUALIFICATION_THRESHOLD = 100

// Create Convex client for server-side usage
let convexClient: ConvexHttpClient | null = null

function getConvexClient(): ConvexHttpClient {
  if (!convexClient) {
    if (!env.NEXT_PUBLIC_CONVEX_URL) {
      throw new Error('NEXT_PUBLIC_CONVEX_URL is not set')
    }
    convexClient = new ConvexHttpClient(env.NEXT_PUBLIC_CONVEX_URL)
    if (env.CONVEX_DEPLOY_KEY) {
      convexClient.setAuth(env.CONVEX_DEPLOY_KEY)
    }
  }
  return convexClient
}

export async function addScoreToLeaderboard(entry: LeaderboardEntry): Promise<number> {
  try {
    const client = getConvexClient()
    // Dynamically import to avoid issues before Convex types are generated
    const apiModule = await import('../../convex/_generated/api')
    const api = apiModule.api
    console.log('Adding score to Convex:', { name: entry.name, score: entry.score })
    const rank = await client.action(api.serverGameWrites.addScore, {
      writeSecret: requireConvexGameWriteSecret(),
      name: entry.name,
      score: entry.score,
    })
    console.log('Score added, rank:', rank)
    // Return rank if it's a number, otherwise 0 (not in top 10)
    return typeof rank === 'number' ? rank : 0
  } catch (error) {
    console.error('Failed to add score to leaderboard:', error)
    if (error instanceof Error) {
      console.error('Error details:', error.message, error.stack)
    }
    throw new Error('Failed to add score to leaderboard')
  }
}

// Helper function for checking qualification with a specific score
export async function checkScoreQualification(score: number): Promise<{ qualifies: boolean; threshold: number }> {
  try {
    const client = getConvexClient()
    const apiModule = await import('../../convex/_generated/api')
    const api = apiModule.api
    const result = (await client.query(api.scores.checkQualification, { score })) as {
      qualifies: boolean
      threshold: number
    }
    return result
  } catch (error) {
    console.error('Failed to check score qualification:', error)
    return {
      qualifies: false,
      threshold: SCORE_QUALIFICATION_THRESHOLD,
    }
  }
}
