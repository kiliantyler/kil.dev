import { v } from 'convex/values'
import { mutation } from '../_generated/server'

/**
 * Populate the database with 10 sample scores for preview/testing.
 * This can be run via: npx convex run dev/seedScores
 */
export const seedScores = mutation({
  args: {
    writeSecret: v.string(),
  },
  returns: v.object({
    inserted: v.number(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    const expectedSecret = process.env.CONVEX_GAME_WRITE_SECRET
    if (!expectedSecret) {
      throw new Error('Convex game write secret is not configured')
    }
    if (args.writeSecret !== expectedSecret) {
      throw new Error('Unauthorized game write')
    }

    const sampleScores = [
      { name: 'AAA', score: 1250 },
      { name: 'BBB', score: 1080 },
      { name: 'CCC', score: 950 },
      { name: 'DDD', score: 870 },
      { name: 'EEE', score: 750 },
      { name: 'FFF', score: 680 },
      { name: 'GGG', score: 590 },
      { name: 'HHH', score: 520 },
      { name: 'III', score: 450 },
      { name: 'JJJ', score: 100 },
    ]

    let inserted = 0
    for (const entry of sampleScores) {
      await ctx.db.insert('scores', {
        name: entry.name,
        score: entry.score,
      })
      inserted++
    }

    return {
      inserted,
      message: `Successfully inserted ${inserted} sample scores`,
    }
  },
})
