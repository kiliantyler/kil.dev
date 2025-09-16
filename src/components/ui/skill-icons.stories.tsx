'use client'

import { SkillIcons } from '@/components/ui/skill-icons'
import type { SkillName } from '@/lib/skillicons'
import { resolveSkills } from '@/utils/skillicons'
import type { Meta, StoryObj } from '@storybook/react'

const meta: Meta<typeof SkillIcons> = {
  title: 'UI/SkillIcons',
  component: SkillIcons,
}

export default meta
type Story = StoryObj<typeof SkillIcons>

const sample: SkillName[] = ['Next', 'Tailwind', 'shadcn', 'TypeScript', 'React']

export const Basic: Story = {
  render: () => <SkillIcons skills={resolveSkills(sample)} />,
}
