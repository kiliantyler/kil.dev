import { v } from 'convex/values'
import { internalMutation, internalQuery, query } from './_generated/server'

const SESSION_TTL_MS = 60 * 60 * 1000 // 1 hour

export const createSessionWithId = internalMutation({
  args: {
    secret: v.string(),
    seed: v.number(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const now = Date.now()
    const sessionId = await ctx.db.insert('gameSessions', {
      secret: args.secret,
      seed: args.seed,
      createdAt: now,
      expiresAt: now + SESSION_TTL_MS,
      isActive: true,
    })
    return sessionId.toString()
  },
})

// Internal version for use in actions
export const getSession = internalQuery({
  args: {
    sessionId: v.id('gameSessions'),
  },
  returns: v.union(
    v.object({
      id: v.string(),
      secret: v.string(),
      seed: v.number(),
      createdAt: v.number(),
      isActive: v.boolean(),
      validatedScore: v.optional(v.number()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId)
    if (!session) return null

    // Check if session is expired
    if (Date.now() > session.expiresAt) {
      return null
    }

    return {
      id: session._id.toString(),
      secret: session.secret,
      seed: session.seed,
      createdAt: session.createdAt,
      isActive: session.isActive,
      validatedScore: session.validatedScore,
    }
  },
})

export const getSessionPublic = query({
  args: {
    sessionId: v.id('gameSessions'),
  },
  returns: v.union(
    v.object({
      id: v.string(),
      seed: v.number(),
      createdAt: v.number(),
      isActive: v.boolean(),
      validatedScore: v.optional(v.number()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId)
    if (!session) return null

    // Check if session is expired
    if (Date.now() > session.expiresAt) {
      return null
    }

    return {
      id: session._id.toString(),
      seed: session.seed,
      createdAt: session.createdAt,
      isActive: session.isActive,
      validatedScore: session.validatedScore,
    }
  },
})

export const updateSession = internalMutation({
  args: {
    sessionId: v.id('gameSessions'),
    isActive: v.boolean(),
    validatedScore: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId)
    if (!session) {
      throw new Error('Session not found')
    }

    // Check if session is expired
    if (Date.now() > session.expiresAt) {
      throw new Error('Session expired')
    }

    await ctx.db.patch(args.sessionId, {
      isActive: args.isActive,
      validatedScore: args.validatedScore,
    })
    return null
  },
})

// Scheduled function to clean up expired sessions
// Run this periodically (e.g., every hour) via Convex dashboard or CLI
export const cleanupExpiredSessions = internalMutation({
  args: {},
  returns: v.object({
    deleted: v.number(),
  }),
  handler: async ctx => {
    const now = Date.now()
    const expiredSessions = await ctx.db
      .query('gameSessions')
      .withIndex('by_expiresAt')
      .filter(q => q.lt(q.field('expiresAt'), now))
      .collect()

    for (const session of expiredSessions) {
      await ctx.db.delete(session._id)
    }

    return { deleted: expiredSessions.length }
  },
})
