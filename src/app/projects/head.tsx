import { projects } from '@/lib/projects'

export default function Head() {
  return (
    <>
      {projects.slice(0, 9).map(project => (
        <link key={project.id} rel="preload" as="image" href={project.imageSrc.src} />
      ))}
    </>
  )
}
