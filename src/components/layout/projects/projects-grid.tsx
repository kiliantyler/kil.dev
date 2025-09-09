import type { Project } from '@/lib/projects'
import { ProjectCard } from './project-card/_content'

export function ProjectsGrid({ items }: { items: Project[] }) {
  if (!items || items.length === 0) {
    return (
      <div className="text-muted-foreground mx-auto max-w-xl text-center">
        <p>No projects yet. Check back soon.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
      {items.map(project => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  )
}
