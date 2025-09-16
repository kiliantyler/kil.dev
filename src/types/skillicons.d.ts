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
