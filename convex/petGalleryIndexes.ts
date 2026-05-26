export const PET_GALLERY_INDEXES = {
  animals: {
    stableId: 'by_stableId',
    sortOrder: 'by_sortOrder',
  },
  photos: {
    stableId: 'by_stableId',
    sourceHash: 'by_sourceHash',
    draftOrder: 'by_draftOrder',
  },
  publicSnapshot: {
    key: 'by_key',
  },
  deletedPhotoFiles: {
    status: 'by_status',
    photoStableId: 'by_photoStableId',
  },
  uploadedVariantFiles: {
    key: 'by_key',
    status: 'by_status',
  },
  draft: {
    key: 'by_key',
  },
} as const
