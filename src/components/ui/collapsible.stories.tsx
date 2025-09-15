'use client'

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import type { Meta, StoryObj } from '@storybook/react'

const meta: Meta<typeof Collapsible> = {
  title: 'UI/Collapsible',
  component: Collapsible,
}

export default meta
type Story = StoryObj<typeof Collapsible>

export const Basic: Story = {
  render: () => (
    <Collapsible>
      <CollapsibleTrigger className="rounded-md border px-3 py-2">Toggle</CollapsibleTrigger>
      <CollapsibleContent className="mt-2 rounded-md border p-3">
        <p>Hidden content</p>
      </CollapsibleContent>
    </Collapsible>
  ),
}
