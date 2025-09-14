'use client'

import { Separator } from '@/components/ui/separator'
import type { Meta, StoryObj } from '@storybook/react'

const meta: Meta<typeof Separator> = {
  title: 'UI/Separator',
  component: Separator,
}

export default meta
type Story = StoryObj<typeof Separator>

export const Horizontal: Story = {
  render: () => (
    <div className="w-80 space-y-2">
      <p>Above</p>
      <Separator />
      <p>Below</p>
    </div>
  ),
}

export const Vertical: Story = {
  render: () => (
    <div className="h-20 w-80 flex items-center gap-2">
      <span>A</span>
      <Separator orientation="vertical" />
      <span>B</span>
    </div>
  ),
}
