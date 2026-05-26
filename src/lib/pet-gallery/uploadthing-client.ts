import type { PetGalleryFileRouter } from '@/app/api/uploadthing/core'
import { generateReactHelpers } from '@uploadthing/react'

export const { uploadFiles } = generateReactHelpers<PetGalleryFileRouter>()
