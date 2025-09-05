'use client'

import { Card } from '@/components/ui/card'
import { LinkButton } from '@/components/ui/link-button'
import type { Project } from '@/types'
import Image from 'next/image'
import { useCallback, useState } from 'react'

interface ProjectCardProps {
  project: Project
}

function ProjectCard({ project }: ProjectCardProps) {
  const [flipped, setFlipped] = useState(false)

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

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={flipped}
      aria-label={`Toggle details for ${project.title}`}
      onClick={handleToggle}
      onKeyDown={handleKeyDown}
      className="relative h-full min-h-[360px] w-full cursor-pointer select-none outline-hidden [perspective:1200px] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary">
      <div
        className={
          'relative h-full w-full [transform-style:preserve-3d] transition-transform duration-500 ease-out ' +
          (flipped ? 'rotate-y-180' : '')
        }>
        {/* Front (Card face) */}
        <Card className="absolute inset-0 overflow-hidden p-0 gap-0 [backface-visibility:hidden]">
          <Image
            src={project.imageSrc}
            alt={project.imageAlt}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority={false}
          />
          <div className="absolute inset-x-0 bottom-0 p-3">
            <span className="bg-black/60 text-white rounded-md px-2 py-1 text-xs font-semibold md:text-sm max-w-[85%] truncate">
              {project.title}
            </span>
          </div>
        </Card>

        {/* Back (Card face) */}
        <Card className="absolute inset-0 p-6 [backface-visibility:hidden] rotate-y-180">
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
  )
}

export { ProjectCard }
