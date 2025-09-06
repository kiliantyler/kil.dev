import { SectionLabel } from '@/components/ui/section-label'
import { projects } from '@/lib/projects'
import type { Project } from '@/types'
import { Background } from '../background'
import { Footer } from '../footer'
import { Header } from '../header'
import { ProjectCard } from './project-card'

function ProjectsGrid({ items }: { items: Project[] }) {
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

export function ProjectsContent() {
  return (
    <div className="bg-background text-foreground relative flex min-h-screen flex-col">
      <Background />
      <div className="relative z-20 flex size-full flex-1 flex-col overflow-x-hidden">
        <div className="layout-container flex h-full flex-1 flex-col">
          <Header />
          <main className="px-10 py-16 md:px-20 lg:px-40">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
              <div className="flex flex-col gap-2">
                <SectionLabel as="p">Projects</SectionLabel>
                <h1 className="text-4xl leading-tight font-black tracking-tight md:text-5xl">Projects</h1>
                <p className="text-muted-foreground max-w-2xl">
                  A selection of websites and other projects I have worked on.
                </p>
              </div>
              <ProjectsGrid items={projects} />
            </div>
          </main>
          <Footer />
        </div>
      </div>
    </div>
  )
}
