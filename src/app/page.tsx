import { HomeContent } from '@/components/layout/home/_content'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Kilian Tyler | Site Reliability Engineer',
}

export default function Homepage() {
  return <HomeContent />
}
