import { describe, expect, it } from 'vitest'
import { isCurrentAnimalMutationVersion, nextAnimalMutationVersion } from './animal-mutation-versions'

describe('animal mutation versions', () => {
  it('rejects stale responses for the same animal', () => {
    const versions = new Map<string, number>()

    const firstVersion = nextAnimalMutationVersion(versions, 'aspen')
    const secondVersion = nextAnimalMutationVersion(versions, 'aspen')

    expect(isCurrentAnimalMutationVersion(versions, 'aspen', firstVersion)).toBe(false)
    expect(isCurrentAnimalMutationVersion(versions, 'aspen', secondVersion)).toBe(true)
  })

  it('keeps concurrent edits for different animals independent', () => {
    const versions = new Map<string, number>()

    const aspenVersion = nextAnimalMutationVersion(versions, 'aspen')
    const sunnyVersion = nextAnimalMutationVersion(versions, 'sunny')

    expect(isCurrentAnimalMutationVersion(versions, 'aspen', aspenVersion)).toBe(true)
    expect(isCurrentAnimalMutationVersion(versions, 'sunny', sunnyVersion)).toBe(true)
  })
})
