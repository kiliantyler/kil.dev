import { parse } from 'exifr'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { petGalleryDateFromExifValue, readPetGalleryImageDate } from './image-date'

vi.mock('exifr', () => ({
  parse: vi.fn(),
}))

const parseMock = vi.mocked(parse)

describe('pet gallery image date metadata', () => {
  beforeEach(() => {
    parseMock.mockReset()
  })

  it('normalizes Date objects returned by the EXIF library', () => {
    expect(petGalleryDateFromExifValue(new Date(2021, 6, 9, 13, 45, 20))).toEqual({
      year: 2021,
      month: 7,
      day: 9,
    })
  })

  it('normalizes EXIF date strings returned by the EXIF library', () => {
    expect(petGalleryDateFromExifValue('2020:12:31 23:59:59')).toEqual({
      year: 2020,
      month: 12,
      day: 31,
    })
  })

  it('reads the first available capture date tag from image metadata', async () => {
    parseMock.mockResolvedValue({
      DateTimeOriginal: new Date(2022, 2, 14, 10, 30, 0),
      ModifyDate: new Date(2023, 3, 15, 10, 30, 0),
    })

    await expect(
      readPetGalleryImageDate(new File(['image-bytes'], 'sunny.jpg', { type: 'image/jpeg' })),
    ).resolves.toEqual({
      year: 2022,
      month: 3,
      day: 14,
    })
    expect(parseMock).toHaveBeenCalledWith(expect.any(File), [
      'DateTimeOriginal',
      'CreateDate',
      'ModifyDate',
      'DateCreated',
    ])
  })

  it('returns no date when metadata is missing or unreadable', async () => {
    parseMock.mockRejectedValue(new Error('invalid metadata'))

    await expect(
      readPetGalleryImageDate(new File(['image-bytes'], 'broken.jpg', { type: 'image/jpeg' })),
    ).resolves.toBeUndefined()
  })
})
