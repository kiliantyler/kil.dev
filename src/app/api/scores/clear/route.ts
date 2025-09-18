import { clearLeaderboard } from '@/lib/leaderboard'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    await clearLeaderboard()
    return NextResponse.json({ success: true, message: 'Leaderboard cleared successfully' })
  } catch (error) {
    console.error('Error clearing leaderboard:', error)
    return NextResponse.json({ success: false, message: 'Failed to clear leaderboard' }, { status: 500 })
  }
}
