import dotfilesImage from '@/images/projects/dotfiles.webp'
import kilDevImage from '@/images/projects/kil-dev.webp'
import kubernetesImage from '@/images/projects/kubernetes.webp'
import questnestImage from '@/images/projects/questnest.webp'
import tiaxslaughterImage from '@/images/projects/tiaxslaughter.webp'
import type { Project } from '@/types/projects'

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
    tags: ['Next', 'Tailwind', 'shadcn', 'TypeScript', 'React', 'Vercel'],
    href: 'https://tiaxslaughter.com',
    year: 2025,
    status: 'live',
    imageSrc: tiaxslaughterImage,
    imageAlt: 'tiaxslaughter.com website thumbnail',
  },
  {
    id: 'dotfiles',
    title: 'dotfiles.wiki',
    description: 'Dotfiles and a wiki for my macOS setup. Hosted on GitHub Pages.',
    tags: ['Astro', 'TypeScript', 'Markdown', 'GitHub Pages'],
    href: 'https://dotfiles.wiki',
    repo: 'https://github.com/kiliantyler/dotfiles',
    year: 2023,
    status: 'wip',
    imageSrc: dotfilesImage,
    imageAlt: 'dotfiles website thumbnail',
  },
  {
    id: 'kubernetes',
    title: 'Home Kubernetes Cluster',
    description: 'A Kubernetes cluster for my home. Large server rack in my basement.',
    tags: [
      'Kubernetes',
      'FluxCD',
      'Talos',
      '1Password',
    ],
    repo: 'https://github.com/shamubernetes/home-k8s',
    year: 2021,
    status: 'live',
    imageSrc: kubernetesImage,
    imageAlt: 'kubernetes website thumbnail',
  },
  {
    id: 'questnest',
    title: 'Questnest',
    description: 'A web app for managing chores through gamification. Very WIP.',
    tags: ['Next', 'Tailwind', 'shadcn', 'TypeScript', 'Drizzle', 'React', 'Vercel'],
    year: 2025,
    status: 'wip',
    imageSrc: questnestImage,
    imageAlt: 'questnest website thumbnail',
  },
]
