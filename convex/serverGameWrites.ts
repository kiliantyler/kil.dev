'use node'

import { v } from 'convex/values'
import { internal } from './_generated/api'
import { action } from './_generated/server'

const sessionForServerValidator = v.union(
  v.object({
    id: v.string(),
    secret: v.string(),
    seed: v.number(),
    createdAt: v.number(),
    isActive: v.boolean(),
    validatedScore: v.optional(v.number()),
  }),
  v.null(),
)

type ServerGameSession = {
  id: string
  secret: string
  seed: number
  createdAt: number
  isActive: boolean
  validatedScore?: number
}

export function assertValidGameWriteSecret(writeSecret: string): void {
  const configuredSecret = process.env.CONVEX_GAME_WRITE_SECRET
  if (!configuredSecret) {
    throw new Error('Convex game write secret is not configured')
  }
  if (writeSecret !== configuredSecret) {
    throw new Error('Unauthorized game write')
  }
}

export const getGameSessionForServer = action({
  args: {
    writeSecret: v.string(),
    sessionId: v.id('gameSessions'),
  },
  returns: sessionForServerValidator,
  handler: async (ctx, args): Promise<ServerGameSession | null> => {
    assertValidGameWriteSecret(args.writeSecret)
    return ctx.runQuery(internal.gameSessions.getSession, {
      sessionId: args.sessionId,
    })
  },
})

export const createGameSession = action({
  args: {
    writeSecret: v.string(),
    sessionSecret: v.string(),
    seed: v.number(),
  },
  returns: v.string(),
  handler: async (ctx, args): Promise<string> => {
    assertValidGameWriteSecret(args.writeSecret)
    return ctx.runMutation(internal.gameSessions.createSessionWithId, {
      secret: args.sessionSecret,
      seed: args.seed,
    })
  },
})

export const updateGameSession = action({
  args: {
    writeSecret: v.string(),
    sessionId: v.id('gameSessions'),
    isActive: v.boolean(),
    validatedScore: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    assertValidGameWriteSecret(args.writeSecret)
    await ctx.runMutation(internal.gameSessions.updateSession, {
      sessionId: args.sessionId,
      isActive: args.isActive,
      validatedScore: args.validatedScore,
    })
    return null
  },
})

export const addScore = action({
  args: {
    writeSecret: v.string(),
    name: v.string(),
    score: v.number(),
  },
  returns: v.union(v.number(), v.null()),
  handler: async (ctx, args): Promise<number | null> => {
    assertValidGameWriteSecret(args.writeSecret)
    return ctx.runMutation(internal.scores.addScore, {
      name: args.name,
      score: args.score,
    })
  },
})
