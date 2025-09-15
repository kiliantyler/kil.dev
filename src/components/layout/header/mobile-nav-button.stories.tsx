'use client'

import type { Meta, StoryObj } from '@storybook/react'
import { Home } from 'lucide-react'
import type { Route } from 'next'
import * as React from 'react'

import { MobileNavButton } from '@/components/layout/header/mobile-nav-button'

const meta: Meta<typeof MobileNavButton> = {
  title: 'Layout/Header/MobileNavButton',
  component: MobileNavButton,
  parameters: {
    layout: 'centered',
  },
}

export default meta
type Story = StoryObj<typeof MobileNavButton>

function Container({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative" style={{ width: 320, height: 220 }}>
      <ul
        role="menu"
        aria-label="Mobile navigation"
        className="pointer-events-none fixed"
        style={{ left: 40, top: 40 }}>
        {children}
      </ul>
    </div>
  )
}

export const Basic: Story = {
  render: () => (
    <Container>
      <MobileNavButton
        href={'/' as Route}
        label="Home"
        Icon={Home}
        isActive={false}
        open
        closing={false}
        position={{ x: 0, y: 0 }}
        transitionDelayMs={0}
        onClick={() => {
          console.log('clicked')
        }}
      />
    </Container>
  ),
}

export const Active: Story = {
  render: () => (
    <Container>
      <MobileNavButton
        href={'/' as Route}
        label="Home"
        Icon={Home}
        isActive
        open
        closing={false}
        position={{ x: 40, y: 28 }}
        transitionDelayMs={50}
        onClick={() => {
          console.log('clicked')
        }}
      />
    </Container>
  ),
}
