import { SectionLabel } from '@/components/ui/section-label'
import { projects } from '@/lib/projects'
import { ProjectsGrid } from './projects-grid'

export function ProjectsContent() {
  return (
    <div className="px-10 py-16 md:px-20 lg:px-40">
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
    </div>
  )
}
