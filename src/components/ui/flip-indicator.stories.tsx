'use client'

import { FlipIndicator } from '@/components/ui/flip-indicator'
import type { Meta, StoryObj } from '@storybook/react'

const meta: Meta<typeof FlipIndicator> = {
  title: 'UI/FlipIndicator',
  component: FlipIndicator,
}

export default meta
type Story = StoryObj<typeof FlipIndicator>

export const Basic: Story = {
  render: () => (
    <div className="relative h-40 w-64 rounded-md border">
      <FlipIndicator />
    </div>
  ),
}
