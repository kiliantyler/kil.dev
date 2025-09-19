import type { StaticImageData } from 'next/image'
import type { ComponentType } from 'react'

export type BaseColor = 'light' | 'dark'
export type MonthDay = { month: number; day: number }
export type IconComponent = ComponentType<{ className?: string }>

export type ThemeConfig = {
  name: string
  icon: IconComponent
  headshotImage: StaticImageData
  baseColor: BaseColor
  darkModeNote?: string
  timeRange?: { start: MonthDay; end: MonthDay }
  disableGridLights?: boolean
  enableSnow?: boolean
}
