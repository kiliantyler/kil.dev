'use client'

import { FlippingCard } from '@/components/ui/flipping-card'
import { captureProjectCardFlipped } from '@/hooks/posthog'
import type { Project } from '@/types'
import { useCallback } from 'react'
import { ProjectCardBack } from './card-back'
import { ProjectCardFront } from './card-front'

interface ProjectCardProps {
  project: Project
}

export function ProjectCard({ project }: ProjectCardProps) {
  const handleFlipChange = useCallback(
    (flipped: boolean) => {
      captureProjectCardFlipped(project.id, flipped ? 'back' : 'front')
    },
    [project.id],
  )

  return (
    <FlippingCard
      ariaLabel={`Toggle details for ${project.title}`}
      onFlipChange={handleFlipChange}
      front={<ProjectCardFront imageSrc={project.imageSrc} imageAlt={project.imageAlt} title={project.title} />}
      back={<ProjectCardBack project={project} />}
    />
  )
}
