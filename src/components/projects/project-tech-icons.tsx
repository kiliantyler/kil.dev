'use client'

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { SKILL_ICON_MAP, getSkillIconUrl } from '@/lib/skillicons'
import Image from 'next/image'

interface ProjectTechIconsProps {
  tags: string[]
}

function ProjectTechIcons({ tags }: ProjectTechIconsProps) {
  if (!tags?.length) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      {tags.map(tag => {
        const iconKey = SKILL_ICON_MAP[tag]
        if (!iconKey) {
          return (
            <span key={tag} className="bg-transparent text-secondary-foreground rounded-md px-2 py-1 text-xs">
              {tag}
            </span>
          )
        }

        return (
          <Tooltip key={tag}>
            <TooltipTrigger asChild>
              <span role="img" aria-label={tag} className="inline-flex items-center justify-center">
                <Image
                  unoptimized
                  src={getSkillIconUrl(iconKey)}
                  alt={tag}
                  width={28}
                  height={28}
                  className="object-contain rounded-md ring-1 ring-border"
                  loading="lazy"
                />
              </span>
            </TooltipTrigger>
            <TooltipContent>{tag}</TooltipContent>
          </Tooltip>
        )
      })}
    </div>
  )
}

export { ProjectTechIcons }
