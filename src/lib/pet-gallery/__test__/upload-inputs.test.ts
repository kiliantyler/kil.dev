import { describe, expect, it } from 'vitest'
import {
  filterImageFiles,
  findDuplicateUpload,
  getImageFilesFromClipboard,
  getImageFilesFromDataTransfer,
} from '../upload-inputs'

const imageFile = new File(['image'], 'pet.webp', { type: 'image/webp' })
const jpegFile = new File(['jpeg'], 'pet.jpg', { type: 'image/jpeg' })
const textFile = new File(['text'], 'notes.txt', { type: 'text/plain' })

describe('filterImageFiles', () => {
  it('keeps image files and rejects non-image files', () => {
    expect(filterImageFiles([imageFile, textFile, jpegFile])).toEqual([imageFile, jpegFile])
  })
})

describe('getImageFilesFromDataTransfer', () => {
  it('normalizes drag and drop File inputs to images only', () => {
    expect(
      getImageFilesFromDataTransfer({
        files: [imageFile, textFile, jpegFile],
      }),
    ).toEqual([imageFile, jpegFile])
  })
})

describe('getImageFilesFromClipboard', () => {
  it('normalizes pasted File inputs to images only', () => {
    const clipboard = {
      items: [
        { kind: 'file', type: imageFile.type, getAsFile: () => imageFile },
        { kind: 'file', type: textFile.type, getAsFile: () => textFile },
        { kind: 'string', type: 'text/plain', getAsFile: () => null },
        { kind: 'file', type: jpegFile.type, getAsFile: () => jpegFile },
      ],
    }

    expect(getImageFilesFromClipboard(clipboard)).toEqual([imageFile, jpegFile])
  })

  it('falls back to clipboard files when items do not contain images', () => {
    expect(
      getImageFilesFromClipboard({
        items: [{ kind: 'string', type: 'text/plain', getAsFile: () => null }],
        files: [textFile, jpegFile],
      }),
    ).toEqual([jpegFile])
  })

  it('falls back to clipboard files when items are absent', () => {
    expect(
      getImageFilesFromClipboard({
        files: [imageFile, textFile],
      }),
    ).toEqual([imageFile])
  })
})

describe('findDuplicateUpload', () => {
  it('finds an existing photo with the same source hash', () => {
    expect(
      findDuplicateUpload({ sourceHash: 'abc' }, [
        { stableId: 'photo-1', sourceHash: 'abc' },
        { stableId: 'photo-2', sourceHash: 'def' },
      ]),
    ).toEqual({
      stableId: 'photo-1',
      sourceHash: 'abc',
    })
  })

  it('returns null when the incoming upload has no matching source hash', () => {
    expect(findDuplicateUpload({ sourceHash: 'missing' }, [{ stableId: 'photo-1', sourceHash: 'abc' }])).toBeNull()
  })

  it('returns null when the incoming upload has no source hash', () => {
    expect(findDuplicateUpload({}, [{ stableId: 'photo-1', sourceHash: 'abc' }])).toBeNull()
    expect(findDuplicateUpload({ sourceHash: null }, [{ stableId: 'photo-1', sourceHash: 'abc' }])).toBeNull()
  })
})
