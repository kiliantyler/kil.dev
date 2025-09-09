import type { Route } from 'next'

export type DashboardIconFormat = 'webp' | 'svg' | 'png'

export type SkillIconRef =
  | string
  | {
      source: 'dashboardicons'
      name: string
      format?: DashboardIconFormat
    }

export type SkillInfo = {
  icon: SkillIconRef
  url: Route
}

export const SKILLS = {
  Next: { icon: 'nextjs', url: 'https://nextjs.org' },
  Tailwind: { icon: 'tailwind', url: 'https://tailwindcss.com' },
  shadcn: { icon: 'shadcnui', url: 'https://ui.shadcn.com' },
  TypeScript: { icon: 'ts', url: 'https://www.typescriptlang.org' },
  JavaScript: { icon: 'js', url: 'https://developer.mozilla.org/docs/Web/JavaScript' },
  React: { icon: 'react', url: 'https://react.dev' },
  Vercel: { icon: 'vercel', url: 'https://vercel.com' },
  Astro: { icon: 'astro', url: 'https://astro.build' },
  Markdown: { icon: 'markdown', url: 'https://daringfireball.net/projects/markdown/' },
  Kubernetes: { icon: 'kubernetes', url: 'https://kubernetes.io' },
  Drizzle: { icon: 'drizzle', url: 'https://orm.drizzle.team' },
  'GitHub Pages': { icon: 'githubpages', url: 'https://docs.github.com/en/pages' },
  FluxCD: { icon: { source: 'dashboardicons', name: 'flux-cd', format: 'webp' }, url: 'https://fluxcd.io' },
  Talos: { icon: { source: 'dashboardicons', name: 'talos', format: 'webp' }, url: 'https://talos.dev' },
  '1Password': { icon: { source: 'dashboardicons', name: '1password', format: 'webp' }, url: 'https://1password.com' },
} as const satisfies Record<string, SkillInfo>

export type SkillName = keyof typeof SKILLS
export type SkillIconKey = (typeof SKILLS)[SkillName]['icon']

export function getSkillIconUrl(icon: SkillIconRef): string {
  if (typeof icon === 'string') {
    return `/api/image/skills/${encodeURIComponent(icon)}`
  }

  if (icon.source === 'dashboardicons') {
    const format: DashboardIconFormat = icon.format ?? 'webp'
    const name = icon.name
    return `/api/image/dbi/${encodeURIComponent(format)}/${encodeURIComponent(name)}.${format}`
  }

  // Fallback to syvixor if an unexpected value slips through
  return `/api/image/skills/`
}

// Fully resolved skill entry with its name and info
export type SkillEntry = { name: SkillName } & SkillInfo

export function resolveSkills(names: SkillName[]): SkillEntry[] {
  return names.map(name => ({ name, ...SKILLS[name] }))
}
