'use client'

import {
  BottomDrawer,
  BottomDrawerContent,
  BottomDrawerDescription,
  BottomDrawerHeader,
  BottomDrawerTitle,
  BottomDrawerTrigger,
} from '@/components/ui/bottom-drawer'
import { Button } from '@/components/ui/button'
import type { Meta, StoryObj } from '@storybook/react'

const meta: Meta<typeof BottomDrawer> = {
  title: 'UI/BottomDrawer',
  component: BottomDrawer,
}

export default meta
type Story = StoryObj<typeof BottomDrawer>

export const Basic: Story = {
  render: () => (
    <BottomDrawer>
      <BottomDrawerTrigger asChild>
        <Button>Open Bottom Drawer</Button>
      </BottomDrawerTrigger>
      <BottomDrawerContent>
        <BottomDrawerHeader>
          <BottomDrawerTitle>Bottom drawer title</BottomDrawerTitle>
          <BottomDrawerDescription>Some description text</BottomDrawerDescription>
        </BottomDrawerHeader>
        <div className="p-4">Hello from bottom drawer</div>
      </BottomDrawerContent>
    </BottomDrawer>
  ),
}
