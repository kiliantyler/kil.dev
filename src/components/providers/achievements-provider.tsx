'use client'

import { AchievementPopup } from '@/components/layout/achievements/achievement-popup'
import { captureAchievementUnlocked } from '@/hooks/posthog'
import { ACHIEVEMENTS, ACHIEVEMENTS_COOKIE_NAME, type AchievementId } from '@/lib/achievements'
import { LOCAL_STORAGE_KEYS, SESSION_STORAGE_KEYS } from '@/lib/storage-keys'
import type { ThemeName } from '@/lib/themes'
import {
  createEmptyUnlocked,
  parseUnlockedStorage,
  serializeUnlockedCookie,
  type UnlockedMap,
} from '@/utils/achievements'
import { resetReviewState } from '@/utils/review'
import { getThemeBaseColor } from '@/utils/themes'
import Cookies from 'js-cookie'
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Toaster, toast } from 'sonner'
import { useConfetti } from './confetti-provider'
import { useTheme } from './theme-provider'

type AchievementsContextValue = {
  unlocked: UnlockedMap
  has: (id: AchievementId) => boolean
  unlock: (id: AchievementId) => void
  reset: () => void
}

const AchievementsContext = createContext<AchievementsContextValue | null>(null)

function areUnlockedEqual(a: UnlockedMap, b: UnlockedMap): boolean {
  const aKeys = Object.keys(a)
  const bKeys = Object.keys(b)
  if (aKeys.length !== bKeys.length) return false
  for (const k of aKeys) {
    if (a[k as AchievementId] !== b[k as AchievementId]) return false
  }
  return true
}

function readFromStorage(): UnlockedMap {
  if (globalThis.window === undefined) return createEmptyUnlocked()
  try {
    const raw = globalThis.window.localStorage.getItem(LOCAL_STORAGE_KEYS.ACHIEVEMENTS)
    return parseUnlockedStorage(raw)
  } catch {
    return createEmptyUnlocked()
  }
}

function writeToStorage(map: UnlockedMap) {
  if (globalThis.window === undefined) return
  try {
    globalThis.window.localStorage.setItem(LOCAL_STORAGE_KEYS.ACHIEVEMENTS, JSON.stringify(map))
  } catch {}
}

