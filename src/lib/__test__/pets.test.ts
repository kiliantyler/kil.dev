import { describe, expect, it } from 'vitest'

import { PETS } from '@/lib/pets'

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

})
