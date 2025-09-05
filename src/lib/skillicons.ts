export const SKILL_ICON_MAP = {
  Next: 'nextjs',
  Tailwind: 'tailwind',
  shadcn: 'shadcnui',
  TypeScript: 'ts',
  JavaScript: 'js',
  React: 'react',
  Vercel: 'vercel',
} as const

export type SkillName = keyof typeof SKILL_ICON_MAP
export type SkillIconKey = (typeof SKILL_ICON_MAP)[SkillName]

export function getSkillIconUrl(iconKey: string): string {
  return `https://skills.syvixor.com/api/icons?i=${encodeURIComponent(iconKey)}`
}
