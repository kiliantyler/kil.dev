import { env } from '@/env'
import { PetGalleryAdminUnauthorizedError, requirePetGalleryAdminAuthContext } from '@/lib/pet-gallery/admin-auth'
import {
  PET_GALLERY_UPLOADTHING_MAX_FILE_COUNT,
  PET_GALLERY_UPLOADTHING_MAX_FILE_SIZE,
} from '@/lib/pet-gallery/upload-inputs'
import { ConvexHttpClient } from 'convex/browser'
import { createUploadthing, type FileRouter } from 'uploadthing/next'
import { UploadThingError, UTApi } from 'uploadthing/server'
import { api } from '../../../../convex/_generated/api'

const uploadThing = createUploadthing()

async function cleanupUploadedVariantAfterRecordFailure(key: string): Promise<string | null> {
  if (!env.UPLOADTHING_TOKEN) return 'UPLOADTHING_TOKEN is unavailable'
  try {
    await new UTApi({ token: env.UPLOADTHING_TOKEN }).deleteFiles([key])
    return null
  } catch (error) {
    return error instanceof Error ? error.message : 'Unknown UploadThing cleanup failure'
  }
}

export const petGalleryGeneratedImageVariantUploadConfig = {
  image: {
    maxFileCount: PET_GALLERY_UPLOADTHING_MAX_FILE_COUNT,
    maxFileSize: PET_GALLERY_UPLOADTHING_MAX_FILE_SIZE,
  },
} as const

export const petGalleryFileRouter = {
  generatedImageVariant: uploadThing(petGalleryGeneratedImageVariantUploadConfig)
    .middleware(async () => {
      let authContext: Awaited<ReturnType<typeof requirePetGalleryAdminAuthContext>>

      try {
        authContext = await requirePetGalleryAdminAuthContext()
      } catch (error) {
        if (
          error instanceof PetGalleryAdminUnauthorizedError ||
          (error instanceof Error && error.message === 'Pet gallery admin access denied')
        ) {
          throw new UploadThingError({
            code: 'FORBIDDEN',
            message: 'Pet gallery admin access denied',
          })
        }
        throw error
      }

      return authContext
    })
    .onUploadComplete(async ({ metadata, file }) => {
      try {
        if (!env.NEXT_PUBLIC_CONVEX_URL) {
          throw new UploadThingError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Missing Convex URL for pet gallery uploads',
          })
        }
        const client = new ConvexHttpClient(env.NEXT_PUBLIC_CONVEX_URL)
        client.setAuth(metadata.accessToken)
        await client.mutation(api.petGallery.recordPendingVariantUpload, {
          key: file.key,
          url: file.ufsUrl,
          name: file.name,
          size: file.size,
          mimeType: file.type,
        })
      } catch (error) {
        const cleanupError = await cleanupUploadedVariantAfterRecordFailure(file.key)
        if (cleanupError) {
          const message = error instanceof Error ? error.message : 'Unable to register pet gallery upload'
          throw new UploadThingError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `${message}; uploaded file ${file.key} cleanup failed: ${cleanupError}`,
          })
        }
        throw error
      }

      return {
        actor: metadata.actor,
        key: file.key,
        url: file.ufsUrl,
        name: file.name,
        size: file.size,
        mimeType: file.type,
      }
    }),
} satisfies FileRouter

export type PetGalleryFileRouter = typeof petGalleryFileRouter
