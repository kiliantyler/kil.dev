import { v } from 'convex/values'
import { normalizePetGalleryApproximateDate } from '../src/lib/pet-gallery/approximate-date'
import { buildPublicPetGallerySnapshot } from '../src/lib/pet-gallery/snapshot'
import {
  PET_GALLERY_ANIMAL_SPECIES,
  PET_GALLERY_RESERVED_ANIMAL_STABLE_IDS,
  PET_GALLERY_VARIANTS,
  type AdminAnimal,
  type AdminPhoto,
  type PetGalleryActor,
  type PetGalleryAnimalSpecies,
  type PublicPetGallerySnapshot,
} from '../src/lib/pet-gallery/types'
import type { Id, TableNames } from './_generated/dataModel'
import { mutation, query } from './_generated/server'
import { getAuthKit } from './auth'
import { PET_GALLERY_INDEXES } from './petGalleryIndexes'
import {
  petGalleryActorValidator,
  petGalleryAnimalSpeciesValidator,
  petGalleryApproximateDateValidator,
  petGalleryPublicSnapshotValidator,
  petGalleryVariantsValidator,
} from './petGalleryValidators'

const PET_GALLERY_DRAFT_KEY = 'current'
const PET_GALLERY_SNAPSHOT_KEY = 'current'
const RESERVED_ANIMAL_STABLE_IDS = new Set<string>(PET_GALLERY_RESERVED_ANIMAL_STABLE_IDS)

const animalReturnValidator = v.object({
  _id: v.id('petGalleryAnimals'),
  _creationTime: v.number(),
  stableId: v.string(),
  name: v.string(),
  species: v.optional(petGalleryAnimalSpeciesValidator),
  color: v.string(),
  sortOrder: v.number(),
  hidden: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
})

