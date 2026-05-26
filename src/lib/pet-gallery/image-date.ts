import { normalizePetGalleryApproximateDate } from './approximate-date'
import type { PetGalleryApproximateDate } from './types'

const PET_GALLERY_DATE_TAGS = ['DateTimeOriginal', 'CreateDate', 'ModifyDate', 'DateCreated'] as const

type ExifDateTag = (typeof PET_GALLERY_DATE_TAGS)[number]
type ExifDateResult = Partial<Record<ExifDateTag, unknown>>

export function petGalleryDateFromExifValue(value: unknown): PetGalleryApproximateDate | undefined {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return (
      normalizePetGalleryApproximateDate({
        year: value.getFullYear(),
        month: value.getMonth() + 1,
        day: value.getDate(),
      }) ?? undefined
    )
  }

  if (typeof value !== 'string') return undefined

  const match = value.match(/^(\d{4})[:/-](\d{2})[:/-](\d{2})(?:\s|T|$)/)
  if (!match) return undefined

  return (
    normalizePetGalleryApproximateDate({
      year: Number(match[1]),
      month: Number(match[2]),
      day: Number(match[3]),
    }) ?? undefined
  )
}

export async function readPetGalleryImageDate(file: File): Promise<PetGalleryApproximateDate | undefined> {
  if (!file.type.startsWith('image/')) return undefined

  try {
    const { parse } = await import('exifr')
    const metadata = (await parse(file, [...PET_GALLERY_DATE_TAGS])) as ExifDateResult | undefined

    for (const tag of PET_GALLERY_DATE_TAGS) {
      const date = petGalleryDateFromExifValue(metadata?.[tag])
      if (date) return date
    }
  } catch {
    return undefined
  }

  return undefined
}
