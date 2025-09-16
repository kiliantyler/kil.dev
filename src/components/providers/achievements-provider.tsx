'use client'

import {
  ACHIEVEMENTS,
  ACHIEVEMENTS_COOKIE_NAME,
  createEmptyUnlocked,
  parseUnlockedStorage,
  serializeUnlockedCookie,
  type AchievementId,
  type UnlockedMap,
} from '@/lib/achievements'
import { getThemeBaseColor, type ThemeName } from '@/lib/themes'
import { cn } from '@/lib/utils'
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Toaster, toast } from 'sonner'
import { useTheme } from './theme-provider'

type AchievementsContextValue = {
  unlocked: UnlockedMap
  has: (id: AchievementId) => boolean
  unlock: (id: AchievementId) => void
  reset: () => void
}

const AchievementsContext = createContext<AchievementsContextValue | null>(null)

const STORAGE_KEY = 'kil.dev/achievements/v1'

function areUnlockedEqual(a: UnlockedMap, b: UnlockedMap): boolean {
  const aKeys = Object.keys(a)
  const bKeys = Object.keys(b)
  if (aKeys.length !== bKeys.length) return false
  for (const k of aKeys) {
    if (a[k] !== b[k]) return false
  }
  return true
}

function readFromStorage(): UnlockedMap {
  if (typeof window === 'undefined') return createEmptyUnlocked()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return parseUnlockedStorage(raw)
  } catch {
    return createEmptyUnlocked()
  }
}

function writeToStorage(map: UnlockedMap) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
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
  const mountedRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true
  }, [])

  // Cross-tab sync: respond to localStorage updates from other tabs
  useEffect(() => {
    if (typeof window === 'undefined') return
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return
      const next = parseUnlockedStorage(e.newValue)
      setUnlocked(prev => (areUnlockedEqual(prev, next) ? prev : next))
    }
    try {
      window.addEventListener('storage', onStorage)
      return () => window.removeEventListener('storage', onStorage)
    } catch {
      return
    }
  }, [])

  useEffect(() => {
    writeToStorage(unlocked)
    try {
      // Mirror to cookie for SSR hydration consistency
      const value = serializeUnlockedCookie(unlocked)
      const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString()
      document.cookie = `${ACHIEVEMENTS_COOKIE_NAME}=${encodeURIComponent(value)}; path=/; expires=${expires}; samesite=lax`
    } catch {}
  }, [unlocked])

  const has = useCallback(
    (id: AchievementId) => {
      return Boolean(unlocked[id])
    },
    [unlocked],
  )

  const showToast = useCallback((id: AchievementId) => {
    const def = ACHIEVEMENTS[id]
    if (!def) return
    toast.success(def.title, {
      description: def.description,
      position: 'bottom-right',
      duration: 4000,
      icon: def.icon,
    })
  }, [])

  // Prevent duplicate unlocks/toasts in the same tick via a pending set
  const pendingUnlocksRef = useRef<Set<AchievementId>>(new Set())
  const unlock = useCallback(
    (id: AchievementId) => {
      if (!mountedRef.current) return
      if (pendingUnlocksRef.current.has(id)) return
      if (has(id)) return

      pendingUnlocksRef.current.add(id)
      const timestampIso = new Date().toISOString()
      setUnlocked(prev => ({ ...prev, [id]: timestampIso }))
      // Schedule cleanup of the pending flag regardless
      queueMicrotask(() => pendingUnlocksRef.current.delete(id))

      showToast(id)
    },
    [has, showToast],
  )

  const reset = useCallback(() => {
    if (!mountedRef.current) return
    setUnlocked(createEmptyUnlocked())
    toast.success('Achievements Reset', {
      description: 'All achievements have been reset.',
      position: 'bottom-right',
      duration: 3000,
    })
  }, [])

  const value = useMemo<AchievementsContextValue>(
    () => ({ unlocked, has, unlock, reset }),
    [unlocked, has, unlock, reset],
  )

  useEffect(() => {
    if (!mountedRef.current) return
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

  const { resolvedTheme } = useTheme()
  const sonnerTheme: 'light' | 'dark' = useMemo(() => {
    const rt = resolvedTheme
    if (!rt) return 'light'
    if (rt === 'light' || rt === 'dark') return rt
    return getThemeBaseColor(rt as ThemeName)
  }, [resolvedTheme])

  return (
    <AchievementsContext.Provider value={value}>
      {children}
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
            toast: 'rounded-lg shadow-2xl',
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

export function AchievementsDebugPanel({ className }: { className?: string }) {
  const { unlocked } = useAchievements()
  return (
    <div className={cn('hidden', className)} aria-hidden>
      {JSON.stringify(unlocked)}
    </div>
  )
}
