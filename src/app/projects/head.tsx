import { projects } from '@/lib/projects'

export default function Head() {
  return (
    <>
      {projects.map(project => (
        <link key={project.id} rel="preload" as="image" href={project.imageSrc.src} />
      ))}
    </>
  )
}
