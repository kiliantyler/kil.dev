import { z } from 'zod'

export const scoreSubmissionSchema = z
  .object({
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
    sessionId: z.string().optional(),
    // If sessionId present, require signed payload
    timestamp: z.number().int('timestamp must be an integer').optional(),
    nonce: z.string().length(32, 'nonce must be 16 bytes hex').optional(),
    signature: z.string().length(64, 'signature must be sha256 hex').optional(),
  })
  .refine(
    data => {
      if (typeof data.sessionId === 'string') {
        return (
          typeof data.timestamp === 'number' && typeof data.nonce === 'string' && typeof data.signature === 'string'
        )
      }
      return true
    },
    { message: 'timestamp, nonce and signature are required when sessionId is provided' },
  )

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
