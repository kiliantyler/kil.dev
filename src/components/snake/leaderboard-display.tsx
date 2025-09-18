'use client'

import { Card } from '@/components/ui/card'
import type { LeaderboardEntry } from '@/types/leaderboard'
import { formatScore, formatTime, getRankDisplay } from '@/utils/arcade-utils'

interface LeaderboardDisplayProps {
  scores: LeaderboardEntry[]
  currentScore?: number
  isLoading?: boolean
}

export function LeaderboardDisplay({ scores, currentScore, isLoading }: LeaderboardDisplayProps) {
  if (isLoading) {
    return (
      <Card className="w-full max-w-sm p-4 bg-gradient-to-br from-green-900/90 to-green-800/90 border-green-500/50">
        <div className="text-center">
          <h3 className="text-lg font-bold text-green-400 font-mono mb-3">LEADERBOARD</h3>
          <div className="text-green-300 font-mono text-sm">Loading...</div>
        </div>
      </Card>
    )
  }

  if (scores.length === 0) {
    return (
      <Card className="w-full max-w-sm p-4 bg-gradient-to-br from-green-900/90 to-green-800/90 border-green-500/50">
        <div className="text-center">
          <h3 className="text-lg font-bold text-green-400 font-mono mb-3">LEADERBOARD</h3>
          <div className="text-green-300 font-mono text-sm">No scores yet!</div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-sm p-4 bg-gradient-to-br from-green-900/90 to-green-800/90 border-green-500/50">
      <div className="text-center">
        <h3 className="text-lg font-bold text-green-400 font-mono mb-3">LEADERBOARD</h3>

        <div className="space-y-1 max-h-64 overflow-y-auto">
          {scores.map((entry, index) => (
            <div
              key={entry.id}
              className={`flex justify-between items-center px-2 py-1.5 rounded font-mono text-xs transition-all duration-200 ${
                currentScore === entry.score
                  ? 'bg-green-500/30 border border-green-400/70 shadow-lg shadow-green-400/20'
                  : 'bg-black/30 hover:bg-black/40'
              }`}>
              <span className="text-green-300 text-sm">{getRankDisplay(index + 1)}</span>

              <span className="text-green-400 font-bold text-sm tracking-wider">{entry.name}</span>

              <div className="text-right">
                <div className="text-green-300 font-bold text-sm">{formatScore(entry.score)}</div>
                <div className="text-xs text-green-400/70">{formatTime(entry.timestamp)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}
