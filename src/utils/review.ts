import { REVIEW_CONFIG } from '@/lib/review'
import type { ReviewState } from '@/types/review'
import { type UnlockedMap } from '@/utils/achievements'

function safeGetWindow(): Window | null {
  if (typeof window === 'undefined') return null
  try {
    return window
  } catch {
    return null
  }
}

function readRaw(): ReviewState | null {
  const w = safeGetWindow()
  if (!w) return null
  try {
    const raw = w.localStorage.getItem(REVIEW_CONFIG.storageKey)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return null
    const obj = parsed as Partial<Record<string, unknown>>
    const state: ReviewState = {
      triggeredAt: typeof obj.triggeredAt === 'string' ? obj.triggeredAt : undefined,
      submittedAt: typeof obj.submittedAt === 'string' ? obj.submittedAt : undefined,
      lastRating:
        obj.lastRating === 0 ||
        obj.lastRating === 1 ||
        obj.lastRating === 2 ||
        obj.lastRating === 3 ||
        obj.lastRating === 4 ||
        obj.lastRating === 5
          ? (obj.lastRating as 0 | 1 | 2 | 3 | 4 | 5)
          : undefined,
      reminderCount:
        typeof obj.reminderCount === 'number' && Number.isFinite(obj.reminderCount) ? (obj.reminderCount as number) : 0,
    }
    if (state.reminderCount < 0) state.reminderCount = 0
    return state
  } catch {
    return null
  }
}

function writeRaw(next: ReviewState): void {
  const w = safeGetWindow()
  if (!w) return
  try {
    const payload: ReviewState = {
      triggeredAt: next.triggeredAt,
      submittedAt: next.submittedAt,
      lastRating: next.lastRating,
      reminderCount: Math.max(0, next.reminderCount ?? 0),
    }
    w.localStorage.setItem(REVIEW_CONFIG.storageKey, JSON.stringify(payload))
  } catch {}
}

export function readReviewState(): ReviewState {
  const existing = readRaw()
  if (existing) return existing
  return { reminderCount: 0 }
}

export function writeReviewState(next: ReviewState): void {
  writeRaw(next)
}

export function markTriggered(): void {
  const state = readReviewState()
  if (state.triggeredAt) return
  const now = new Date().toISOString()
  writeReviewState({ ...state, triggeredAt: now })
}

export function incrementReminderCount(): void {
  const state = readReviewState()
  const next = (state.reminderCount ?? 0) + 1
  writeReviewState({ ...state, reminderCount: next })
}

export function markSubmitted(rating: 5): void {
  const now = new Date().toISOString()
  const state = readReviewState()
  writeReviewState({ ...state, submittedAt: now, lastRating: rating })
}

export function shouldShowGate(unlocked: UnlockedMap): boolean {
  if (!REVIEW_CONFIG.enabled) return false

  // Never show if already submitted
  const state = readReviewState()
  if (state.submittedAt && state.submittedAt.length > 0) return false

  // Count unlocked excluding the review-specific achievement
  let count = 0
  for (const [key, value] of Object.entries(unlocked)) {
    if (key === REVIEW_CONFIG.achievementIdOnSubmit) continue
    if (typeof value === 'string' && value.trim().length > 0) count += 1
  }
  return count >= REVIEW_CONFIG.achievementsThreshold
}
