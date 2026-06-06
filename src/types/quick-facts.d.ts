import type { Route } from 'next'

export interface QuickFact {
  id: string
  label: string
  value: string
  href?: Route
  note?: string
}
