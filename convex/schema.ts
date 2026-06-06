import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'
import { askKilianKnowledgeEntryCoreFields, askKilianRagFilterVersionValidator } from './askKilianValidators'
import { PET_GALLERY_INDEXES } from './petGalleryIndexes'
import {
  petGalleryActorValidator,
  petGalleryAnimalSpeciesValidator,
  petGalleryApproximateDateValidator,
  petGalleryPublicSnapshotValidator,
  petGalleryVariantsValidator,
} from './petGalleryValidators'

export default defineSchema({
  scores: defineTable({
    name: v.string(),
    score: v.number(),
  }).index('by_score', ['score']),
  gameSessions: defineTable({
    secret: v.string(),
    seed: v.number(),
    createdAt: v.number(),
    expiresAt: v.number(), // Unix timestamp in milliseconds
    isActive: v.boolean(),
    validatedScore: v.optional(v.number()),
  }).index('by_expiresAt', ['expiresAt']),
  askKilianKnowledgeEntries: defineTable({
    ...askKilianKnowledgeEntryCoreFields,
    ragEntryId: v.optional(v.string()),
    ragStatus: v.optional(v.string()),
    ragFilterVersion: v.optional(askKilianRagFilterVersionValidator),
    pendingRagEntryCleanupIds: v.optional(v.array(v.string())),
    createdAt: v.number(),
    updatedAt: v.number(),
    retiredAt: v.optional(v.number()),
  })
    .index('by_stableKey', ['stableKey'])
    .index('by_status', ['status'])
    .index('by_category', ['category'])
    .index('by_source', ['source']),
  petGalleryAnimals: defineTable({
    stableId: v.string(),
    name: v.string(),
    species: v.optional(petGalleryAnimalSpeciesValidator),
    color: v.string(),
    sortOrder: v.number(),
    hidden: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index(PET_GALLERY_INDEXES.animals.stableId, ['stableId'])
    .index(PET_GALLERY_INDEXES.animals.sortOrder, ['sortOrder']),
  petGalleryPhotos: defineTable({
    stableId: v.string(),
    sourceHash: v.string(),
    title: v.optional(v.string()),
    caption: v.optional(v.string()),
    altText: v.optional(v.string()),
    internalNotes: v.optional(v.string()),
    variants: petGalleryVariantsValidator,
    animalIds: v.array(v.id('petGalleryAnimals')),
    draftVisible: v.boolean(),
    draftOrder: v.number(),
    favorite: v.boolean(),
    cover: v.boolean(),
    approximateDate: v.optional(petGalleryApproximateDateValidator),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index(PET_GALLERY_INDEXES.photos.stableId, ['stableId'])
    .index(PET_GALLERY_INDEXES.photos.sourceHash, ['sourceHash'])
    .index(PET_GALLERY_INDEXES.photos.draftOrder, ['draftOrder']),
  petGalleryPublicSnapshot: defineTable({
    key: v.string(),
    revision: v.string(),
    publishedAt: v.number(),
    snapshot: petGalleryPublicSnapshotValidator,
  }).index(PET_GALLERY_INDEXES.publicSnapshot.key, ['key']),
  petGalleryPublishHistory: defineTable({
    revision: v.string(),
    publishedAt: v.number(),
    photoCount: v.number(),
    animalCount: v.number(),
    actor: petGalleryActorValidator,
  }),
  petGalleryDeletedPhotoFiles: defineTable({
    photoStableId: v.string(),
    variantKeys: v.array(v.string()),
    status: v.union(v.literal('pending'), v.literal('complete'), v.literal('failed')),
    attempts: v.number(),
    lastError: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    actor: petGalleryActorValidator,
  })
    .index(PET_GALLERY_INDEXES.deletedPhotoFiles.status, ['status'])
    .index(PET_GALLERY_INDEXES.deletedPhotoFiles.photoStableId, ['photoStableId']),
  petGalleryUploadedVariantFiles: defineTable({
    key: v.string(),
    url: v.string(),
    name: v.string(),
    size: v.number(),
    mimeType: v.string(),
    status: v.union(
      v.literal('pending'),
      v.literal('attached'),
      v.literal('cleanupPending'),
      v.literal('cleaned'),
      v.literal('cleanupFailed'),
    ),
    photoStableId: v.optional(v.string()),
    attempts: v.number(),
    lastError: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    actor: petGalleryActorValidator,
  })
    .index(PET_GALLERY_INDEXES.uploadedVariantFiles.key, ['key'])
    .index(PET_GALLERY_INDEXES.uploadedVariantFiles.status, ['status']),
  petGalleryDraft: defineTable({
    key: v.string(),
    updatedAt: v.number(),
    updatedBy: v.optional(petGalleryActorValidator),
    lastPublishedRevision: v.optional(v.string()),
  }).index(PET_GALLERY_INDEXES.draft.key, ['key']),
})
