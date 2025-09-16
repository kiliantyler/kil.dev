import { type AchievementId, ACHIEVEMENTS, ACHIEVEMENTS_COOKIE_NAME } from '@/lib/achievements'
import { PRESENCE_RUNTIME_BUNDLE } from '@/utils/presence-bundle'

export type UnlockedMap = Partial<Record<AchievementId, string>>

export function createEmptyUnlocked(): UnlockedMap {
  return {}
}

export function isValidAchievementId(id: string): id is AchievementId {
  return Object.prototype.hasOwnProperty.call(ACHIEVEMENTS, id)
}

export function parseUnlockedCookie(raw: string | undefined): UnlockedMap {
  if (!raw) return createEmptyUnlocked()
  let text = raw
  try {
    // Handle percent-encoded cookie values
    text = decodeURIComponent(raw)
  } catch {}
  try {
    const parsed = JSON.parse(text) as unknown
    return sanitizeUnlockedRecord(parsed)
  } catch {
    return createEmptyUnlocked()
  }
}

export function serializeUnlockedCookie(map: UnlockedMap): string {
  // Persist only unlocked achievements with non-empty timestamps
  const payload: Record<string, string> = {}
  for (const [key, value] of Object.entries(map)) {
    if (isValidAchievementId(key) && typeof value === 'string' && value.trim().length > 0) {
      payload[key] = value
    }
  }
  return JSON.stringify(payload)
}

function sanitizeUnlockedRecord(obj: unknown): UnlockedMap {
  if (!obj || typeof obj !== 'object') return createEmptyUnlocked()
  const result: UnlockedMap = {}
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (isValidAchievementId(key) && typeof value === 'string' && value.trim().length > 0) {
      result[key] = value
    }
  }
  return result
}

export function parseUnlockedStorage(raw: string | null | undefined): UnlockedMap {
  if (!raw) return createEmptyUnlocked()
  try {
    const parsed = JSON.parse(raw) as unknown
    return sanitizeUnlockedRecord(parsed)
  } catch {
    return createEmptyUnlocked()
  }
}

type PresenceConfig = { cookieName?: string; key: string; attribute: string }
export function buildPresenceScript(cfg: PresenceConfig): string {
  const finalCfg = { cookieName: ACHIEVEMENTS_COOKIE_NAME, ...cfg }
  const serializedCfg = JSON.stringify(finalCfg)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
  const invoke = ';try{window.PresenceRuntime&&window.PresenceRuntime.initPresence(' + serializedCfg + ')}catch(e){}'
  return PRESENCE_RUNTIME_BUNDLE + invoke
}
