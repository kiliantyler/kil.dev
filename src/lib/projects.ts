import dotfilesImage from '@/images/projects/dotfiles.jpg'
import kilDevImage from '@/images/projects/kil-dev.jpg'
import tiaxslaughterImage from '@/images/projects/tiaxslaughter.jpg'
import type { Project } from '@/types'

export const projects: Project[] = [
  {
    id: 'kil-dev',
    title: 'kil.dev',
    description: 'This site. Next.js, Tailwind, shadcn/ui, deployed on Vercel.',
    tags: ['Next', 'Tailwind', 'shadcn', 'TypeScript', 'React', 'Vercel'],
    href: '/#YouWereAlreadyHere',
    repo: 'https://github.com/kiliantyler/kil.dev',
    year: 2025,
    status: 'live',
    imageSrc: kilDevImage,
    imageAlt: 'kil.dev website thumbnail',
  },
  {
    id: 'tiaxslaughter',
    title: 'tiaxslaughter.com',
    description: 'A photography portfolio website for my sister.',
    tags: ['Next', 'Tailwind', 'shadcn'],
    href: 'https://tiaxslaughter.com',
    year: 2025,
    status: 'live',
    imageSrc: tiaxslaughterImage,
    imageAlt: 'tiaxslaughter.com website thumbnail',
  },
  {
    id: 'dotfiles',
    title: 'dotfiles.wiki',
    description: 'Dotfiles and a wiki for my macOS setup.',
    tags: [],
    href: 'https://dotfiles.wiki',
    repo: 'https://github.com/kiliantyler/dotfiles',
    year: 2023,
    status: 'wip',
    imageSrc: dotfilesImage,
    imageAlt: 'dotfiles website thumbnail',
  },
]
