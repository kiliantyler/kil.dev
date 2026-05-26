import { describe, expect, it, vi } from 'vitest'
import { flushPendingPhotoPatchState } from './pending-photo-patches'

describe('flushPendingPhotoPatchState', () => {
  it('saves pending patches before the caller continues', async () => {
    const events: string[] = []
    const pending = {
      patches: new Map([['photos:1', { caption: 'Updated caption' }]]),
      timeouts: new Map([['photos:1', setTimeout(() => null, 10_000)]]),
    }

    await flushPendingPhotoPatchState({
      pending,
      savePatch: async () => {
        events.push('save')
      },
      trackMutation: async mutation => mutation,
    })
    events.push('publish')

    expect(events).toEqual(['save', 'publish'])
    expect(pending.patches.size).toBe(0)
    expect(pending.timeouts.size).toBe(0)
  })

  it('keeps failed patches pending so navigation warnings and retries still see them', async () => {
    const pending = {
      patches: new Map([['photos:1', { caption: 'Unsaved caption' }]]),
      timeouts: new Map<string, ReturnType<typeof setTimeout>>(),
    }

    await expect(
      flushPendingPhotoPatchState({
        pending,
        savePatch: vi.fn().mockRejectedValue(new Error('save failed')),
        trackMutation: async mutation => mutation,
      }),
    ).rejects.toThrow('save failed')

    expect(pending.patches.get('photos:1')).toEqual({ caption: 'Unsaved caption' })
  })
})
