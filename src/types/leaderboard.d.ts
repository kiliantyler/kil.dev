export interface LeaderboardEntry {
  name: string // 3 characters max, uppercase
  score: number // Player's score
  timestamp: number // Unix timestamp when score was achieved
  id: string // Unique identifier (UUID)
}

export interface ScoreSubmissionRequest {
  name: string
  score: number
}

export interface ScoreSubmissionResponse {
  success: boolean
  position?: number
  leaderboard?: LeaderboardEntry[]
  message?: string
}

export interface LeaderboardResponse {
  success: boolean
  leaderboard: LeaderboardEntry[]
  message?: string
}

export interface ScoreQualificationResponse {
  qualifies: boolean
  currentThreshold?: number
  message?: string
}
