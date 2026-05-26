import type { UploadQueueItem } from '@/lib/pet-gallery/admin-workspace'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { removeCompletedUploadQueueItems } from './pet-gallery-admin-photo-utils'
import { UploadDropzone } from './upload-dropzone'

describe('UploadDropzone', () => {
  it('does not render completed queue rows after workspace cleanup', () => {
    const queue: UploadQueueItem[] = [
      { id: 'complete-1', filename: 'finished.png', status: 'ready', message: 'Draft photo created' },
      { id: 'pending-1', filename: 'waiting.png', status: 'queued', message: 'Queued' },
    ]

    const html = renderToStaticMarkup(
      <UploadDropzone
        queue={removeCompletedUploadQueueItems(queue, ['complete-1'])}
        error={null}
        onFiles={vi.fn()}
        onError={vi.fn()}
      />,
    )

    expect(html).not.toContain('finished.png')
    expect(html).toContain('waiting.png')
  })
})
