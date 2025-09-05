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
} as const

export type SkillName = keyof typeof SKILLS
export type SkillIconKey = (typeof SKILLS)[SkillName]['icon']

export function getSkillIconUrl(iconKey: string): string {
  return `https://skills.syvixor.com/api/icons?i=${encodeURIComponent(iconKey)}`
}
