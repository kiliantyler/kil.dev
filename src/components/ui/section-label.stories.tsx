'use client'

import { SectionLabel } from '@/components/ui/section-label'
import type { Meta, StoryObj } from '@storybook/react'

const meta: Meta<typeof SectionLabel> = {
  title: 'UI/SectionLabel',
  component: SectionLabel,
}

export default meta
type Story = StoryObj<typeof SectionLabel>

export const Basic: Story = {
  args: {
    children: 'Section title',
  },
}
