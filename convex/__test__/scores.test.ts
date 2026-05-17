import { describe, expect, it } from 'vitest'
import { sortScoresForLeaderboard } from '../scores'

describe('sortScoresForLeaderboard', () => {
  it('sorts by score descending and older ties first', () => {
    const scores = [
      { _creationTime: 30, score: 200, name: 'NEW' },
      { _creationTime: 10, score: 200, name: 'OLD' },
      { _creationTime: 20, score: 300, name: 'TOP' },
      { _creationTime: 40, score: 100, name: 'LOW' },
    ]

    expect(sortScoresForLeaderboard(scores).map(score => score.name)).toEqual(['TOP', 'OLD', 'NEW', 'LOW'])
  })

  it('does not mutate the caller array', () => {
    const scores = [
      { _creationTime: 2, score: 100, name: 'B' },
      { _creationTime: 1, score: 100, name: 'A' },
    ]

    const sorted = sortScoresForLeaderboard(scores)

    expect(sorted).not.toBe(scores)
    expect(scores.map(score => score.name)).toEqual(['B', 'A'])
    expect(sorted.map(score => score.name)).toEqual(['A', 'B'])
  })
})
