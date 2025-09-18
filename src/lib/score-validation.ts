import { z } from 'zod'

export const scoreSubmissionSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(3, 'Name must be 3 characters or less')
    .regex(/^[A-Z]+$/, 'Name must contain only uppercase letters'),
  score: z
    .number()
    .int('Score must be an integer')
    .min(0, 'Score must be non-negative')
    .max(9999, 'Score must be less than 10,000'),
})

export function validateScoreSubmission(data: unknown) {
  return scoreSubmissionSchema.safeParse(data)
}

export function sanitizeName(name: string): string {
  return name
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 3)
    .padEnd(3, 'A') // Pad with 'A' if less than 3 characters
}
