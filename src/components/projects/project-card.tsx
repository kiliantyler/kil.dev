'use client'

import { Card } from '@/components/ui/card'
import { LinkButton } from '@/components/ui/link-button'
import type { Project } from '@/types'
import Image from 'next/image'
import { useCallback, useRef, useState } from 'react'

interface ProjectCardProps {
  project: Project
}

function ProjectCard({ project }: ProjectCardProps) {
  const [flipped, setFlipped] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const frameRequestRef = useRef<number | null>(null)
  const pendingPointer = useRef<{ x: number; y: number } | null>(null)
  const tiltRef = useRef<HTMLDivElement | null>(null)

  const handleToggle = useCallback(() => {
    setFlipped(prev => !prev)
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setFlipped(prev => !prev)
    }
  }, [])

  const hasLinks = Boolean(project.href ?? project.repo)

  const applyTiltTransform = useCallback((x: number, y: number) => {
    const tiltEl = tiltRef.current
    const containerEl = containerRef.current
    if (!tiltEl || !containerEl) return

    const rect = containerEl.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    const percentX = (x - centerX) / (rect.width / 2)
    const percentY = (y - centerY) / (rect.height / 2)

    const clampedX = Math.max(-1, Math.min(1, percentX))
    const clampedY = Math.max(-1, Math.min(1, percentY))

    const maxTilt = 10 // degrees
    const rotateY = clampedX * maxTilt
    const rotateX = -clampedY * maxTilt

    tiltEl.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`
  }, [])

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.pointerType !== 'mouse') return
      pendingPointer.current = { x: e.clientX, y: e.clientY }
      if (frameRequestRef.current != null) return
      frameRequestRef.current = window.requestAnimationFrame(() => {
        frameRequestRef.current = null
        const point = pendingPointer.current
        if (!point) return
        applyTiltTransform(point.x, point.y)
      })
    },
    [applyTiltTransform],
  )

  const handlePointerLeave = useCallback(() => {
    const tiltEl = tiltRef.current
    if (!tiltEl) return
    pendingPointer.current = null
    if (frameRequestRef.current != null) {
      cancelAnimationFrame(frameRequestRef.current)
      frameRequestRef.current = null
    }
    tiltEl.style.transform = ''
  }, [])

  return (
    <div
      ref={containerRef}
      role="button"
      tabIndex={0}
      aria-pressed={flipped}
      aria-label={`Toggle details for ${project.title}`}
      onClick={handleToggle}
      onKeyDown={handleKeyDown}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className="group relative w-full aspect-[16/10] cursor-pointer select-none outline-hidden [perspective:1200px] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary">
      <div ref={tiltRef} className="relative h-full w-full will-change-transform">
        <div
          className={
            'relative h-full w-full [transform-style:preserve-3d] transition-transform duration-500 ease-out ' +
            (flipped ? 'rotate-y-180' : '')
          }>
          {/* Front (Card face) */}
          <Card className="absolute inset-0 overflow-hidden p-0 gap-0 [backface-visibility:hidden] transition-shadow group-hover:shadow-md group-hover:ring-2 group-hover:ring-primary group-hover:ring-offset-2 group-hover:ring-offset-background">
            <Image
              src={project.imageSrc}
              alt={project.imageAlt}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              priority={false}
            />
            {/* Flip indicator (front) */}
            <div
              aria-hidden
              className="pointer-events-none absolute right-2 top-2 inline-flex items-center gap-1 rounded-md bg-background/70 px-2 py-1 text-[10px] font-medium text-foreground/80 ring-1 ring-border opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 md:text-xs">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="opacity-80">
                <path
                  d="M12 6v3l4-4-4-4v3C7.58 4 4 7.58 4 12c0 1.85.63 3.55 1.68 4.9l1.47-1.47A5.98 5.98 0 0 1 6 12c0-3.31 2.69-6 6-6Zm7.32-4.9-1.47 1.47A5.98 5.98 0 0 1 18 12c0 3.31-2.69 6-6 6v-3l-4 4 4 4v-3c4.42 0 8-3.58 8-8 0-1.85-.63-3.55-1.68-4.9Z"
                  fill="currentColor"
                />
              </svg>
              <span>Flip</span>
            </div>
            <div className="absolute inset-x-0 bottom-0 p-3">
              <span className="bg-black/60 text-white rounded-md px-2 py-1 text-xs font-semibold md:text-sm max-w-[85%] truncate">
                {project.title}
              </span>
            </div>
          </Card>

          {/* Back (Card face) */}
          <Card className="absolute inset-0 p-6 [backface-visibility:hidden] rotate-y-180 transition-shadow group-hover:shadow-md group-hover:ring-2 group-hover:ring-primary group-hover:ring-offset-2 group-hover:ring-offset-background">
            {/* Flip indicator (back) */}
            <div
              aria-hidden
              className="pointer-events-none absolute right-2 top-2 inline-flex items-center gap-1 rounded-md bg-background/70 px-2 py-1 text-[10px] font-medium text-foreground/80 ring-1 ring-border opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 md:text-xs">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="opacity-80">
                <path
                  d="M12 6v3l4-4-4-4v3C7.58 4 4 7.58 4 12c0 1.85.63 3.55 1.68 4.9l1.47-1.47A5.98 5.98 0 0 1 6 12c0-3.31 2.69-6 6-6Zm7.32-4.9-1.47 1.47A5.98 5.98 0 0 1 18 12c0 3.31-2.69 6-6 6v-3l-4 4 4 4v-3c4.42 0 8-3.58 8-8 0-1.85-.63-3.55-1.68-4.9Z"
                  fill="currentColor"
                />
              </svg>
              <span>Flip</span>
            </div>
            <div className="flex h-full flex-col">
              <div className="mb-3 text-sm text-muted-foreground">
                {project.year ? `${project.year} • ` : ''}
                {project.status === 'wip' ? 'Work in progress' : project.status === 'archived' ? 'Archived' : 'Live'}
              </div>
              <p className="text-sm leading-relaxed">{project.description}</p>
              {project.tags?.length ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {project.tags.map(tag => (
                    <span key={tag} className="bg-secondary text-secondary-foreground rounded-md px-2 py-1 text-xs">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
              {hasLinks ? (
                <div className="mt-auto flex justify-end gap-2 pt-6">
                  {project.href ? (
                    <LinkButton
                      href={project.href}
                      className="h-9 rounded-md px-3 text-xs font-semibold"
                      aria-label={`Open ${project.title} website`}
                      onClick={e => e.stopPropagation()}>
                      Visit
                    </LinkButton>
                  ) : null}
                  {project.repo ? (
                    <LinkButton
                      href={project.repo}
                      external
                      variant="secondary"
                      className="h-9 rounded-md px-3 text-xs font-semibold"
                      aria-label={`Open ${project.title} repository on GitHub`}
                      onClick={e => e.stopPropagation()}>
                      Source
                    </LinkButton>
                  ) : null}
                </div>
              ) : null}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

export { ProjectCard }
