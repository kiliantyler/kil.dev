import { recordFoodEaten } from '@/lib/game-validation'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

// POST /api/game/food - Record food eaten
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      sessionId: string
      secret: string
      position: { x: number; y: number }
      isGolden: boolean
      score: number
    }

    const { sessionId, secret, position, isGolden, score } = body

    if (!sessionId || !secret || !position || typeof isGolden !== 'boolean' || typeof score !== 'number') {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: sessionId, secret, position, isGolden, score' },
        { status: 400 },
      )
    }

    const result = recordFoodEaten(sessionId, secret, position, isGolden, score)

    if (!result.success) {
      return NextResponse.json({ success: false, message: result.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: 'Food eaten recorded',
    })
  } catch (error) {
    console.error('Error recording food eaten:', error)
    return NextResponse.json({ success: false, message: 'Failed to record food eaten' }, { status: 500 })
  }
}
