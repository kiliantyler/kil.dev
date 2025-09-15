'use client'

import { MapTooltip } from '@/components/ui/map-tooltip'
import type { Meta, StoryObj } from '@storybook/react'

const meta: Meta<typeof MapTooltip> = {
  title: 'UI/MapTooltip',
  component: MapTooltip,
}

export default meta
type Story = StoryObj<typeof MapTooltip>

export const Basic: Story = {
  args: {
    locationLabel: 'Atlanta, GA',
    latitude: 33.749,
    longitude: -84.388,
  },
}
