'use client'

import { GitHubIcon } from '@/components/icons/github'
import { ProjectFlipIndicator } from '@/components/projects/project-flip-indicator'
import { ProjectTechIcons } from '@/components/projects/project-tech-icons'
import { Card } from '@/components/ui/card'
import { LinkButton } from '@/components/ui/link-button'
import type { Project } from '@/types'
import posthog from 'posthog-js'

interface ProjectCardBackProps {
  project: Project
}

function ProjectCardBack({ project }: ProjectCardBackProps) {
  const hasLinks = Boolean(project.href ?? project.repo)

  return (
    <Card className="absolute inset-0 p-6 [backface-visibility:hidden] rotate-y-180 transition-shadow group-hover:shadow-md group-hover:ring-2 group-hover:ring-primary group-hover:ring-offset-2 group-hover:ring-offset-background">
      <ProjectFlipIndicator />
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
              {project.href ? (
                <LinkButton
                  href={project.href}
                  external={project.href.startsWith('http')}
                  className="h-9 rounded-md px-3 text-xs font-semibold"
                  aria-label={`Open ${project.title} website`}
                  onClick={e => {
                    e.stopPropagation()
                    posthog.capture('project_visit_clicked', {
                      projectId: project.id,
                      href: project.href,
                    })
                  }}>
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
                  onClick={e => {
                    e.stopPropagation()
                    posthog.capture('project_source_clicked', {
                      projectId: project.id,
                      repo: project.repo,
                    })
                  }}>
                  <GitHubIcon />
                </LinkButton>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  )
}

export { ProjectCardBack }
