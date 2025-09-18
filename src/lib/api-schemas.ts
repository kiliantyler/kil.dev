import { z } from 'zod'

// Shared Zod schemas for API response validation
export const ScoreQualificationResponseSchema = z.object({
  success: z.boolean(),
  qualifies: z.boolean(),
  currentThreshold: z.number().optional(),
  message: z.string().optional(),
})

export const ScoreSubmissionResponseSchema = z.object({
  success: z.boolean(),
  position: z.number().optional(),
  leaderboard: z
    .array(
      z.object({
        name: z.string(),
        score: z.number(),
        timestamp: z.number(),
        id: z.string(),
      }),
    )
    .optional(),
  message: z.string().optional(),
})

// Additional schemas used in use-leaderboard.ts
export const CheckScoreResponseSchema = z.object({
  qualifies: z.boolean(),
  currentThreshold: z.number().optional(),
})

export const LeaderboardResponseSchema = z.object({
  success: z.boolean(),
  leaderboard: z.array(
    z.object({
      name: z.string(),
      score: z.number(),
      timestamp: z.number(),
      id: z.string(),
    }),
  ),
})

export const SubmitScoreResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  leaderboard: z
    .array(
      z.object({
        name: z.string(),
        score: z.number(),
        timestamp: z.number(),
        id: z.string(),
      }),
    )
    .optional(),
})
