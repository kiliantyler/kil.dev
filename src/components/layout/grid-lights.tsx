'use client'

import { LIGHT_GRID } from '@/lib/constants'
import { useEffect, useMemo, useRef, useState } from 'react'

type Point = { x: number, y: number }

const GRID_SIZE_PX = LIGHT_GRID.GRID_SIZE_PX
// Use CSS translate to center the dot; no need for half-subtraction math
const GRID_OFFSET_PX = LIGHT_GRID.GRID_OFFSET_PX

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min
  if (value > max) return max
  return value
}

function getContainerSize(el: HTMLElement | null): { width: number, height: number } {
  if (!el) return { width: window.innerWidth, height: window.innerHeight }
  const rect = el.getBoundingClientRect()
  return { width: Math.round(rect.width), height: Math.round(rect.height) }
}

// removed choose utility as orientation choice is now probability driven

function generateHorizontalPath(width: number, height: number): Point[] {
  const cols = Math.max(2, Math.floor(width / GRID_SIZE_PX))
  const rows = Math.max(2, Math.floor(height / GRID_SIZE_PX))
  const startSide: 'left' | 'right' = Math.random() < 0.5 ? 'left' : 'right'
  const yIndex = clamp(Math.floor(Math.random() * rows), 1, rows - 2)
  const baseY = yIndex * GRID_SIZE_PX

  let xIndex = startSide === 'left' ? 0 : cols
  const endXIndex = startSide === 'left' ? cols : 0
  const dir = startSide === 'left' ? 1 : -1

  const points: Point[] = [{ x: xIndex * GRID_SIZE_PX + (dir === 1 ? 0 : 0), y: baseY }]

  // Walk across columns; inject occasional vertical detours by exactly one grid step
  for (let c = 0; c < cols; c++) {
    // chance to take a vertical detour before moving horizontally
    if (Math.random() < LIGHT_GRID.DETOUR_PROBABILITY) {
      const up = Math.random() < 0.5
      const newYIndex = clamp(yIndex + (up ? -1 : 1), 1, rows - 2)
      const newY = newYIndex * GRID_SIZE_PX
      points.push({ x: xIndex * GRID_SIZE_PX, y: newY })
    }
    xIndex += dir
    const prev = points[points.length - 1]!
    points.push({ x: xIndex * GRID_SIZE_PX, y: prev.y })
  }

  // Ensure final point is exactly opposite side
  const lastH = points[points.length - 1]!
  points[points.length - 1] = { x: endXIndex * GRID_SIZE_PX, y: lastH.y }
  return points
}

function generateVerticalPath(width: number, height: number): Point[] {
  const cols = Math.max(2, Math.floor(width / GRID_SIZE_PX))
  const rows = Math.max(2, Math.floor(height / GRID_SIZE_PX))
  const startSide: 'top' | 'bottom' = Math.random() < 0.5 ? 'top' : 'bottom'
  const xIndex = clamp(Math.floor(Math.random() * cols), 1, cols - 2)
  const baseX = xIndex * GRID_SIZE_PX

  let yIndex = startSide === 'top' ? 0 : rows
  const endYIndex = startSide === 'top' ? rows : 0
  const dir = startSide === 'top' ? 1 : -1

  const points: Point[] = [{ x: baseX, y: yIndex * GRID_SIZE_PX }]

  for (let r = 0; r < rows; r++) {
    if (Math.random() < LIGHT_GRID.DETOUR_PROBABILITY) {
      const left = Math.random() < 0.5
      const newXIndex = clamp(xIndex + (left ? -1 : 1), 1, cols - 2)
      const newX = newXIndex * GRID_SIZE_PX
      points.push({ x: newX, y: yIndex * GRID_SIZE_PX })
    }
    yIndex += dir
    const prev = points[points.length - 1]!
    points.push({ x: prev.x, y: yIndex * GRID_SIZE_PX })
  }

  // Ensure final point is exactly opposite side
  const lastV = points[points.length - 1]!
  points[points.length - 1] = { x: lastV.x, y: endYIndex * GRID_SIZE_PX }
  return points
}

