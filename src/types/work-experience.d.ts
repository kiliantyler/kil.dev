import type { SkillName } from '@/lib/skillicons'
import type { Route } from 'next'
import type { StaticImageData } from 'next/image'

export interface WorkExperience {
  id: string
  role: string
  company: string
  workLocation: {
    location: string
    latitude?: number
    longitude?: number
  }
  officeLocation: {
    location: string
    latitude: number
    longitude: number
  }
  from: string
  to?: string
  summary: string
  highlights?: string[]
  skills?: SkillName[]
  companyUrl?: Route
  companyLogoSrc?: StaticImageData
  companyLogoAlt?: string
}

export interface SkillCategory {
  id: 'craft' | 'data' | 'platforms' | 'toolbox'
  label: string
  items: SkillName[]
}
