import { checkScoreQualification } from '@/lib/leaderboard'
import type { ScoreQualificationResponse } from '@/types/leaderboard'
import { NextResponse } from 'next/server'

// GET /api/scores/check/:score - Check if score qualifies for leaderboard
export async function GET(_request: Request, context: { params: Promise<{ score?: string }> }) {
  try {
    const { score: scoreParam } = await context.params

    if (!scoreParam || !/^\d+$/.test(scoreParam)) {
      return NextResponse.json({ success: false, message: 'Invalid score value' }, { status: 400 })
    }

    const score = Number(scoreParam)

    const { qualifies, threshold } = await checkScoreQualification(score)

    const response: ScoreQualificationResponse = {
      success: true,
      qualifies,
      currentThreshold: threshold,
      message: qualifies
        ? `Congratulations! Your score of ${score} qualifies for the leaderboard!`
        : `Your score of ${score} needs to be at least ${threshold} to qualify.`,
    }

    return NextResponse.json(response)
  } catch {
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
