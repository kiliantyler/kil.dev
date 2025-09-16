import type { SkillName } from '@/lib/skillicons'
import type { Route } from 'next'
import type { StaticImageData } from 'next/image'

export interface Project {
  id: string
  title: string
  description: string
  tags: SkillName[]
  href?: Route
  repo?: Route
  year?: number
  status?: 'live' | 'wip' | 'archived'
  imageSrc: StaticImageData
  imageAlt: string
}
