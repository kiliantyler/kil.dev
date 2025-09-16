import type { SkillEntry, SkillName } from '@/lib/skillicons'
import { SKILLS } from '@/lib/skillicons'
import type { DashboardIconFormat, SkillIconRef } from '@/types/skillicons'

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

export function resolveSkills(names: SkillName[]): SkillEntry[] {
  return names.map(name => ({ name, ...SKILLS[name] }))
}
