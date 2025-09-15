'use client'

import { ThemeToggle } from '@/components/ui/theme-toggle'
import type { Meta, StoryObj } from '@storybook/react'

const meta: Meta<typeof ThemeToggle> = {
  title: 'UI/ThemeToggle',
  component: ThemeToggle,
}

export default meta
type Story = StoryObj<typeof ThemeToggle>

export const Basic: Story = {
  render: () => <ThemeToggle />,
}
