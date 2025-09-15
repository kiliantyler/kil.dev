'use client'

import { FlippingCard } from '@/components/ui/flipping-card'
import type { Meta, StoryObj } from '@storybook/react'

const meta: Meta<typeof FlippingCard> = {
  title: 'UI/FlippingCard',
  component: FlippingCard,
}

export default meta
type Story = StoryObj<typeof FlippingCard>

export const Basic: Story = {
  render: () => (
    <div className="w-[360px]">
      <FlippingCard
        backgroundImageSrc="/favicon.ico"
        backgroundImageAlt=""
        front={
          <div className="h-full w-full rounded-xl bg-background/70 ring-1 ring-border grid place-items-center">
            Front
          </div>
        }
        back={
          <div className="h-full w-full rounded-xl bg-background/70 ring-1 ring-border grid place-items-center">
            Back
          </div>
        }
      />
    </div>
  ),
}