export function AchievementsProvider({
  children,
  initialUnlocked,
}: {
  children: React.ReactNode
  initialUnlocked?: UnlockedMap
}) {
  const [unlocked, setUnlocked] = useState<UnlockedMap>(() => initialUnlocked ?? readFromStorage())

  // Seed from presence data attributes if local storage is empty or missing entries
  useEffect(() => {
    if (typeof document === 'undefined') return
    try {
      const root = document.documentElement
      const nowIso = new Date().toISOString()

      function toKebabCase(id: string): string {
        return id.toLowerCase().replaceAll('_', '-')
      }

      const id = requestAnimationFrame(() => {
        setUnlocked(prev => {
          let changed = false
          const next = { ...prev }
          for (const id of Object.keys(ACHIEVEMENTS)) {
            const attr = 'data-achievement-' + toKebabCase(id)
            if (next[id as AchievementId]) continue
            if (root.hasAttribute(attr)) {
              next[id as AchievementId] = nowIso
              changed = true
            }
          }
          return changed ? next : prev
        })
      })
      return () => cancelAnimationFrame(id)
    } catch {}
  }, [])

  // Cross-tab sync: respond to localStorage updates from other tabs
  useEffect(() => {
    if (globalThis.window === undefined) return
    const onStorage = (e: StorageEvent) => {
      if (e.key !== LOCAL_STORAGE_KEYS.ACHIEVEMENTS) return
      const next = parseUnlockedStorage(e.newValue)
      setUnlocked(prev => (areUnlockedEqual(prev, next) ? prev : next))
    }
    try {
      globalThis.window.addEventListener('storage', onStorage)
      return () => globalThis.window.removeEventListener('storage', onStorage)
    } catch {
      return
    }
  }, [])

  useEffect(() => {
    writeToStorage(unlocked)
    try {
      // Mirror to cookie for SSR hydration consistency
      const value = serializeUnlockedCookie(unlocked)
      const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      Cookies.set(ACHIEVEMENTS_COOKIE_NAME, value, {
        path: '/',
        expires: expires,
        sameSite: 'lax',
      })
    } catch {}
  }, [unlocked])

  const has = useCallback(
    (id: AchievementId) => {
      return Boolean(unlocked[id])
    },
    [unlocked],
  )

  // Popup queue state
  const [currentPopup, setCurrentPopup] = useState<AchievementId | null>(null)
  const popupQueueRef = useRef<AchievementId[]>([])

  const dequeueAndShow = useCallback(() => {
    const next = popupQueueRef.current.shift() ?? null
    setCurrentPopup(next ?? null)
  }, [])

  const enqueuePopup = useCallback(
    (id: AchievementId) => {
      if (!Object.hasOwn(ACHIEVEMENTS, id)) return
      if (currentPopup === id) return
      if (popupQueueRef.current.includes(id)) return
      const wasEmpty = popupQueueRef.current.length === 0
      popupQueueRef.current.push(id)
      if (currentPopup === null && wasEmpty) dequeueAndShow()
    },
    [currentPopup, dequeueAndShow],
  )

  const { triggerConfettiFromCorners } = useConfetti()

  // Prevent duplicate unlocks/toasts in the same tick via a pending set
  const pendingUnlocksRef = useRef<Set<AchievementId>>(new Set())
  const pendingConfettiRef = useRef<Set<AchievementId>>(new Set())
  const unlock = useCallback(
    (id: AchievementId) => {
      if (pendingUnlocksRef.current.has(id)) return
      if (has(id)) return

      pendingUnlocksRef.current.add(id)
      const timestampIso = new Date().toISOString()
      setUnlocked(prev => ({ ...prev, [id]: timestampIso }))
      // Schedule cleanup of the pending flag regardless
      queueMicrotask(() => pendingUnlocksRef.current.delete(id))

      enqueuePopup(id)
      try {
        captureAchievementUnlocked(id)
      } catch {}
    },
    [has, enqueuePopup],
  )

  const reset = useCallback(() => {
    setUnlocked(createEmptyUnlocked())
    try {
      resetReviewState()
    } catch {}
    try {
      // Clear achievement-specific localStorage flags
      localStorage.removeItem(LOCAL_STORAGE_KEYS.MATRIX_THEME_SELECTED)
      localStorage.removeItem(LOCAL_STORAGE_KEYS.DOTCOM_THEME_UNLOCKED)
      localStorage.removeItem(LOCAL_STORAGE_KEYS.CONSOLE_OPENED)
    } catch {}
    toast.success('Achievements Reset', {
      description: 'All achievements have been reset.',
      position: 'bottom-right',
      duration: 3000,
    })
  }, [])

  // Listen for custom achievement unlock events (e.g., from console commands)
  useEffect(() => {
    if (globalThis.window === undefined) return
    const onUnlockAchievement = (e: Event) => {
      const customEvent = e as CustomEvent<{ achievementId?: AchievementId } | undefined>
      const achievementId = customEvent.detail?.achievementId
      if (achievementId && Object.hasOwn(ACHIEVEMENTS, achievementId)) {
        unlock(achievementId)
      }
    }
    try {
      globalThis.window.addEventListener('kd:unlock-achievement', onUnlockAchievement)
      return () => globalThis.window.removeEventListener('kd:unlock-achievement', onUnlockAchievement)
    } catch {
      return
    }
  }, [unlock])

  const value = useMemo<AchievementsContextValue>(
    () => ({ unlocked, has, unlock, reset }),
    [unlocked, has, unlock, reset],
  )

  // Reflect presence of RECURSIVE_REWARD to the DOM for CSS-gated UI (e.g., achievements nav item)
  const hasRecursiveReward = Boolean(unlocked.RECURSIVE_REWARD)
  useEffect(() => {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    if (hasRecursiveReward) {
      root.dataset.hasAchievements = 'true'
      return
    }
    delete root.dataset.hasAchievements
  }, [hasRecursiveReward])

  // One-time sparkle on first reveal in this session
  const prevHasRecursiveRef = useRef<boolean | null>(null)
  useEffect(() => {
    const prev = prevHasRecursiveRef.current
    prevHasRecursiveRef.current = hasRecursiveReward
    if (prev === null) return // ignore first run to avoid false positive on reload
    if (!prev && hasRecursiveReward) {
      try {
        const w = globalThis.window as unknown as { sessionStorage?: Storage }
        const already = w.sessionStorage?.getItem(SESSION_STORAGE_KEYS.ACHIEVEMENTS_NAV_SPARKLED)
        if (!already) {
          w.sessionStorage?.setItem(SESSION_STORAGE_KEYS.ACHIEVEMENTS_NAV_SPARKLED, '1')
          document.documentElement.dataset.achievementsJustUnlocked = 'true'
          globalThis.window.setTimeout(() => {
            delete document.documentElement.dataset.achievementsJustUnlocked
          }, 1400)
        }
      } catch {}
    }
  }, [hasRecursiveReward])

  // Reflect presence of PET_PARADE to the DOM for CSS-gated UI (e.g., pet gallery nav item)
  const hasPetParade = Boolean(unlocked.PET_PARADE)
  useEffect(() => {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    if (hasPetParade) {
      root.dataset.hasPetGallery = 'true'
      return
    }
    delete root.dataset.hasPetGallery
  }, [hasPetParade])

  // Reflect presence of THEME_TAPDANCE to the DOM for CSS-gated UI (e.g., theme availability)
  const hasThemeTapdance = Boolean(unlocked.THEME_TAPDANCE)
  useEffect(() => {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    if (hasThemeTapdance) {
      root.dataset.hasThemeTapdance = 'true'
      return
    }
    delete root.dataset.hasThemeTapdance
  }, [hasThemeTapdance])

  // One-time sparkle on first reveal in this session for pet gallery
  const prevHasPetParadeRef = useRef<boolean | null>(null)
  useEffect(() => {
    const prev = prevHasPetParadeRef.current
    prevHasPetParadeRef.current = hasPetParade
    if (prev === null) return
    if (!prev && hasPetParade) {
      try {
        const w = globalThis.window as unknown as { sessionStorage?: Storage }
        const already = w.sessionStorage?.getItem(SESSION_STORAGE_KEYS.PET_GALLERY_NAV_SPARKLED)
        if (!already) {
          w.sessionStorage?.setItem(SESSION_STORAGE_KEYS.PET_GALLERY_NAV_SPARKLED, '1')
          document.documentElement.dataset.petGalleryJustUnlocked = 'true'
          globalThis.window.setTimeout(() => {
            delete document.documentElement.dataset.petGalleryJustUnlocked
          }, 1400)
        }
      } catch {}
    }
  }, [hasPetParade])

  useEffect(() => {
    if (has('RECURSIVE_REWARD')) return

    let earnedCount = 0
    for (const [key, value] of Object.entries(unlocked)) {
      if (key === 'RECURSIVE_REWARD') continue
      if (typeof value === 'string' && value.trim().length > 0) earnedCount += 1
    }

    if (earnedCount >= 3) {
      queueMicrotask(() => unlock('RECURSIVE_REWARD'))
    }
  }, [unlocked, has, unlock])

  // Unlock PERFECT_PLATINUM when all other achievements are unlocked (dynamic, no hardcoded counts)
  useEffect(() => {
    if (has('PERFECT_PLATINUM')) return

    const allIds = Object.keys(ACHIEVEMENTS) as AchievementId[]
    const others = allIds.filter(id => id !== 'PERFECT_PLATINUM')
    if (others.length === 0) return

    const allOthersUnlocked = others.every(id => {
      const ts = unlocked[id]
      return typeof ts === 'string' && ts.trim().length > 0
    })

    if (allOthersUnlocked) {
      queueMicrotask(() => unlock('PERFECT_PLATINUM'))
    }
  }, [unlocked, has, unlock])

  const { resolvedTheme } = useTheme()
  const sonnerTheme: 'light' | 'dark' = useMemo(() => {
    const rt = resolvedTheme
    if (!rt) return 'light'
    if (rt === 'light' || rt === 'dark') return rt
    return getThemeBaseColor(rt as ThemeName)
  }, [resolvedTheme])

  // Reflect generic per-achievement presence attributes for live updates on static pages
  useEffect(() => {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    const toKebabCase = (s: string) => s.toLowerCase().replaceAll('_', '-')

    for (const id of Object.keys(ACHIEVEMENTS)) {
      const attr = 'data-achievement-' + toKebabCase(id)
      if (unlocked[id as AchievementId]) {
        root.setAttribute(attr, 'true')
      } else {
        root.removeAttribute(attr)
      }
    }
  }, [unlocked])

  return (
    <AchievementsContext.Provider value={value}>
      {children}
      {currentPopup && (
        <AchievementPopup
          key={currentPopup}
          id={currentPopup}
          onVisible={() => {
            const id = currentPopup
            const def = ACHIEVEMENTS[id]
            if (def?.confetti && !pendingConfettiRef.current.has(id)) {
              pendingConfettiRef.current.add(id)
              try {
                triggerConfettiFromCorners()
              } catch {}
              setTimeout(() => pendingConfettiRef.current.delete(id), 1000)
            }
          }}
          onDone={() => {
            setCurrentPopup(null)
            if (popupQueueRef.current.length > 0) {
              // Use microtask to avoid nested state updates
              queueMicrotask(dequeueAndShow)
            }
          }}
        />
      )}
      <Toaster
        position="bottom-right"
        theme={sonnerTheme}
        closeButton
        duration={4000}
        richColors={false}
        toastOptions={{
          style: {
            background: 'var(--color-popover)',
            color: 'var(--color-popover-foreground)',
            border: '1px solid var(--color-border)',
          },
          classNames: {
            toast: 'rounded-lg shadow-2xl z-50',
            title: 'text-base font-semibold',
            description: 'text-sm text-muted-foreground',
            icon: 'text-base',
            closeButton: 'text-muted-foreground hover:text-foreground',
            actionButton: 'bg-primary text-primary-foreground hover:bg-primary/90',
            cancelButton: 'bg-muted text-foreground hover:bg-muted/80',
            success: 'bg-primary text-primary-foreground',
            error: 'bg-destructive text-destructive-foreground',
            warning: 'bg-accent text-accent-foreground',
            info: 'bg-secondary text-secondary-foreground',
          },
        }}
      />
    </AchievementsContext.Provider>
  )
}

export function useAchievements() {
  const ctx = useContext(AchievementsContext)
  if (!ctx) throw new Error('useAchievements must be used within AchievementsProvider')
  return ctx
}
