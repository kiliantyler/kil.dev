import type { AdminWorkspacePhoto } from '@/lib/pet-gallery/admin-workspace'
import { describe, expect, it } from 'vitest'
import { removeCompletedUploadQueueItems, reorderPhotosByDropTarget } from './pet-gallery-admin-photo-utils'

function photo(stableId: string, draftOrder: number): AdminWorkspacePhoto {
  return {
    docId: `photos:${stableId}`,
    stableId,
    sourceHash: `hash-${stableId}`,
    filename: `${stableId}.webp`,
    title: stableId,
    caption: stableId,
    altText: stableId,
    internalNotes: '',
    variants: {
      thumb: {
        kind: 'thumb',
        url: `/thumb-${stableId}.webp`,
        key: `thumb-${stableId}`,
        width: 320,
        height: 240,
        byteSize: 10,
        mimeType: 'image/webp',
        extension: 'webp',
      },
      card: {
        kind: 'card',
        url: `/card-${stableId}.webp`,
        key: `card-${stableId}`,
        width: 768,
        height: 576,
        byteSize: 10,
        mimeType: 'image/webp',
        extension: 'webp',
      },
      display: {
        kind: 'display',
        url: `/display-${stableId}.webp`,
        key: `display-${stableId}`,
        width: 1600,
        height: 1200,
        byteSize: 10,
        mimeType: 'image/webp',
        extension: 'webp',
      },
      full: {
        kind: 'full',
        url: `/full-${stableId}.webp`,
        key: `full-${stableId}`,
        width: 2560,
        height: 1920,
        byteSize: 10,
        mimeType: 'image/webp',
        extension: 'webp',
      },
    },
    animalIds: [],
    draftVisible: true,
    draftOrder,
    favorite: false,
    cover: false,
  }
}

function stableIds(photos: AdminWorkspacePhoto[]) {
  return photos.map(item => item.stableId)
}

describe('reorderPhotosByDropTarget', () => {
  it('moves a dragged photo before the drop target and normalizes draft order', () => {
    const reordered = reorderPhotosByDropTarget([photo('a', 1), photo('b', 2), photo('c', 3)], 'c', 'a', 'before')

    expect(stableIds(reordered)).toEqual(['c', 'a', 'b'])
    expect(reordered.map(item => item.draftOrder)).toEqual([1, 2, 3])
  })

  it('moves a dragged photo after the drop target', () => {
    const reordered = reorderPhotosByDropTarget([photo('a', 1), photo('b', 2), photo('c', 3)], 'a', 'c', 'after')

    expect(stableIds(reordered)).toEqual(['b', 'c', 'a'])
  })

  it('leaves the current order unchanged for invalid drops', () => {
    const photos = [photo('a', 1), photo('b', 2), photo('c', 3)]

    expect(stableIds(reorderPhotosByDropTarget(photos, 'missing', 'c', 'after'))).toEqual(['a', 'b', 'c'])
    expect(stableIds(reorderPhotosByDropTarget(photos, 'a', 'missing', 'after'))).toEqual(['a', 'b', 'c'])
    expect(stableIds(reorderPhotosByDropTarget(photos, 'b', 'b', 'after'))).toEqual(['a', 'b', 'c'])
  })
})

describe('removeCompletedUploadQueueItems', () => {
  it('removes only completed upload queue rows', () => {
    expect(
      removeCompletedUploadQueueItems(
        [
          { id: 'complete', filename: 'complete.png', status: 'ready', message: 'Draft photo created' },
          { id: 'pending', filename: 'pending.png', status: 'processing', message: 'Generating variants' },
        ],
        ['complete'],
      ),
    ).toEqual([{ id: 'pending', filename: 'pending.png', status: 'processing', message: 'Generating variants' }])
  })
})
