'use client'

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { SkillName } from '@/lib/skillicons'
import { SKILLS, getSkillIconUrl } from '@/lib/skillicons'
import Image from 'next/image'

interface ProjectTechIconsProps {
  tags: SkillName[]
}

function ProjectTechIcons({ tags }: ProjectTechIconsProps) {
  if (!tags?.length) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      {tags.map(tag => {
        const skill = SKILLS[tag]
        if (!skill) {
          return (
            <span key={tag} className="bg-transparent text-secondary-foreground rounded-md px-2 py-1 text-xs">
              {tag}
            </span>
          )
        }

        return (
          <Tooltip key={tag}>
            <TooltipTrigger asChild>
              {(() => {
                const homepage = skill.url
                const content = (
                  <span role="img" aria-label={tag} className="inline-flex items-center justify-center">
                    <Image
                      unoptimized
                      src={getSkillIconUrl(skill.icon)}
                      alt={tag}
                      width={28}
                      height={28}
                      className="object-contain rounded-md ring-1 ring-border"
                      loading="lazy"
                    />
                  </span>
                )

                if (!homepage) return content

                return (
                  <a
                    href={homepage}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Open ${tag} homepage`}
                    onClick={e => {
                      e.stopPropagation()
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.stopPropagation()
                      }
                    }}
                    className="inline-flex items-center justify-center focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary rounded-md">
                    {content}
                  </a>
                )
              })()}
            </TooltipTrigger>
            <TooltipContent>{tag}</TooltipContent>
          </Tooltip>
        )
      })}
    </div>
  )
}

export { ProjectTechIcons }