const photoReturnValidator = v.object({
  _id: v.id('petGalleryPhotos'),
  _creationTime: v.number(),
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

const draftReturnValidator = v.union(
  v.object({
    _id: v.id('petGalleryDraft'),
    _creationTime: v.number(),
    key: v.string(),
    updatedAt: v.number(),
    updatedBy: v.optional(petGalleryActorValidator),
    lastPublishedRevision: v.optional(v.string()),
  }),
  v.null(),
)

const publishHistoryReturnValidator = v.object({
  _id: v.id('petGalleryPublishHistory'),
  _creationTime: v.number(),
  revision: v.string(),
  publishedAt: v.number(),
  photoCount: v.number(),
  animalCount: v.number(),
  actor: petGalleryActorValidator,
})

const cleanupReturnValidator = v.object({
  _id: v.id('petGalleryDeletedPhotoFiles'),
  _creationTime: v.number(),
  photoStableId: v.string(),
  variantKeys: v.array(v.string()),
  status: v.union(v.literal('pending'), v.literal('complete'), v.literal('failed')),
  attempts: v.number(),
  lastError: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
  actor: petGalleryActorValidator,
})

const publishDraftReturnValidator = v.object({
  revision: v.string(),
  publishedAt: v.number(),
  photoCount: v.number(),
  animalCount: v.number(),
})

const beginPhotoHardDeleteReturnValidator = v.object({
  cleanupId: v.id('petGalleryDeletedPhotoFiles'),
  variantKeys: v.array(v.string()),
})

const adminStateValidator = v.object({
  animals: v.array(animalReturnValidator),
  photos: v.array(photoReturnValidator),
  draft: draftReturnValidator,
  publishHistory: v.array(publishHistoryReturnValidator),
})

type PetGalleryContext = {
  auth: {
    getUserIdentity: () => Promise<unknown>
  }
  db: PetGalleryDb
  runQuery: (reference: unknown, args: Record<string, unknown>) => Promise<unknown>
}

type PetGalleryTableName = Extract<TableNames, `petGallery${string}`>

const PET_GALLERY_INDEXES_BY_TABLE: Record<PetGalleryTableName, Record<string, string>> = {
  petGalleryAnimals: {
    stableId: PET_GALLERY_INDEXES.animals.stableId,
  },
  petGalleryPhotos: {
    stableId: PET_GALLERY_INDEXES.photos.stableId,
    sourceHash: PET_GALLERY_INDEXES.photos.sourceHash,
  },
  petGalleryPublicSnapshot: {
    key: PET_GALLERY_INDEXES.publicSnapshot.key,
  },
  petGalleryDraft: {
    key: PET_GALLERY_INDEXES.draft.key,
  },
  petGalleryDeletedPhotoFiles: {
    photoStableId: PET_GALLERY_INDEXES.deletedPhotoFiles.photoStableId,
    status: PET_GALLERY_INDEXES.deletedPhotoFiles.status,
  },
  petGalleryUploadedVariantFiles: {
    key: PET_GALLERY_INDEXES.uploadedVariantFiles.key,
    status: PET_GALLERY_INDEXES.uploadedVariantFiles.status,
  },
  petGalleryPublishHistory: {},
}

type PetGalleryDb = {
  query: (table: PetGalleryTableName) => {
    collect: () => Promise<Array<Record<string, unknown>>>
    first?: () => Promise<Record<string, unknown> | null>
    unique?: () => Promise<Record<string, unknown> | null>
    withIndex?: (
      index: string,
      range?: (q: { eq: (field: string, value: unknown) => unknown }) => unknown,
    ) => {
      collect: () => Promise<Array<Record<string, unknown>>>
      first?: () => Promise<Record<string, unknown> | null>
      unique?: () => Promise<Record<string, unknown> | null>
    }
  }
  get: (id: string) => Promise<(Record<string, unknown> & { _id: string }) | null>
  insert: (table: PetGalleryTableName, value: Record<string, unknown>) => Promise<string>
  patch: (id: string, value: Record<string, unknown>) => Promise<void>
  delete: (id: string) => Promise<void>
}

function petGalleryDb(ctx: PetGalleryContext): PetGalleryDb {
  return ctx.db
}

function asPetGalleryContext(ctx: unknown): PetGalleryContext {
  return ctx as PetGalleryContext
}

type AnimalId = Id<'petGalleryAnimals'>
type PhotoId = Id<'petGalleryPhotos'>
type DraftId = Id<'petGalleryDraft'>
type CleanupId = Id<'petGalleryDeletedPhotoFiles'>
type UploadedVariantId = Id<'petGalleryUploadedVariantFiles'>
type PublishHistoryId = Id<'petGalleryPublishHistory'>

type AnimalDoc = {
  _id: AnimalId
  _creationTime: number
  stableId: string
  name: string
  species?: PetGalleryAnimalSpecies
  color: string
  sortOrder: number
  hidden: boolean
  createdAt: number
  updatedAt: number
}

type PhotoDoc = {
  _id: PhotoId
  _creationTime: number
  stableId: string
  sourceHash: string
  title?: string
  caption?: string
  altText?: string
  internalNotes?: string
  variants: AdminPhoto['variants']
  animalIds: AnimalId[]
  draftVisible: boolean
  draftOrder: number
  favorite: boolean
  cover: boolean
  approximateDate?: AdminPhoto['approximateDate']
  createdAt: number
  updatedAt: number
}

type DraftDoc = {
  _id: DraftId
  _creationTime: number
  key: string
  updatedAt: number
  updatedBy?: PetGalleryActor
  lastPublishedRevision?: string
}

type CleanupDoc = {
  _id: CleanupId
  _creationTime: number
  photoStableId: string
  variantKeys: string[]
  status: 'pending' | 'complete' | 'failed'
  attempts: number
  lastError?: string
  createdAt: number
  updatedAt: number
  actor: PetGalleryActor
}

type UploadedVariantDoc = {
  _id: UploadedVariantId
  _creationTime: number
  key: string
  url: string
  name: string
  size: number
  mimeType: string
  status: 'pending' | 'attached' | 'cleanupPending' | 'cleaned' | 'cleanupFailed'
  photoStableId?: string
  attempts: number
  lastError?: string
  createdAt: number
  updatedAt: number
  actor: PetGalleryActor
}

type PublishHistoryDoc = {
  _id: PublishHistoryId
  _creationTime: number
  revision: string
  publishedAt: number
  photoCount: number
  animalCount: number
  actor: PetGalleryActor
}

type AuthKitUser = {
  id: string
  email: string
  firstName?: string | null
  lastName?: string | null
} | null

function normalizeEmail(email: string | undefined): string | null {
  const trimmed = email?.trim().toLowerCase()
  return trimmed || null
}

function normalizeAnimalName(name: string): string {
  return name.trim().replaceAll(/\s+/g, ' ').toLowerCase()
}

function assertPetGalleryAnimalSpecies(
  species: string | undefined,
): asserts species is PetGalleryAnimalSpecies | undefined {
  if (species === undefined) return
  if ((PET_GALLERY_ANIMAL_SPECIES as readonly string[]).includes(species)) return
  throw new Error('Pet gallery animal species must be cat or dog')
}

async function ensureAnimalNameAvailable(ctx: PetGalleryContext, name: string, currentAnimalId?: string) {
  const normalizedName = normalizeAnimalName(name)
  if (!normalizedName) throw new Error('Pet gallery animal name is required')

  const animals = await listTable<AnimalDoc>(ctx, 'petGalleryAnimals')
  if (animals.some(animal => animal._id !== currentAnimalId && normalizeAnimalName(animal.name) === normalizedName)) {
    throw new Error('Pet gallery animal name already exists')
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null
}

async function readAuthKitUser(ctx: PetGalleryContext): Promise<AuthKitUser> {
  return (await getAuthKit().getAuthUser(ctx as never)) as AuthKitUser
}

function readWorkOSOrgId(identity: Record<string, unknown>): string | null {
  for (const key of ['organizationId', 'org_id', 'https://api.workos.com/organization_id']) {
    const value = identity[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }

  const token = asRecord(identity.token)
  const claims = asRecord(token?.claims)
  const tokenOrgId = claims?.org_id

  return typeof tokenOrgId === 'string' && tokenOrgId.trim() ? tokenOrgId.trim() : null
}

function displayNameForActor(
  identity: Record<string, unknown>,
  authUser: NonNullable<AuthKitUser>,
): string | undefined {
  const workosName = [authUser.firstName, authUser.lastName]
    .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
    .join(' ')

  if (workosName) return workosName
  return typeof identity.name === 'string' && identity.name.trim() ? identity.name : undefined
}

export async function requirePetGalleryAdmin(ctx: PetGalleryContext): Promise<PetGalleryActor> {
  const configuredEmail = normalizeEmail(process.env.ADMIN_EMAIL)
  const configuredOrgId = process.env.WORKOS_ORG_ID?.trim()

  if (!configuredEmail || !configuredOrgId) {
    throw new Error('Pet gallery admin access denied')
  }

  const identity = await ctx.auth.getUserIdentity()
  const identityRecord = asRecord(identity)
  const workosOrgId = identityRecord ? readWorkOSOrgId(identityRecord) : null
  const subject = typeof identityRecord?.subject === 'string' ? identityRecord.subject.trim() : ''
  const authUser = identityRecord && subject ? await readAuthKitUser(ctx) : null
  const email = normalizeEmail(authUser?.email)

  if (
    !identityRecord ||
    !authUser ||
    authUser.id !== subject ||
    !email ||
    !subject ||
    email !== configuredEmail ||
    workosOrgId !== configuredOrgId
  ) {
    throw new Error('Pet gallery admin access denied')
  }

  return {
    workosUserId: subject,
    workosOrgId,
    email,
    name: displayNameForActor(identityRecord, authUser),
    timestamp: Date.now(),
  }
}

async function listTable<T extends Record<string, unknown>>(
  ctx: PetGalleryContext,
  table: PetGalleryTableName,
): Promise<T[]> {
  return (await petGalleryDb(ctx).query(table).collect()) as T[]
}

function sortAnimals(animals: AnimalDoc[]): AnimalDoc[] {
  return animals.toSorted(
    (first, second) => first.sortOrder - second.sortOrder || first.stableId.localeCompare(second.stableId),
  )
}

function sortPhotos(photos: PhotoDoc[]): PhotoDoc[] {
  return photos.toSorted(
    (first, second) => first.draftOrder - second.draftOrder || first.stableId.localeCompare(second.stableId),
  )
}

function indexNameForField(table: PetGalleryTableName, field: string): string | null {
  return PET_GALLERY_INDEXES_BY_TABLE[table][field] ?? null
}

async function findByField<T extends { _id: string }>(
  ctx: PetGalleryContext,
  table: PetGalleryTableName,
  field: string,
  value: unknown,
): Promise<T | null> {
  const indexName = indexNameForField(table, field)
  const queryBuilder = petGalleryDb(ctx).query(table)

  if (indexName && queryBuilder.withIndex) {
    const indexedQuery = queryBuilder.withIndex(indexName, q => q.eq(field, value))
    if (indexedQuery.unique) return (await indexedQuery.unique()) as T | null
    if (indexedQuery.first) return (await indexedQuery.first()) as T | null
  }

  const rows = await listTable<T>(ctx, table)
  return rows.find(row => (row as Record<string, unknown>)[field] === value) ?? null
}

async function listByField<T extends Record<string, unknown>>(
  ctx: PetGalleryContext,
  table: PetGalleryTableName,
  field: string,
  value: unknown,
): Promise<T[]> {
  const indexName = indexNameForField(table, field)
  const queryBuilder = petGalleryDb(ctx).query(table)

  if (indexName && queryBuilder.withIndex) {
    return (await queryBuilder.withIndex(indexName, q => q.eq(field, value)).collect()) as T[]
  }

  const rows = await listTable<T>(ctx, table)
  return rows.filter(row => row[field] === value)
}

async function hasRetryableCleanupForPhotoStableId(ctx: PetGalleryContext, photoStableId: string): Promise<boolean> {
  const cleanups = await listByField<CleanupDoc>(ctx, 'petGalleryDeletedPhotoFiles', 'photoStableId', photoStableId)
  return cleanups.some(cleanup => cleanup.status === 'pending' || cleanup.status === 'failed')
}

function sameActor(first: PetGalleryActor, second: PetGalleryActor): boolean {
  return (
    first.workosUserId === second.workosUserId &&
    first.email === second.email &&
    (first.workosOrgId ?? '') === (second.workosOrgId ?? '')
  )
}

function uniqueVariantKeys(keys: string[]): string[] {
  const unique = uniqueIds(keys.map(key => key.trim()).filter(Boolean))
  if (unique.length > PET_GALLERY_VARIANTS.length) {
    throw new Error(`Pet gallery upload cleanup is limited to ${PET_GALLERY_VARIANTS.length} variant files`)
  }
  return unique
}

async function markPendingUploadsAttached(
  ctx: PetGalleryContext,
  actor: PetGalleryActor,
  variantKeys: string[],
  photoStableId: string,
) {
  const now = Date.now()

  for (const key of uniqueIds(variantKeys)) {
    const upload = await findByField<UploadedVariantDoc>(ctx, 'petGalleryUploadedVariantFiles', 'key', key)
    if (!upload || upload.status !== 'pending' || !sameActor(upload.actor, actor)) {
      throw new Error('Pet gallery photo variants must be pending uploads owned by the current admin')
    }
    await petGalleryDb(ctx).patch(upload._id, {
      status: 'attached',
      photoStableId,
      updatedAt: now,
    })
  }
}

async function ensurePendingUploadsOwnedByActor(ctx: PetGalleryContext, actor: PetGalleryActor, variantKeys: string[]) {
  const keys = uniqueVariantKeys(variantKeys)
  if (keys.length !== PET_GALLERY_VARIANTS.length) {
    throw new Error(`Pet gallery photo drafts require ${PET_GALLERY_VARIANTS.length} uploaded variant files`)
  }

  for (const key of keys) {
    const upload = await findByField<UploadedVariantDoc>(ctx, 'petGalleryUploadedVariantFiles', 'key', key)
    if (!upload || upload.status !== 'pending' || !sameActor(upload.actor, actor)) {
      throw new Error('Pet gallery photo variants must be pending uploads owned by the current admin')
    }
  }
}

async function getAnimal(ctx: PetGalleryContext, animalId: string): Promise<AnimalDoc> {
  const animal = (await petGalleryDb(ctx).get(animalId)) as AnimalDoc | null
  if (!animal) throw new Error('Pet gallery animal not found')
  return animal
}

async function getPhoto(ctx: PetGalleryContext, photoId: string): Promise<PhotoDoc> {
  const photo = (await petGalleryDb(ctx).get(photoId)) as PhotoDoc | null
  if (!photo) throw new Error('Pet gallery photo not found')
  return photo
}

async function ensureAnimalIdsExist(ctx: PetGalleryContext, animalIds: string[]): Promise<void> {
  for (const animalId of animalIds) {
    await getAnimal(ctx, animalId)
  }
}

async function ensureBulkTagAnimalIdsExistAndActive(ctx: PetGalleryContext, animalIds: string[]): Promise<void> {
  for (const animalId of animalIds) {
    const animal = await getAnimal(ctx, animalId)
    if (animal.hidden) {
      throw new Error('Pet gallery hidden animals cannot be used for bulk tagging')
    }
  }
}

async function touchDraft(
  ctx: PetGalleryContext,
  actor: PetGalleryActor,
  updatedAt: number,
  lastPublishedRevision?: string,
) {
  const existing = await findByField<DraftDoc>(ctx, 'petGalleryDraft', 'key', PET_GALLERY_DRAFT_KEY)
  const patch = {
    updatedAt,
    updatedBy: actor,
    ...(lastPublishedRevision ? { lastPublishedRevision } : {}),
  }

  if (existing) {
    await petGalleryDb(ctx).patch(existing._id, patch)
    return
  }

  await petGalleryDb(ctx).insert('petGalleryDraft', {
    key: PET_GALLERY_DRAFT_KEY,
    ...patch,
  })
}

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids)]
}

function assignDefined(patch: Record<string, unknown>, key: string, value: unknown) {
  if (value === undefined) return
  patch[key] = value
}

function assignClearable(patch: Record<string, unknown>, key: string, value: unknown) {
  if (value === undefined) return
  patch[key] = value === null ? undefined : value
}

function toAdminAnimal(animal: AnimalDoc): AdminAnimal {
  return {
    stableId: animal.stableId,
    name: animal.name,
    species: animal.species,
    order: animal.sortOrder,
    hidden: animal.hidden,
  }
}

function toAdminPhoto(photo: PhotoDoc, animalStableIdsById: Map<string, string>): AdminPhoto {
  return {
    stableId: photo.stableId,
    sourceHash: photo.sourceHash,
    title: photo.title,
    caption: photo.caption,
    altText: photo.altText,
    internalNotes: photo.internalNotes,
    variants: photo.variants,
    animalIds: photo.animalIds.flatMap(animalId => {
      const stableId = animalStableIdsById.get(animalId)
      return stableId ? [stableId] : []
    }),
    draftVisible: photo.draftVisible,
    draftOrder: photo.draftOrder,
    favorite: photo.favorite,
    cover: photo.cover,
    approximateDate: photo.approximateDate,
  }
}

export async function getPublicSnapshotHandler(
  ctx: PetGalleryContext,
  _args: Record<string, never>,
): Promise<PublicPetGallerySnapshot | null> {
  const snapshotRow = await findByField<{ snapshot: PublicPetGallerySnapshot; key: string; _id: string }>(
    ctx,
    'petGalleryPublicSnapshot',
    'key',
    PET_GALLERY_SNAPSHOT_KEY,
  )
  return snapshotRow?.snapshot ?? null
}

async function removePhotoFromPublicSnapshot(ctx: PetGalleryContext, photoStableId: string): Promise<void> {
  const snapshotRow = await findByField<{
    _id: string
    snapshot: PublicPetGallerySnapshot
    revision: string
    publishedAt: number
  }>(ctx, 'petGalleryPublicSnapshot', 'key', PET_GALLERY_SNAPSHOT_KEY)

  if (!snapshotRow) return

  const photos = snapshotRow.snapshot.photos.filter(photo => photo.stableId !== photoStableId)
  if (photos.length === snapshotRow.snapshot.photos.length) return

  const publishedAt = Date.now()
  const revision = `${snapshotRow.snapshot.revision}:delete:${photoStableId}:${publishedAt}`
  const snapshot = {
    ...snapshotRow.snapshot,
    revision,
    publishedAt,
    photos,
  }

  await petGalleryDb(ctx).patch(snapshotRow._id, {
    revision,
    publishedAt,
    snapshot,
  })
}

export async function getAdminStateHandler(ctx: PetGalleryContext, _args: Record<string, never>) {
  await requirePetGalleryAdmin(ctx)
  const animals = sortAnimals(await listTable<AnimalDoc>(ctx, 'petGalleryAnimals'))
  const photos = sortPhotos(await listTable<PhotoDoc>(ctx, 'petGalleryPhotos'))
  const draft = await findByField<DraftDoc>(ctx, 'petGalleryDraft', 'key', PET_GALLERY_DRAFT_KEY)
  const publishHistory = (await listTable<PublishHistoryDoc>(ctx, 'petGalleryPublishHistory')).toSorted(
    (first, second) => Number(second.publishedAt) - Number(first.publishedAt),
  )

  return {
    animals,
    photos,
    draft,
    publishHistory,
  }
}

export async function createAnimalHandler(
  ctx: PetGalleryContext,
  args: {
    stableId: string
    name: string
    species?: PetGalleryAnimalSpecies
    color: string
    sortOrder: number
  },
) {
  const actor = await requirePetGalleryAdmin(ctx)
  const now = Date.now()
  const existing = await findByField<AnimalDoc>(ctx, 'petGalleryAnimals', 'stableId', args.stableId)

  if (!args.stableId.trim() || RESERVED_ANIMAL_STABLE_IDS.has(args.stableId)) {
    throw new Error('Pet gallery animal stable ID is reserved')
  }
  if (existing) throw new Error('Pet gallery animal stable ID already exists')
  assertPetGalleryAnimalSpecies(args.species)
  await ensureAnimalNameAvailable(ctx, args.name)

  const animalId = await petGalleryDb(ctx).insert('petGalleryAnimals', {
    stableId: args.stableId,
    name: args.name,
    species: args.species,
    color: args.color,
    sortOrder: args.sortOrder,
    hidden: false,
    createdAt: now,
    updatedAt: now,
  })
  await touchDraft(ctx, actor, now)
  return animalId as AnimalId
}

export async function updateAnimalHandler(
  ctx: PetGalleryContext,
  args: {
    animalId: string
    name: string
    species?: PetGalleryAnimalSpecies
    color: string
    sortOrder: number
  },
) {
  const actor = await requirePetGalleryAdmin(ctx)
  await getAnimal(ctx, args.animalId)
  assertPetGalleryAnimalSpecies(args.species)
  await ensureAnimalNameAvailable(ctx, args.name, args.animalId)
  const now = Date.now()

  await petGalleryDb(ctx).patch(args.animalId, {
    name: args.name,
    species: args.species,
    color: args.color,
    sortOrder: args.sortOrder,
    updatedAt: now,
  })
  await touchDraft(ctx, actor, now)
  return null
}

async function setAnimalHidden(ctx: PetGalleryContext, animalId: string, hidden: boolean) {
  const actor = await requirePetGalleryAdmin(ctx)
  await getAnimal(ctx, animalId)
  const now = Date.now()

  await petGalleryDb(ctx).patch(animalId, {
    hidden: hidden,
    updatedAt: now,
  })
  await touchDraft(ctx, actor, now)
  return null
}

export async function hideAnimalHandler(ctx: PetGalleryContext, args: { animalId: string }) {
  return setAnimalHidden(ctx, args.animalId, true)
}

export async function restoreAnimalHandler(ctx: PetGalleryContext, args: { animalId: string }) {
  return setAnimalHidden(ctx, args.animalId, false)
}

export async function createPhotoDraftHandler(
  ctx: PetGalleryContext,
  args: {
    stableId: string
    sourceHash: string
    title?: string
    caption?: string
    altText?: string
    internalNotes?: string
    variants: AdminPhoto['variants']
    animalIds: string[]
    draftVisible: boolean
    draftOrder: number
    favorite: boolean
    cover: boolean
    approximateDate?: AdminPhoto['approximateDate']
  },
) {
  const actor = await requirePetGalleryAdmin(ctx)
  const now = Date.now()

  if (await findByField<PhotoDoc>(ctx, 'petGalleryPhotos', 'stableId', args.stableId)) {
    throw new Error('Pet gallery photo stable ID already exists')
  }
  if (await findByField<PhotoDoc>(ctx, 'petGalleryPhotos', 'sourceHash', args.sourceHash)) {
    throw new Error('Pet gallery photo source hash already exists')
  }
  if (await hasRetryableCleanupForPhotoStableId(ctx, args.stableId)) {
    throw new Error('Pet gallery photo cleanup is still pending for stable ID')
  }

  await ensureAnimalIdsExist(ctx, args.animalIds)
  const variantKeys = Object.values(args.variants).map(variant => variant.key)
  await ensurePendingUploadsOwnedByActor(ctx, actor, variantKeys)
  const photoId = await petGalleryDb(ctx).insert('petGalleryPhotos', {
    stableId: args.stableId,
    sourceHash: args.sourceHash,
    title: args.title,
    caption: args.caption,
    altText: args.altText,
    internalNotes: args.internalNotes,
    variants: args.variants,
    animalIds: uniqueIds(args.animalIds),
    draftVisible: args.draftVisible,
    draftOrder: args.draftOrder,
    favorite: args.favorite,
    cover: args.cover,
    approximateDate: normalizePetGalleryApproximateDate(args.approximateDate) ?? undefined,
    createdAt: now,
    updatedAt: now,
  })
  await markPendingUploadsAttached(ctx, actor, variantKeys, args.stableId)
  await touchDraft(ctx, actor, now)
  return photoId as PhotoId
}

export async function recordPendingVariantUploadHandler(
  ctx: PetGalleryContext,
  args: {
    key: string
    url: string
    name: string
    size: number
    mimeType: string
  },
) {
  const actor = await requirePetGalleryAdmin(ctx)
  const existing = await findByField<UploadedVariantDoc>(ctx, 'petGalleryUploadedVariantFiles', 'key', args.key)
  const now = Date.now()

  if (existing) {
    if (!sameActor(existing.actor, actor) || existing.status !== 'pending') {
      throw new Error('Pet gallery uploaded variant key is already registered')
    }
    await petGalleryDb(ctx).patch(existing._id, {
      url: args.url,
      name: args.name,
      size: args.size,
      mimeType: args.mimeType,
      status: 'pending',
      attempts: 0,
      lastError: undefined,
      photoStableId: undefined,
      updatedAt: now,
      actor,
    })
    return existing._id
  }

  return (await petGalleryDb(ctx).insert('petGalleryUploadedVariantFiles', {
    key: args.key,
    url: args.url,
    name: args.name,
    size: args.size,
    mimeType: args.mimeType,
    status: 'pending',
    attempts: 0,
    createdAt: now,
    updatedAt: now,
    actor,
  })) as UploadedVariantId
}

export async function beginUploadedVariantCleanupHandler(ctx: PetGalleryContext, args: { variantKeys: string[] }) {
  const actor = await requirePetGalleryAdmin(ctx)
  const variantKeys = uniqueVariantKeys(args.variantKeys)
  const uploads: UploadedVariantDoc[] = []

  for (const key of variantKeys) {
    const upload = await findByField<UploadedVariantDoc>(ctx, 'petGalleryUploadedVariantFiles', 'key', key)
    if (
      !upload ||
      (upload.status !== 'pending' && upload.status !== 'cleanupFailed' && upload.status !== 'cleanupPending') ||
      !sameActor(upload.actor, actor)
    ) {
      throw new Error('Pet gallery upload cleanup can only delete pending uploaded variant files')
    }
    uploads.push(upload)
  }

  const now = Date.now()
  for (const upload of uploads) {
    await petGalleryDb(ctx).patch(upload._id, {
      status: 'cleanupPending',
      updatedAt: now,
    })
  }

  return { variantKeys }
}

export async function recordUploadedVariantCleanupResultHandler(
  ctx: PetGalleryContext,
  args: {
    variantKeys: string[]
    ok: boolean
    error?: string
  },
) {
  const actor = await requirePetGalleryAdmin(ctx)
  const variantKeys = uniqueVariantKeys(args.variantKeys)
  const now = Date.now()

  for (const key of variantKeys) {
    const upload = await findByField<UploadedVariantDoc>(ctx, 'petGalleryUploadedVariantFiles', 'key', key)
    if (!upload || !sameActor(upload.actor, actor) || upload.status === 'attached') continue
    await petGalleryDb(ctx).patch(upload._id, {
      status: args.ok ? 'cleaned' : 'cleanupFailed',
      attempts: upload.attempts + 1,
      lastError: args.ok ? undefined : (args.error ?? 'Unknown pet gallery upload cleanup failure'),
      updatedAt: now,
    })
  }

  return null
}

export async function updatePhotoDraftHandler(
  ctx: PetGalleryContext,
  args: {
    photoId: string
    caption?: string | null
    title?: string | null
    altText?: string | null
    internalNotes?: string | null
    variants?: AdminPhoto['variants']
    animalIds?: string[]
    draftVisible?: boolean
    draftOrder?: number
    favorite?: boolean
    cover?: boolean
    approximateDate?: AdminPhoto['approximateDate'] | null
  },
) {
  const actor = await requirePetGalleryAdmin(ctx)
  await getPhoto(ctx, args.photoId)
  if (args.animalIds) await ensureAnimalIdsExist(ctx, args.animalIds)

  const now = Date.now()
  const patch = { updatedAt: now } as Record<string, unknown>
  assignClearable(patch, 'title', args.title)
  assignClearable(patch, 'caption', args.caption)
  assignClearable(patch, 'altText', args.altText)
  assignClearable(patch, 'internalNotes', args.internalNotes)
  assignDefined(patch, 'variants', args.variants)
  assignDefined(patch, 'animalIds', args.animalIds ? uniqueIds(args.animalIds) : undefined)
  assignDefined(patch, 'draftVisible', args.draftVisible)
  assignDefined(patch, 'draftOrder', args.draftOrder)
  assignDefined(patch, 'favorite', args.favorite)
  assignDefined(patch, 'cover', args.cover)
  assignClearable(patch, 'approximateDate', normalizePetGalleryApproximateDate(args.approximateDate))
  await petGalleryDb(ctx).patch(args.photoId, patch)
  await touchDraft(ctx, actor, now)
  return null
}

export async function bulkTagPhotosHandler(
  ctx: PetGalleryContext,
  args: {
    photoIds: string[]
    animalIds: string[]
    mode: 'add' | 'remove' | 'replace'
  },
) {
  const actor = await requirePetGalleryAdmin(ctx)
  await ensureBulkTagAnimalIdsExistAndActive(ctx, args.animalIds)
  const now = Date.now()

  for (const photoId of args.photoIds) {
    const photo = await getPhoto(ctx, photoId)
    const current = new Set(photo.animalIds)

    if (args.mode === 'replace') {
      await petGalleryDb(ctx).patch(photoId, { animalIds: uniqueIds(args.animalIds), updatedAt: now })
      continue
    }

    for (const animalId of args.animalIds) {
      const typedAnimalId = animalId as AnimalId
      if (args.mode === 'add') current.add(typedAnimalId)
      if (args.mode === 'remove') current.delete(typedAnimalId)
    }
    await petGalleryDb(ctx).patch(photoId, { animalIds: [...current], updatedAt: now })
  }

  await touchDraft(ctx, actor, now)
  return null
}

export async function reorderPhotosHandler(ctx: PetGalleryContext, args: { photoIds: string[] }) {
  const actor = await requirePetGalleryAdmin(ctx)
  const now = Date.now()

  for (const [draftOrder, photoId] of args.photoIds.entries()) {
    await getPhoto(ctx, photoId)
    await petGalleryDb(ctx).patch(photoId, { draftOrder, updatedAt: now })
  }

  await touchDraft(ctx, actor, now)
  return null
}

export async function publishDraftHandler(
  ctx: PetGalleryContext,
  args: {
    now?: number
    revision?: string
    expectedMinimumPhotoCount?: number
    requireExistingSnapshot?: boolean
  },
) {
  const actor = await requirePetGalleryAdmin(ctx)
  const now = args.now ?? Date.now()
  const animals = sortAnimals(await listTable<AnimalDoc>(ctx, 'petGalleryAnimals'))
  const photos = sortPhotos(await listTable<PhotoDoc>(ctx, 'petGalleryPhotos'))
  const animalStableIdsById = new Map(animals.map(animal => [animal._id, animal.stableId]))
  const snapshot = buildPublicPetGallerySnapshot({
    animals: animals.map(toAdminAnimal),
    photos: photos.map(photo => toAdminPhoto(photo, animalStableIdsById)),
    now,
    createRevision: args.revision ? () => args.revision as string : undefined,
  })
  const existing = await findByField<{ _id: string }>(ctx, 'petGalleryPublicSnapshot', 'key', PET_GALLERY_SNAPSHOT_KEY)
  const expectedMinimumPhotoCount = Math.max(0, Math.floor(args.expectedMinimumPhotoCount ?? 0))

  if (!existing && args.requireExistingSnapshot) {
    throw new Error('Pet gallery migration required before first admin publish')
  }

  if (!existing && expectedMinimumPhotoCount > 0 && snapshot.photos.length < expectedMinimumPhotoCount) {
    throw new Error(
      `Pet gallery migration required before first publish: Convex public snapshot has ${snapshot.photos.length} of ${expectedMinimumPhotoCount} static photos.`,
    )
  }

  if (existing) {
    await petGalleryDb(ctx).patch(existing._id, {
      revision: snapshot.revision,
      publishedAt: snapshot.publishedAt,
      snapshot,
    })
  } else {
    await petGalleryDb(ctx).insert('petGalleryPublicSnapshot', {
      key: PET_GALLERY_SNAPSHOT_KEY,
      revision: snapshot.revision,
      publishedAt: snapshot.publishedAt,
      snapshot,
    })
  }

  await petGalleryDb(ctx).insert('petGalleryPublishHistory', {
    revision: snapshot.revision,
    publishedAt: snapshot.publishedAt,
    photoCount: snapshot.photos.length,
    animalCount: snapshot.animals.length,
    actor,
  })
  await touchDraft(ctx, actor, now, snapshot.revision)
  return {
    revision: snapshot.revision,
    publishedAt: snapshot.publishedAt,
    photoCount: snapshot.photos.length,
    animalCount: snapshot.animals.length,
  }
}

export async function beginPhotoHardDeleteHandler(ctx: PetGalleryContext, args: { photoId: string }) {
  const actor = await requirePetGalleryAdmin(ctx)
  const photo = await getPhoto(ctx, args.photoId)
  const now = Date.now()
  const variantKeys = Object.values(photo.variants).map(variant => variant.key)
  const cleanupId = await petGalleryDb(ctx).insert('petGalleryDeletedPhotoFiles', {
    photoStableId: photo.stableId,
    variantKeys,
    status: 'pending',
    attempts: 0,
    createdAt: now,
    updatedAt: now,
    actor,
  })

  await removePhotoFromPublicSnapshot(ctx, photo.stableId)
  await petGalleryDb(ctx).delete(args.photoId)
  await touchDraft(ctx, actor, now)
  return { cleanupId: cleanupId as CleanupId, variantKeys }
}

export async function listPendingPhotoFileCleanupsHandler(ctx: PetGalleryContext, _args: Record<string, never>) {
  await requirePetGalleryAdmin(ctx)
  const pending = await listByField<CleanupDoc>(ctx, 'petGalleryDeletedPhotoFiles', 'status', 'pending')
  const failed = await listByField<CleanupDoc>(ctx, 'petGalleryDeletedPhotoFiles', 'status', 'failed')
  return [...pending, ...failed].toSorted((first, second) => first.createdAt - second.createdAt)
}

export async function recordPhotoFileCleanupResultHandler(
  ctx: PetGalleryContext,
  args: {
    cleanupId: string
    ok: boolean
    error?: string
    remainingVariantKeys?: string[]
  },
) {
  await requirePetGalleryAdmin(ctx)
  const cleanup = (await petGalleryDb(ctx).get(args.cleanupId)) as CleanupDoc | null

  if (!cleanup) throw new Error('Pet gallery photo cleanup not found')
  if (cleanup.status === 'complete') return null

  await petGalleryDb(ctx).patch(args.cleanupId, {
    status: args.ok ? 'complete' : 'failed',
    variantKeys: args.remainingVariantKeys ? uniqueVariantKeys(args.remainingVariantKeys) : cleanup.variantKeys,
    attempts: cleanup.attempts + 1,
    lastError: args.ok ? undefined : (args.error ?? 'Unknown pet gallery file cleanup failure'),
    updatedAt: Date.now(),
  })
  return null
}

export const getPublicSnapshot = query({
  args: {},
  returns: v.union(petGalleryPublicSnapshotValidator, v.null()),
  handler: (ctx, args) => getPublicSnapshotHandler(asPetGalleryContext(ctx), args),
})

export const getAdminState = query({
  args: {},
  returns: adminStateValidator,
  handler: (ctx, args) => getAdminStateHandler(asPetGalleryContext(ctx), args),
})

export const createAnimal = mutation({
  args: {
    stableId: v.string(),
    name: v.string(),
    species: v.optional(petGalleryAnimalSpeciesValidator),
    color: v.string(),
    sortOrder: v.number(),
  },
  returns: v.id('petGalleryAnimals'),
  handler: (ctx, args) => createAnimalHandler(asPetGalleryContext(ctx), args),
})

export const updateAnimal = mutation({
  args: {
    animalId: v.id('petGalleryAnimals'),
    name: v.string(),
    species: v.optional(petGalleryAnimalSpeciesValidator),
    color: v.string(),
    sortOrder: v.number(),
  },
  returns: v.null(),
  handler: (ctx, args) => updateAnimalHandler(asPetGalleryContext(ctx), args),
})

export const hideAnimal = mutation({
  args: {
    animalId: v.id('petGalleryAnimals'),
  },
  returns: v.null(),
  handler: (ctx, args) => hideAnimalHandler(asPetGalleryContext(ctx), args),
})

export const restoreAnimal = mutation({
  args: {
    animalId: v.id('petGalleryAnimals'),
  },
  returns: v.null(),
  handler: (ctx, args) => restoreAnimalHandler(asPetGalleryContext(ctx), args),
})

export const createPhotoDraft = mutation({
  args: {
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
  },
  returns: v.id('petGalleryPhotos'),
  handler: (ctx, args) => createPhotoDraftHandler(asPetGalleryContext(ctx), args),
})

export const recordPendingVariantUpload = mutation({
  args: {
    key: v.string(),
    url: v.string(),
    name: v.string(),
    size: v.number(),
    mimeType: v.string(),
  },
  returns: v.id('petGalleryUploadedVariantFiles'),
  handler: (ctx, args) => recordPendingVariantUploadHandler(asPetGalleryContext(ctx), args),
})

export const beginUploadedVariantCleanup = mutation({
  args: {
    variantKeys: v.array(v.string()),
  },
  returns: v.object({
    variantKeys: v.array(v.string()),
  }),
  handler: (ctx, args) => beginUploadedVariantCleanupHandler(asPetGalleryContext(ctx), args),
})

export const recordUploadedVariantCleanupResult = mutation({
  args: {
    variantKeys: v.array(v.string()),
    ok: v.boolean(),
    error: v.optional(v.string()),
  },
  returns: v.null(),
  handler: (ctx, args) => recordUploadedVariantCleanupResultHandler(asPetGalleryContext(ctx), args),
})

export const updatePhotoDraft = mutation({
  args: {
    photoId: v.id('petGalleryPhotos'),
    title: v.optional(v.union(v.string(), v.null())),
    caption: v.optional(v.union(v.string(), v.null())),
    altText: v.optional(v.union(v.string(), v.null())),
    internalNotes: v.optional(v.union(v.string(), v.null())),
    variants: v.optional(petGalleryVariantsValidator),
    animalIds: v.optional(v.array(v.id('petGalleryAnimals'))),
    draftVisible: v.optional(v.boolean()),
    draftOrder: v.optional(v.number()),
    favorite: v.optional(v.boolean()),
    cover: v.optional(v.boolean()),
    approximateDate: v.optional(v.union(petGalleryApproximateDateValidator, v.null())),
  },
  returns: v.null(),
  handler: (ctx, args) => updatePhotoDraftHandler(asPetGalleryContext(ctx), args),
})

export const bulkTagPhotos = mutation({
  args: {
    photoIds: v.array(v.id('petGalleryPhotos')),
    animalIds: v.array(v.id('petGalleryAnimals')),
    mode: v.union(v.literal('add'), v.literal('remove'), v.literal('replace')),
  },
  returns: v.null(),
  handler: (ctx, args) => bulkTagPhotosHandler(asPetGalleryContext(ctx), args),
})

export const reorderPhotos = mutation({
  args: {
    photoIds: v.array(v.id('petGalleryPhotos')),
  },
  returns: v.null(),
  handler: (ctx, args) => reorderPhotosHandler(asPetGalleryContext(ctx), args),
})

export const publishDraft = mutation({
  args: {
    now: v.optional(v.number()),
    revision: v.optional(v.string()),
    expectedMinimumPhotoCount: v.optional(v.number()),
    requireExistingSnapshot: v.optional(v.boolean()),
  },
  returns: publishDraftReturnValidator,
  handler: (ctx, args) => publishDraftHandler(asPetGalleryContext(ctx), args),
})

export const beginPhotoHardDelete = mutation({
  args: {
    photoId: v.id('petGalleryPhotos'),
  },
  returns: beginPhotoHardDeleteReturnValidator,
  handler: (ctx, args) => beginPhotoHardDeleteHandler(asPetGalleryContext(ctx), args),
})

export const listPendingPhotoFileCleanups = query({
  args: {},
  returns: v.array(cleanupReturnValidator),
  handler: (ctx, args) => listPendingPhotoFileCleanupsHandler(asPetGalleryContext(ctx), args),
})

export const recordPhotoFileCleanupResult = mutation({
  args: {
    cleanupId: v.id('petGalleryDeletedPhotoFiles'),
    ok: v.boolean(),
    error: v.optional(v.string()),
    remainingVariantKeys: v.optional(v.array(v.string())),
  },
  returns: v.null(),
  handler: (ctx, args) => recordPhotoFileCleanupResultHandler(asPetGalleryContext(ctx), args),
})
