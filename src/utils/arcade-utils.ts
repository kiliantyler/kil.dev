// Arcade-style utility functions

export function generateArcadeSound(frequency: number, duration = 100) {
  // Simple beep sound generation for arcade feel
  if (typeof window === 'undefined') return

  const audioContext = new (window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
  const oscillator = audioContext.createOscillator()
  const gainNode = audioContext.createGain()

  oscillator.connect(gainNode)
  gainNode.connect(audioContext.destination)

  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime)
  oscillator.type = 'square'

  gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000)

  oscillator.start(audioContext.currentTime)
  oscillator.stop(audioContext.currentTime + duration / 1000)
}

export function playScoreSound(score: number) {
  // Different sounds for different score milestones
  if (score % 100 === 0) {
    generateArcadeSound(800, 200) // High score milestone
  } else if (score % 50 === 0) {
    generateArcadeSound(600, 150) // Medium milestone
  } else {
    generateArcadeSound(400, 100) // Regular score
  }
}

export function playGameOverSound() {
  // Descending tone for game over
  generateArcadeSound(300, 500)
  setTimeout(() => generateArcadeSound(200, 500), 100)
}

export function playSubmitSound() {
  // Ascending tone for successful submission
  generateArcadeSound(500, 100)
  setTimeout(() => generateArcadeSound(700, 100), 50)
  setTimeout(() => generateArcadeSound(900, 150), 100)
}

export function formatScore(score: number): string {
  return score.toString().padStart(4, '0')
}

export function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function getRankDisplay(rank: number): string {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return `#${rank}`
}
