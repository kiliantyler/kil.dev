'use client'

import { SECRET_CONSOLE_COMMANDS, resolveSecretConsoleCommand } from '@/lib/secret-console-commands'
import { SECRET_CONSOLE_VFS } from '@/lib/secret-console-files'
import { SESSION_STORAGE_KEYS } from '@/lib/storage-keys'
import type { SecretConsoleEnv, VfsNode } from '@/types/secret-console'
import { computeTabCompletion } from '@/utils/console/completion'
import { normalizePath, vfsList, vfsRead, vfsResolve, vfsStat } from '@/utils/secret-console-vfs'
import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

type Entry = { type: 'in' | 'out'; text: string; cwd?: string }

function formatPrompt(cwd: string): string {
  return cwd.replace(/^\/home\/kil(?=\/|$)/, '~')
}

/**
 * Clear all console-related sessionStorage keys to recover from corrupted state
 */
function clearConsoleSessionStorage() {
  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEYS.CONSOLE_ENTRIES)
    sessionStorage.removeItem(SESSION_STORAGE_KEYS.CONSOLE_HISTORY)
    sessionStorage.removeItem(SESSION_STORAGE_KEYS.CONSOLE_CWD)
    sessionStorage.removeItem(SESSION_STORAGE_KEYS.CONSOLE_HEIGHT)
  } catch {
    // Ignore any errors during cleanup
  }
}

