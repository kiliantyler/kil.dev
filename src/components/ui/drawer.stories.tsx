'use client'

import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import type { Meta, StoryObj } from '@storybook/react'

const meta: Meta<typeof Drawer> = {
  title: 'UI/Drawer',
  component: Drawer,
}

export default meta
type Story = StoryObj<typeof Drawer>

export const Basic: Story = {
  render: () => (
    <Drawer>
      <DrawerTrigger asChild>
        <Button>Open Drawer</Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Drawer title</DrawerTitle>
          <DrawerDescription>Some description text</DrawerDescription>
        </DrawerHeader>
        <div className="p-4">Hello from drawer</div>
      </DrawerContent>
    </Drawer>
  ),
}
