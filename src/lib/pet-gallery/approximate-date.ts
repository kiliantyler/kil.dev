import type { PetGalleryApproximateDate } from './types'

export const PET_GALLERY_DATE_LIMITS = {
  year: { min: 1900, max: 2100 },
  month: { min: 1, max: 12 },
  day: { min: 1, max: 31 },
} as const

export function clampPetGalleryDatePart(part: keyof typeof PET_GALLERY_DATE_LIMITS, value: number): number {
  const limits = PET_GALLERY_DATE_LIMITS[part]
  return Math.min(limits.max, Math.max(limits.min, Math.trunc(value)))
}

export function parsePetGalleryDateInput(
  part: keyof typeof PET_GALLERY_DATE_LIMITS,
  value: string,
): number | undefined {
  if (!value.trim()) return undefined
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return undefined
  return clampPetGalleryDatePart(part, numericValue)
}

export function normalizePetGalleryApproximateDate(
  value: PetGalleryApproximateDate | null | undefined,
): PetGalleryApproximateDate | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  if (!Number.isFinite(value.year)) return null

  const year = clampPetGalleryDatePart('year', value.year)
  return {
    year,
    ...(Number.isFinite(value.month) ? { month: clampPetGalleryDatePart('month', value.month!) } : {}),
    ...(Number.isFinite(value.day) ? { day: clampPetGalleryDatePart('day', value.day!) } : {}),
  }
}
