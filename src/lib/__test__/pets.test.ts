import { describe, expect, it } from 'vitest'

import { PETS, formatPetTypeSummary } from '@/lib/pets'
import { QUICK_FACTS } from '@/lib/quickfacts'

describe('PETS', () => {
  it('includes Gwen in the about page pet list with her details', () => {
    expect(PETS).toContainEqual(
      expect.objectContaining({
        id: 'gwen',
        name: 'Gwen',
        breed: 'Golden Retriever',
        birthday: '2025-10-18',
        gender: 'Female',
        description:
          "A sweet girl who thinks she is a tornado. When she isn't sleeping she is chewing on her big sister, Lux.",
      }),
    )
  })

  it('formats the current pet type counts for quick facts', () => {
    expect(formatPetTypeSummary(PETS)).toBe('3 dogs, 3 cats')
  })

  it('drives the Pets quick fact from the pet type counts', () => {
    expect(QUICK_FACTS.find(fact => fact.label === 'Pets')?.value).toBe('3 dogs, 3 cats')
  })
})
