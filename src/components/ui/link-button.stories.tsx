'use client'

import type { Meta, StoryObj } from '@storybook/react'
import type { Route } from 'next'
import { LinkButton } from './link-button'

const meta: Meta<typeof LinkButton> = {
  title: 'UI/LinkButton',
  component: LinkButton,
}

export default meta
type Story = StoryObj<typeof LinkButton>

export const Basic: Story = {
  render: () => <LinkButton href={'/' as Route}>Go Home</LinkButton>,
}
