'use client'

import { ScrollArea } from '@/components/ui/scroll-area'
import type { Meta, StoryObj } from '@storybook/react'

const meta: Meta<typeof ScrollArea> = {
  title: 'UI/ScrollArea',
  component: ScrollArea,
}

export default meta
type Story = StoryObj<typeof ScrollArea>

export const Basic: Story = {
  render: () => (
    <ScrollArea className="h-40 w-64 rounded-md border p-2">
      <div className="space-y-2">
        {Array.from({ length: 20 }).map((_, i) => (
          <p key={i}>Line {i + 1}</p>
        ))}
      </div>
    </ScrollArea>
  ),
}
