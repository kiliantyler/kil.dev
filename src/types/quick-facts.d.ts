import type { Route } from 'next'

export interface QuickFact {
  label: string
  value: string | React.ReactNode
  href?: Route
  note?: string
}
