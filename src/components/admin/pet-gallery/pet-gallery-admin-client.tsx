'use client'

import type { PetGalleryAdminWorkspaceState } from '@/lib/pet-gallery/admin-workspace'
import { useEffect, useState } from 'react'
import { AnimalsTab } from './animals/animals-tab'
import { PetGalleryStatusStrip } from './pet-gallery-status-strip'
import {
  normalizePetGalleryAdminTab,
  PET_GALLERY_ADMIN_TABS,
  PetGalleryTabs,
  type PetGalleryAdminTab,
} from './pet-gallery-tabs'
import { PhotosTab } from './photos/photos-tab'
import { PublishTab } from './publish/publish-tab'
import { usePetGalleryAdminWorkspace } from './use-pet-gallery-admin-workspace'

function readCurrentTabFromUrl(): PetGalleryAdminTab {
  if (globalThis.window === undefined) return 'photos'
  return normalizePetGalleryAdminTab(new URL(globalThis.location.href).searchParams.get('tab'))
}

export function PetGalleryAdminClient({ initialState }: { initialState: PetGalleryAdminWorkspaceState }) {
  const [activeTab, setActiveTab] = useState<PetGalleryAdminTab>('photos')
  const workspace = usePetGalleryAdminWorkspace(initialState)

  useEffect(() => {
    setActiveTab(readCurrentTabFromUrl())

    const syncTabFromHistory = () => setActiveTab(readCurrentTabFromUrl())
    globalThis.addEventListener('popstate', syncTabFromHistory)
    return () => globalThis.removeEventListener('popstate', syncTabFromHistory)
  }, [])

  return (
    <div className="flex flex-col gap-6">
      <PetGalleryStatusStrip
        photos={workspace.status.photos}
        animals={workspace.status.animals}
        selectedCount={workspace.status.selectedCount}
      />
      <PetGalleryTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {PET_GALLERY_ADMIN_TABS.map(tab => (
        <section
          key={tab}
          role="tabpanel"
          id={`pet-gallery-${tab}-panel`}
          aria-labelledby={`pet-gallery-${tab}-tab`}
          hidden={activeTab !== tab}
          className="min-w-0">
          {activeTab === tab && tab === 'photos' ? <PhotosTab {...workspace.photosTab} /> : null}
          {activeTab === tab && tab === 'animals' ? <AnimalsTab {...workspace.animalsTab} /> : null}
          {activeTab === tab && tab === 'publish' ? <PublishTab {...workspace.publishTab} /> : null}
        </section>
      ))}
    </div>
  )
}
