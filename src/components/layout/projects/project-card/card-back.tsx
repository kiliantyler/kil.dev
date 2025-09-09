'use client'

import { Card } from '@/components/ui/card'
import type { Project } from '@/lib/projects'
import { resolveSkills } from '@/lib/skillicons'
import Image from 'next/image'
import { RepoButton } from './repo-button'
import { ProjectTechIcons } from './tech-icons'
import { VisitButton } from './visit-button'

interface ProjectCardBackProps {
  project: Project
}

export function ProjectCardBack({ project }: ProjectCardBackProps) {
  const hasLinks = Boolean(project.href ?? project.repo)
  const repoButton = project.repo ? <RepoButton repo={project.repo} title={project.title} id={project.id} /> : null
  const visitButton = project.href ? <VisitButton href={project.href} title={project.title} id={project.id} /> : null

  return (
    <Card className="absolute inset-0 overflow-hidden p-6 [backface-visibility:hidden] transition-shadow bg-transparent group-hover:shadow-md group-hover:ring-2 group-hover:ring-primary group-hover:ring-offset-2 group-hover:ring-offset-background">
      {/* Background image blur layer */}
      <div aria-hidden className="absolute inset-0">
        <div className="relative h-full w-full">
          <Image
            src={project.imageSrc}
            alt=""
            fill
            priority={false}
            className="object-cover scale-110 scale-x-[-1] blur-xl"
          />
          <div className="absolute inset-0 bg-white/60 dark:bg-black/50 backdrop-blur-md" />
        </div>
      </div>

      <div className="relative z-10 flex h-full flex-col">
        <div className="mb-3 text-sm text-muted-foreground font-bold card-back-shadow">
          {project.year ? `${project.year} • ` : ''}
          {project.status === 'wip' ? 'Work in progress' : project.status === 'archived' ? 'Archived' : 'Live'}
        </div>
        <p className="text-sm leading-relaxed card-back-shadow">{project.description}</p>
        <div className="mt-auto flex items-center justify-between pt-6 card-back-shadow">
          {project.tags?.length ? <ProjectTechIcons skills={resolveSkills(project.tags)} /> : <span />}
          {hasLinks ? (
            <div className="flex justify-end gap-2">
              {visitButton}
              {repoButton}
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  )
}
