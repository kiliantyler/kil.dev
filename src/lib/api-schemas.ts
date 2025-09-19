import { z } from 'zod'

// Shared Zod schemas for API response validation
export const LeaderboardEntrySchema = z.object({
  name: z.string(),
  score: z.number(),
  timestamp: z.number(),
  id: z.string(),
})
export const ScoreQualificationResponseSchema = z.object({
  success: z.boolean(),
  qualifies: z.boolean(),
  currentThreshold: z.number().optional(),
  message: z.string().optional(),
})

export const ScoreSubmissionResponseSchema = z.object({
  success: z.boolean(),
  position: z.number().optional(),
  leaderboard: z.array(LeaderboardEntrySchema).optional(),
  message: z.string().optional(),
})

// Additional schemas used in use-leaderboard.ts
export const CheckScoreResponseSchema = z.object({
  qualifies: z.boolean(),
  currentThreshold: z.number().optional(),
})

export const LeaderboardResponseSchema = z.object({
  success: z.boolean(),
  leaderboard: z.array(LeaderboardEntrySchema),
})

export const SubmitScoreResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  leaderboard: z.array(LeaderboardEntrySchema).optional(),
})

// Game session lifecycle schemas
export const GameStartResponseSchema = z.object({
  success: z.boolean(),
  sessionId: z.string().optional(),
  secret: z.string().optional(),
  seed: z.number().optional(),
  message: z.string().optional(),
})

export const GameEndResponseSchema = z.object({
  success: z.boolean(),
  validatedScore: z.number().optional(),
  message: z.string().optional(),
})

// Game end request schema
export const GameDirectionEnum = z.enum(['UP', 'DOWN', 'LEFT', 'RIGHT'])

export const GameEndEventSchema = z.object({
  t: z.number(),
  k: GameDirectionEnum,
})

export const GameEndFoodSchema = z.object({
  t: z.number(),
  g: z.boolean(),
})

export const GameEndRequestSchema = z.object({
  sessionId: z.string().min(1),
  signature: z.string().min(1),
  finalScore: z.number(),
  events: z.array(GameEndEventSchema).default([]),
  foods: z.array(GameEndFoodSchema).default([]),
  durationMs: z.number().nonnegative().default(0),
})
