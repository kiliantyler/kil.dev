'use client'

import { FlippingCard } from '@/components/ui/flipping-card'
import { captureProjectCardFlipped } from '@/hooks/posthog'
import type { Project } from '@/types/projects'
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
      backgroundImageSrc={project.imageSrc}
      backgroundImageAlt={project.imageAlt}
      backgroundSizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      front={<ProjectCardFront title={project.title} />}
      back={<ProjectCardBack project={project} />}
      flipLabelFrontDesktop={'Learn more'}
      flipLabelFrontMobile={'Tap to learn more'}
      flipLabelBackDesktop={'Go back'}
      flipLabelBackMobile={'Tap to go back'}
    />
  )
}
