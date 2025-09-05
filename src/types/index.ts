import type { SkillName } from '@/lib/skillicons'
import type { StaticImageData } from 'next/image'

export interface NavigationItem {
  label: string
  href: string
}

export interface ExternalLink {
  GITHUB: string
  LINKEDIN: string
}

export interface Content {
  NAME: string
  TITLE: string
  DESCRIPTION: string
  COPYRIGHT: string
}

export interface Images {
  AVATAR: string
  HEADSHOT: string
}

export interface SocialLinkProps {
  href: string
  label: string
  external?: boolean
}

export interface LinkButtonProps {
  href: string
  external?: boolean
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

export interface Project {
  id: string
  title: string
  description: string
  tags: SkillName[]
  href?: string
  repo?: string
  year?: number
  status?: 'live' | 'wip' | 'archived'
  imageSrc: StaticImageData
  imageAlt: string
}
