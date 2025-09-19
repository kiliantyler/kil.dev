import { createGameSession } from '@/lib/game-validation'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

// POST /api/game/start - Start a new game session
export async function POST(_request: NextRequest) {
  try {
    const { sessionId, secret, seed } = await createGameSession()

    return NextResponse.json({
      success: true,
      sessionId,
      secret,
      seed,
      message: 'Game session started',
    })
  } catch (error) {
    console.error('Error starting game session:', error)
    return NextResponse.json({ success: false, message: 'Failed to start game session' }, { status: 500 })
  }
}
