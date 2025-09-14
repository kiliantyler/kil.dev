'use client'

import { Card } from '@/components/ui/card'

interface ProjectCardFrontProps {
  title: string
}

export function ProjectCardFront({ title }: ProjectCardFrontProps) {
  return (
    <Card className="absolute inset-0 overflow-hidden p-0 gap-0 bg-transparent [backface-visibility:hidden] transition-shadow group-hover:shadow-md group-hover:ring-2 group-hover:ring-primary group-hover:ring-offset-2 group-hover:ring-offset-background">
      <div className="absolute inset-x-0 bottom-0 p-3">
        <span className="bg-black/60 text-white rounded-md px-2 py-1 text-xs font-semibold md:text-sm max-w-[85%] truncate">
          {title}
        </span>
      </div>
    </Card>
  )
}
