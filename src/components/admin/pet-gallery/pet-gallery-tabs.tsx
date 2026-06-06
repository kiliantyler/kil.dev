'use client'

import { AdminLavaTabs } from '@/components/admin/admin-lava-tabs'

export const PET_GALLERY_ADMIN_TABS = ['photos', 'animals', 'publish'] as const

export type PetGalleryAdminTab = (typeof PET_GALLERY_ADMIN_TABS)[number]

const TAB_LABELS: Record<PetGalleryAdminTab, string> = {
  photos: 'Photos',
  animals: 'Animals',
  publish: 'Publish',
}

export function normalizePetGalleryAdminTab(value: string | null): PetGalleryAdminTab {
  return PET_GALLERY_ADMIN_TABS.includes(value as PetGalleryAdminTab) ? (value as PetGalleryAdminTab) : 'photos'
}

export function buildPetGalleryAdminTabDefinitions() {
  return PET_GALLERY_ADMIN_TABS.map(tab => ({
    value: tab,
    label: TAB_LABELS[tab],
    panelId: `pet-gallery-${tab}-panel`,
    tabId: `pet-gallery-${tab}-tab`,
  }))
}

type PetGalleryTabsProps = {
  activeTab: PetGalleryAdminTab
  onTabChange: (tab: PetGalleryAdminTab) => void
}

export function PetGalleryTabs({ activeTab, onTabChange }: PetGalleryTabsProps) {
  return (
    <AdminLavaTabs
      tabs={buildPetGalleryAdminTabDefinitions()}
      activeTab={activeTab}
      defaultTab="photos"
      ariaLabel="Pet gallery admin sections"
      testId="pet-gallery-admin-tabs"
      onTabChange={onTabChange}
    />
  )
}
