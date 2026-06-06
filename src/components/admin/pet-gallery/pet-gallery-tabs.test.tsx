import { describe, expect, it } from 'vitest'
import {
  buildPetGalleryAdminTabDefinitions,
  normalizePetGalleryAdminTab,
  PET_GALLERY_ADMIN_TABS,
} from './pet-gallery-tabs'

describe('PetGalleryTabs', () => {
  it('preserves the pet gallery tab values, ids, labels, and default normalization', () => {
    expect(PET_GALLERY_ADMIN_TABS).toEqual(['photos', 'animals', 'publish'])
    expect(normalizePetGalleryAdminTab('unknown')).toBe('photos')
    expect(buildPetGalleryAdminTabDefinitions()).toEqual([
      { value: 'photos', label: 'Photos', panelId: 'pet-gallery-photos-panel', tabId: 'pet-gallery-photos-tab' },
      { value: 'animals', label: 'Animals', panelId: 'pet-gallery-animals-panel', tabId: 'pet-gallery-animals-tab' },
      { value: 'publish', label: 'Publish', panelId: 'pet-gallery-publish-panel', tabId: 'pet-gallery-publish-tab' },
    ])
  })
})
