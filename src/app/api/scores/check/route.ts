import { getQualificationThresholdSafe } from '@/lib/leaderboard'
import type { ScoreQualificationResponse } from '@/types/leaderboard'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

// GET /api/scores/check?score=150 - Check if score qualifies for leaderboard
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const scoreParam = searchParams.get('score')

    if (!scoreParam) {
      return NextResponse.json({ success: false, message: 'Score parameter is required' }, { status: 400 })
    }

    const score = parseInt(scoreParam, 10)

    if (isNaN(score) || score < 0) {
      return NextResponse.json({ success: false, message: 'Invalid score value' }, { status: 400 })
    }

    const threshold = await getQualificationThresholdSafe()
    const qualifies = score >= threshold

    const response: ScoreQualificationResponse = {
      success: true,
      qualifies,
      currentThreshold: threshold,
      message: qualifies
        ? `Congratulations! Your score of ${score} qualifies for the leaderboard!`
        : `Your score of ${score} needs to be at least ${threshold} to qualify.`,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error checking score qualification:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