export function SecretConsole({ onRequestClose }: { onRequestClose: () => void }) {
  const router = useRouter()
  const rootVfs = useMemo<VfsNode>(() => SECRET_CONSOLE_VFS, [])

  // Initialize entries - load from sessionStorage or use MOTD
  const [entries, setEntries] = useState<Entry[]>(() => {
    if (globalThis.window === undefined) return []

    try {
      const saved = sessionStorage.getItem(SESSION_STORAGE_KEYS.CONSOLE_ENTRIES)
      if (saved) {
        return JSON.parse(saved) as Entry[]
      }
    } catch (error) {
      // Clean up corrupted console state to prevent repeated failures
      console.warn('Failed to parse console entries from sessionStorage, clearing console state:', error)
      clearConsoleSessionStorage()
    }

    // First time opening - show MOTD
    const motd = vfsRead(rootVfs, '/etc/motd')
    if (motd) {
      return [{ type: 'out', text: motd.trimEnd() }]
    }
    return []
  })

  // Initialize history from sessionStorage
  const [history, setHistory] = useState<string[]>(() => {
    if (globalThis.window === undefined) return []

    try {
      const saved = sessionStorage.getItem(SESSION_STORAGE_KEYS.CONSOLE_HISTORY)
      if (saved) {
        return JSON.parse(saved) as string[]
      }
    } catch (error) {
      // Clean up corrupted history state
      console.warn('Failed to parse console history from sessionStorage, clearing:', error)
      sessionStorage.removeItem(SESSION_STORAGE_KEYS.CONSOLE_HISTORY)
    }
    return []
  })

  // Initialize cwd from sessionStorage
  const [cwd, setCwd] = useState<string>(() => {
    if (globalThis.window === undefined) return '/home/kil'

    try {
      const saved = sessionStorage.getItem(SESSION_STORAGE_KEYS.CONSOLE_CWD)
      if (saved) {
        return saved
      }
    } catch (error) {
      // Clean up corrupted cwd state
      console.warn('Failed to read console cwd from sessionStorage, clearing:', error)
      sessionStorage.removeItem(SESSION_STORAGE_KEYS.CONSOLE_CWD)
    }
    return '/home/kil'
  })

  // Initialize console height from sessionStorage
  const [height, setHeight] = useState<number>(() => {
    if (globalThis.window === undefined) return 45

    try {
      const key = SESSION_STORAGE_KEYS.CONSOLE_HEIGHT as string
      const saved = sessionStorage.getItem(key)
      if (saved !== null) {
        const parsed = Number.parseFloat(saved)
        if (!Number.isNaN(parsed) && parsed >= 30 && parsed <= 95) {
          return parsed
        }
      }
    } catch (error) {
      // Clean up corrupted height state
      console.warn('Failed to parse console height from sessionStorage, clearing:', error)
      sessionStorage.removeItem(SESSION_STORAGE_KEYS.CONSOLE_HEIGHT)
    }
    return 45
  })

  const [input, setInput] = useState('')
  const [historyIndex, setHistoryIndex] = useState<number | null>(null)
  const [savedDraft, setSavedDraft] = useState<string>('')
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [isClosing, setIsClosing] = useState(false)
  const dragStartY = useRef<number>(0)
  const dragStartHeight = useRef<number>(0)

  const handleClose = useCallback(() => {
    if (isClosing) return
    setIsClosing(true)
    // If user prefers reduced motion, close immediately without waiting for transition
    try {
      const mq = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')
      if (mq?.matches) {
        onRequestClose()
      }
    } catch {}
  }, [isClosing, onRequestClose])

  const focusInput = useCallback(() => {
    inputRef.current?.focus()
  }, [])

  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      setIsDragging(true)
      dragStartY.current = e.clientY
      dragStartHeight.current = height
    },
    [height],
  )

  const handleDragMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return

      const deltaY = e.clientY - dragStartY.current
      const viewportHeight = globalThis.window.innerHeight
      const deltaVh = (deltaY / viewportHeight) * 100
      const newHeight = Math.max(30, Math.min(95, dragStartHeight.current + deltaVh))

      setHeight(newHeight)
    },
    [isDragging],
  )

  const handleDragEnd = useCallback(() => {
    setIsDragging(false)
  }, [])

  useEffect(() => {
    if (globalThis.window === undefined) return
    if (isDragging) {
      globalThis.addEventListener('mousemove', handleDragMove)
      globalThis.addEventListener('mouseup', handleDragEnd)
      return () => {
        globalThis.removeEventListener('mousemove', handleDragMove)
        globalThis.removeEventListener('mouseup', handleDragEnd)
      }
    }
  }, [isDragging, handleDragMove, handleDragEnd])

  useEffect(() => {
    inputRef.current?.focus()
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose()
    }
    globalThis.addEventListener('keydown', onKeyDown)
    // Ensure view starts at bottom on open
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
    return () => globalThis.removeEventListener('keydown', onKeyDown)
  }, [handleClose])

  // Auto-scroll to bottom when entries update
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [entries])

  // Listen for navigation events from the nav command
  useEffect(() => {
    function handleConsoleNavigate(event: Event) {
      const customEvent = event as CustomEvent<{ route: Route }>
      const { route } = customEvent.detail
      router.push(route)
    }

    globalThis.addEventListener('kd:console-navigate', handleConsoleNavigate)
    return () => globalThis.removeEventListener('kd:console-navigate', handleConsoleNavigate)
  }, [router])

  // Persist entries to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEYS.CONSOLE_ENTRIES, JSON.stringify(entries))
    } catch {
      // Ignore storage errors
    }
  }, [entries])

  // Persist history to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEYS.CONSOLE_HISTORY, JSON.stringify(history))
    } catch {
      // Ignore storage errors
    }
  }, [history])

  // Persist cwd to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEYS.CONSOLE_CWD, cwd)
    } catch {
      // Ignore storage errors
    }
  }, [cwd])

  // Persist height to sessionStorage
  useEffect(() => {
    try {
      const key = SESSION_STORAGE_KEYS.CONSOLE_HEIGHT as string
      sessionStorage.setItem(key, height.toString())
    } catch {
      // Ignore storage errors
    }
  }, [height])

  const appendOutput = useCallback((text: string) => {
    setEntries(prev => [...prev, { type: 'out', text }])
  }, [])

  const clearOutput = useCallback(() => {
    setEntries([])
  }, [])

  const env = useMemo<SecretConsoleEnv>(
    () => ({
      appendOutput,
      clearOutput,
      pwd: () => cwd,
      list: (path: string) =>
        vfsList(rootVfs, normalizePath(path.startsWith('/') || path.startsWith('~') ? path : `${cwd}/${path}`)),
      read: (path: string) =>
        vfsRead(rootVfs, normalizePath(path.startsWith('/') || path.startsWith('~') ? path : `${cwd}/${path}`)),
      stat: (path: string) =>
        vfsStat(rootVfs, normalizePath(path.startsWith('/') || path.startsWith('~') ? path : `${cwd}/${path}`)),
      chdir: (path: string) => {
        const abs = normalizePath(path.startsWith('/') || path.startsWith('~') ? path : `${cwd}/${path}`)
        const node = vfsResolve(rootVfs, abs)
        if (!node) return { ok: false as const, reason: 'not_found' as const }
        if (node.type !== 'dir') return { ok: false as const, reason: 'not_dir' as const }
        setCwd(abs)
        return { ok: true as const }
      },
      requestClose: handleClose,
    }),
    [appendOutput, clearOutput, cwd, rootVfs, handleClose],
  )

  const handleTabKey = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      e.preventDefault()
      const el = inputRef.current
      if (!el) return

      const res = computeTabCompletion(input, el.selectionStart ?? input.length, {
        commands: SECRET_CONSOLE_COMMANDS,
        resolveCommand: resolveSecretConsoleCommand,
        cwd,
        list: (path: string) => vfsList(rootVfs, path),
        normalizePath,
      })

      if (res.suggestions && res.suggestions.length > 0) {
        appendOutput(res.suggestions.join('  '))
        return
      }

      if (res.value !== input) {
        setInput(res.value)
        requestAnimationFrame(() => {
          inputRef.current?.setSelectionRange(res.caret, res.caret)
        })
      }
    },
    [appendOutput, cwd, input, rootVfs],
  )

  const handleArrowUpKey = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (history.length === 0) return
      e.preventDefault()

      if (historyIndex === null) {
        setSavedDraft(input)
        const idx = history.length - 1
        setHistoryIndex(idx)
        setInput(history[idx] ?? '')
        return
      }

      const idx = Math.max(0, historyIndex - 1)
      setHistoryIndex(idx)
      setInput(history[idx] ?? '')
    },
    [history, historyIndex, input],
  )

  const handleArrowDownKey = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (historyIndex === null) return
      e.preventDefault()

      const last = history.length - 1
      if (historyIndex < last) {
        const idx = historyIndex + 1
        setHistoryIndex(idx)
        setInput(history[idx] ?? '')
        return
      }

      setHistoryIndex(null)
      setInput(savedDraft ?? '')
      setSavedDraft('')
    },
    [history, historyIndex, savedDraft],
  )

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      switch (e.key) {
        case 'Tab':
          handleTabKey(e)
          break
        case 'ArrowUp':
          handleArrowUpKey(e)
          break
        case 'ArrowDown':
          handleArrowDownKey(e)
          break
      }
    },
    [handleTabKey, handleArrowUpKey, handleArrowDownKey],
  )

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      const trimmed = input.trim()
      if (!trimmed) return
      setEntries(prev => [...prev, { type: 'in', text: trimmed, cwd }])

      const tokens = trimmed.split(/\s+/)
      const cmd = tokens[0] ?? ''
      const args = tokens.slice(1)
      const resolved = resolveSecretConsoleCommand(cmd)
      if (resolved) {
        const command = SECRET_CONSOLE_COMMANDS[resolved]
        command?.execute(args, env)
      } else {
        appendOutput(`command not found: ${cmd}`)
      }

      setInput('')
      setHistory(prev => {
        const next = [...prev, trimmed]
        return next.length > 50 ? next.slice(-50) : next
      })
      setHistoryIndex(null)
      setSavedDraft('')
    },
    [input, env, appendOutput, cwd],
  )

  return (
    <dialog
      open
      aria-label="Developer console"
      className="fixed top-0 right-0 left-0 z-50 m-0 w-full max-w-none border-0 bg-transparent p-0 outline-hidden"
      style={{ fontFamily: 'var(--font-vt323)' }}>
      <div
        onMouseDown={e => {
          // Don't focus input if clicking the resize handle
          if ((e.target as HTMLElement).closest('[data-resize-handle]')) return
          focusInput()
        }}
        onClick={e => {
          if ((e.target as HTMLElement).closest('[data-resize-handle]')) return
          focusInput()
        }}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            if ((e.target as HTMLElement).closest('[data-resize-handle]')) return
            focusInput()
          }
        }}
        onTransitionEnd={e => {
          if (isClosing && e.target === e.currentTarget) onRequestClose()
        }}
        className={`${isClosing ? 'translate-y-[-100%]' : 'translate-y-0'} mx-2 overflow-hidden rounded-b-xl border-x border-b border-green-500/30 bg-black/80 text-green-400 shadow-sm backdrop-blur-sm transition-transform duration-300 ease-out sm:mx-4 starting:translate-y-[-100%]`}
        style={{ height: `${height}vh` }}>
        <div
          ref={scrollRef}
          className="flex no-scrollbar flex-col justify-end gap-1 overflow-y-auto p-4"
          style={{ height: `calc(${height}vh - 4rem)` }}>
          {entries.map((e, i) => (
            <div key={i} className={e.type === 'in' ? 'text-green-300' : 'whitespace-pre-wrap text-green-400'}>
              {e.type === 'in' ? `${formatPrompt(e.cwd ?? '/home/kil')} $ ${e.text}` : e.text}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex h-12 items-center gap-2 border-t border-green-500/20 px-4">
          <span aria-hidden className="text-green-300">
            {formatPrompt(cwd)} $
          </span>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleInputKeyDown}
            className="flex-1 bg-transparent text-green-400 outline-hidden placeholder:text-green-700"
            aria-label="Console input"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
          />
        </form>

        {/* Resize handle */}
        <div
          data-resize-handle
          onMouseDown={handleDragStart}
          className="group flex h-4 cursor-ns-resize items-center justify-center border-t border-green-500/20 transition-colors hover:bg-green-500/10"
          aria-label="Resize console">
          <div className="h-1 w-12 rounded-full bg-green-500/30 transition-colors group-hover:bg-green-500/50" />
        </div>
      </div>
    </dialog>
  )
}
