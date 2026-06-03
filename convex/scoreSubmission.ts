'use node'

import { v } from 'convex/values'
import { createHash } from 'node:crypto'
import { internal } from './_generated/api'
import { internalAction } from './_generated/server'
import { stableStringify } from './_utils'

type Result = { success: true; position: number } | { success: false; message: string }

/**
 * Verify signature and submit score atomically.
 * This action handles server-side signature verification and score submission.
 */
export const verifyAndSubmitScore = internalAction({
  args: {
    sessionId: v.id('gameSessions'),
    name: v.string(),
    score: v.number(),
    timestamp: v.number(),
    signature: v.string(),
  },
  returns: v.union(
    v.object({
      success: v.literal(true),
      position: v.number(),
    }),
    v.object({
      success: v.literal(false),
      message: v.string(),
    }),
  ),
  handler: async (ctx, args): Promise<Result> => {
    const maxSkewMs = 2 * 60 * 1000 // 2 minutes

    // Get session to verify signature
    const session = await ctx.runQuery(internal.gameSessions.getSession, {
      sessionId: args.sessionId,
    })

    if (!session) {
      return { success: false, message: 'Invalid game session' }
    }

    if (session.isActive) {
      return { success: false, message: 'Game session is still active' }
    }

    if (session.validatedScore !== args.score) {
      return { success: false, message: 'Submitted score does not match validated score' }
    }

    // Reject stale or future timestamps
    const now = Date.now()
    if (Math.abs(now - args.timestamp) > maxSkewMs) {
      return { success: false, message: 'Stale or invalid timestamp' }
    }

    // Verify signature over stable payload
    const payloadString = stableStringify({
      sessionId: args.sessionId.toString(),
      name: args.name,
      score: args.score,
      timestamp: args.timestamp,
    })
    const expected = createHash('sha256').update(`${session.secret}.${payloadString}`).digest('hex')
    if (expected !== args.signature) {
      return { success: false, message: 'Invalid signature' }
    }

    // Sanitize name (3 uppercase letters)
    const sanitizedName = args.name
      .toUpperCase()
      .replaceAll(/[^A-Z]/g, '')
      .slice(0, 3)
      .padEnd(3, 'A')

    // Submit score and get position
    const positionResult = await ctx.runMutation(internal.scores.addScore, {
      name: sanitizedName,
      score: args.score,
    })

    const position: number = typeof positionResult === 'number' ? positionResult : 0

    return {
      success: true,
      position,
    }
  },
})
