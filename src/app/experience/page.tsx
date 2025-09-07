import { ExperienceContent } from '@/components/layout/experience/_content'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Experience | Kilian Tyler',
  description: "Where I've been and the tools I reach for.",
}

export default function ExperiencePage() {
  return <ExperienceContent />
}
