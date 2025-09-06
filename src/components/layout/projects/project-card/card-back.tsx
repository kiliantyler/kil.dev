'use client'

import { Card } from '@/components/ui/card'
import type { Project } from '@/types'
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
    <Card className="absolute inset-0 p-6 [backface-visibility:hidden] transition-shadow group-hover:shadow-md group-hover:ring-2 group-hover:ring-primary group-hover:ring-offset-2 group-hover:ring-offset-background">
      <div className="flex h-full flex-col">
        <div className="mb-3 text-sm text-muted-foreground">
          {project.year ? `${project.year} • ` : ''}
          {project.status === 'wip' ? 'Work in progress' : project.status === 'archived' ? 'Archived' : 'Live'}
        </div>
        <p className="text-sm leading-relaxed">{project.description}</p>
        <div className="mt-auto flex items-center justify-between pt-6">
          {project.tags?.length ? <ProjectTechIcons tags={project.tags} /> : <span />}
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
