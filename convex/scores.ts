import { v } from 'convex/values'
import { internalMutation, mutation, query, type DatabaseReader } from './_generated/server'

const MAX_LEADERBOARD_SIZE = 10
const SCORE_QUALIFICATION_THRESHOLD = 100

export function sortScoresForLeaderboard<T extends { score: number; _creationTime: number }>(scores: T[]): T[] {
  const sorted = [...scores]
  // eslint-disable-next-line unicorn/no-array-sort
  return sorted.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return a._creationTime - b._creationTime
  })
}

const fetchSortedScores = async (db: DatabaseReader) => {
  const allScores = await db.query('scores').withIndex('by_score').order('desc').collect()
  return sortScoresForLeaderboard(allScores)
}

// Internal version for use in actions
export const addScore = internalMutation({
  args: {
    name: v.string(),
    score: v.number(),
  },
  returns: v.union(v.number(), v.null()),
  handler: async (ctx, args) => {
    // Insert the score (Convex will automatically add _creationTime)
    const id = await ctx.db.insert('scores', {
      name: args.name,
      score: args.score,
    })

    const allScores = await fetchSortedScores(ctx.db)

    // Find the rank of this score (1-indexed)
    const rankIndex = allScores.findIndex(s => s._id === id)
    const rank = rankIndex === -1 ? null : rankIndex + 1

    // Return rank if in top 10, null otherwise
    return rank !== null && rank <= MAX_LEADERBOARD_SIZE ? rank : null
  },
})

// Public wrapper for backward compatibility (used by API routes)
export const addScorePublic = mutation({
  args: {
    name: v.string(),
    score: v.number(),
  },
  returns: v.union(v.number(), v.null()),
  handler: async (ctx, args) => {
    // Insert the score (Convex will automatically add _creationTime)
    const id = await ctx.db.insert('scores', {
      name: args.name,
      score: args.score,
    })

    const allScores = await fetchSortedScores(ctx.db)

    // Find the rank of this score (1-indexed)
    const rankIndex = allScores.findIndex(s => s._id === id)
    const rank = rankIndex === -1 ? null : rankIndex + 1

    // Return rank if in top 10, null otherwise
    return rank !== null && rank <= MAX_LEADERBOARD_SIZE ? rank : null
  },
})

export const getLeaderboard = query({
  args: {},
  returns: v.array(
    v.object({
      id: v.string(),
      name: v.string(),
      score: v.number(),
      timestamp: v.number(),
    }),
  ),
  handler: async ctx => {
    const allScores = await fetchSortedScores(ctx.db)

    // Return top 10 with id as string and _creationTime as timestamp for API compatibility
    return allScores.slice(0, MAX_LEADERBOARD_SIZE).map(score => ({
      id: score._id.toString(),
      name: score.name,
      score: score.score,
      timestamp: score._creationTime,
    }))
  },
})

export const checkQualification = query({
  args: {
    score: v.number(),
  },
  returns: v.object({
    qualifies: v.boolean(),
    threshold: v.number(),
  }),
  handler: async (ctx, args) => {
    const allScores = await fetchSortedScores(ctx.db)

    // If less than 10 scores, check against minimum threshold
    if (allScores.length < MAX_LEADERBOARD_SIZE) {
      if (allScores.length === 0) {
        return {
          qualifies: args.score >= SCORE_QUALIFICATION_THRESHOLD,
          threshold: SCORE_QUALIFICATION_THRESHOLD,
        }
      }
      const lowestScore = allScores.at(-1)?.score ?? 0
      const threshold = Math.max(lowestScore + 1, SCORE_QUALIFICATION_THRESHOLD)
      // Qualify if score meets minimum threshold OR beats the lowest score
      return {
        qualifies: args.score >= SCORE_QUALIFICATION_THRESHOLD || args.score > lowestScore,
        threshold,
      }
    }

    // Get the 10th highest score
    const tenthScore = allScores.at(MAX_LEADERBOARD_SIZE - 1)?.score

    if (tenthScore === undefined) {
      return {
        qualifies: args.score >= SCORE_QUALIFICATION_THRESHOLD,
        threshold: SCORE_QUALIFICATION_THRESHOLD,
      }
    }

    // Score must be strictly greater than 10th score
    const threshold = Math.max(tenthScore + 1, SCORE_QUALIFICATION_THRESHOLD)
    return {
      qualifies: args.score > tenthScore,
      threshold,
    }
  },
})