function buildKeyframes(name: string, points: Point[]): string {
  if (points.length < 2) return ''
  const steps = points.length - 1
  const pcPerStep = 100 / steps
  const lines: string[] = []
  for (let i = 0; i < points.length; i++) {
    const p = points[i]!
    const pc = Math.min(100, Math.round(i * pcPerStep * 1000) / 1000)
    // Keep opacity 0 only at the very start; fully visible until the very end at the edge
    if (i === 0) {
      lines.push(`${pc}% { left: ${p.x + GRID_OFFSET_PX}px; top: ${p.y + GRID_OFFSET_PX}px; opacity: 0 }`)
      const pcIn = Math.min(100, Math.round((i * pcPerStep + 0.5) * 1000) / 1000)
      lines.push(`${pcIn}% { left: ${p.x + GRID_OFFSET_PX}px; top: ${p.y + GRID_OFFSET_PX}px; opacity: 1 }`)
    } else if (i === points.length - 1) {
      const pcHold = Math.max(0, Math.min(100, Math.round((i * pcPerStep - 0.5) * 1000) / 1000))
      lines.push(`${pcHold}% { left: ${p.x + GRID_OFFSET_PX}px; top: ${p.y + GRID_OFFSET_PX}px; opacity: 1 }`)
      lines.push(`${pc}% { left: ${p.x + GRID_OFFSET_PX}px; top: ${p.y + GRID_OFFSET_PX}px; opacity: 0 }`)
    } else {
      lines.push(`${pc}% { left: ${p.x + GRID_OFFSET_PX}px; top: ${p.y + GRID_OFFSET_PX}px; opacity: 1 }`)
    }
  }
  return `@keyframes ${name} {\n${lines.join('\n')}\n}`
}

function createStyles(paths: Point[][]): string {
  const kf: string[] = []
  const rules: string[] = []
  const durationSeconds = LIGHT_GRID.DURATION_SECONDS
  // Evenly distribute phases across the full duration; fallback to computed stagger when constant is 0
  const staggerSeconds = LIGHT_GRID.STAGGER_SECONDS > 0
    ? LIGHT_GRID.STAGGER_SECONDS
    : durationSeconds / Math.max(1, paths.length)

  for (let i = 0; i < paths.length; i++) {
    const name = `gl_path_${i}`
    const path = paths[i]!
    kf.push(buildKeyframes(name, path))
    // Seed each light mid-cycle using negative delays so the screen is populated immediately.
    // Add slight jitter so edges don't align perfectly.
    const base = (i * staggerSeconds) % durationSeconds
    const jitter = ((Math.random() - 0.5) * 2) * (staggerSeconds * 0.15)
    const normalized = ((base + jitter) % durationSeconds + durationSeconds) % durationSeconds
    const delay = -normalized
    rules.push(`.gl-${i} { animation: ${name} ${durationSeconds}s linear infinite; animation-delay: ${delay}s; }`)
  }
  return `${kf.join('\n\n')}\n\n${rules.join('\n')}`
}

function GridLights() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [styleText, setStyleText] = useState<string>('')
  const numLights = LIGHT_GRID.NUM_LIGHTS

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  useEffect(() => {
    if (prefersReducedMotion) {
      setStyleText('')
      return
    }

    function regenerate() {
      const { width, height } = getContainerSize(containerRef.current)
      const paths: Point[][] = []
      for (let i = 0; i < numLights; i++) {
        const generator = Math.random() < LIGHT_GRID.HORIZONTAL_PROBABILITY
          ? generateHorizontalPath
          : generateVerticalPath
        paths.push(generator(width, height))
      }
      setStyleText(createStyles(paths))
    }

    regenerate()
    const handle = () => regenerate()
    window.addEventListener('resize', handle)
    return () => window.removeEventListener('resize', handle)
  }, [prefersReducedMotion, numLights])

  const dotClass = 'absolute rounded-full pointer-events-none'
  const near = LIGHT_GRID.GLOW_NEAR_PX
  const far = LIGHT_GRID.GLOW_FAR_PX
  const rgb = LIGHT_GRID.COLOR_RGB

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden" aria-hidden>
      {styleText ? <style>{styleText}</style> : null}
      {Array.from({ length: numLights }).map((_, i) => (
        <div
          key={i}
          className={`${dotClass} gl-${i}`}
          style={{
            width: `${LIGHT_GRID.DOT_SIZE_PX}px`,
            height: `${LIGHT_GRID.DOT_SIZE_PX}px`,
            transform: 'translate(-50%, -50%)',
            boxShadow: `0 0 ${near}px rgba(${rgb}, 0.7), 0 0 ${far}px rgba(${rgb}, 0.4)`,
            background: `radial-gradient(circle, rgba(${rgb}, 0.9) 0%, rgba(${rgb}, 0.5) 50%, transparent 100%)`,
          }}
          aria-hidden
        />
      ))}
    </div>
  )
}

export { GridLights }


