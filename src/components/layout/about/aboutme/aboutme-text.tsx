import { SectionLabel } from '@/components/ui/section-label'

export function AboutMeText() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 text-center lg:text-left">
        <SectionLabel>Hi, I&apos;m Kilian</SectionLabel>
      </div>
      <div className="text-muted-foreground text-base leading-relaxed md:text-lg">
        <p className="mb-4">
          I&apos;m a Senior Site Reliability Engineer. I build reliable, scalable platforms and smooth developer
          experiences for teams shipping to the cloud.
        </p>
        <p className="mb-4">
          I work with infrastructure as code, streamlined CI/CD, and practical observability to keep systems healthy and
          fast. I value automation, clear feedback loops, and resilient architectures. Lately I&apos;ve been exploring
          modern frontend with React and Next.js to round out the stack.
        </p>
        <p>
          When I&apos;m not shipping, I&apos;m tinkering in the homelab, refining dotfiles, contributing to open source,
          or hanging out with my pets.
        </p>
      </div>
    </div>
  )
}
