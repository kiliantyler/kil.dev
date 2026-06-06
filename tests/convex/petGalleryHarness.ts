import { vi } from 'vitest'
import type { PetGalleryImageVariant, PetGalleryImageVariants } from '../../src/lib/pet-gallery/types'

type AuthMode = 'authorized' | 'secondAdmin' | 'wrongEmail' | 'wrongOrg' | 'nestedAllowedOrg' | 'unauth'
type AuthUser = {
  id: string
  email: string
  firstName: string
  lastName: string
}
type Row = Record<string, unknown> & {
  _id: string
  _creationTime: number
}

const TABLE_PREFIXES = {
  petGalleryAnimals: 'animals',
  petGalleryPhotos: 'photos',
  petGalleryPublicSnapshot: 'snapshots',
  petGalleryPublishHistory: 'history',
  petGalleryDeletedPhotoFiles: 'cleanups',
  petGalleryUploadedVariantFiles: 'uploads',
  petGalleryDraft: 'drafts',
} as const

type TableName = keyof typeof TABLE_PREFIXES

class MemoryQuery {
  constructor(
    private readonly rows: Row[],
    private readonly filter?: (row: Row) => boolean,
  ) {}

  withIndex(_index: string, range?: (q: { eq: (field: string, value: unknown) => (row: Row) => boolean }) => unknown) {
    const resolved = range?.({
      eq: (field, value) => (row: Row) => row[field] === value,
    })

    return new MemoryQuery(
      this.rows,
      typeof resolved === 'function' ? (resolved as (row: Row) => boolean) : this.filter,
    )
  }

  async collect() {
    return this.filter ? this.rows.filter(this.filter) : [...this.rows]
  }

  async first() {
    return (await this.collect())[0] ?? null
  }

  async unique() {
    const rows = await this.collect()
    if (rows.length > 1) throw new Error('Query returned more than one row')
    return rows[0] ?? null
  }
}

class PetGalleryMemoryDb {
  private readonly rows = new Map<string, Row>()
  private readonly tables = new Map<TableName, string[]>()
  private nextId = 1
  private now = 1_800_000_000_000

  query(table: string) {
    const ids = this.tables.get(table as TableName) ?? []
    return new MemoryQuery(ids.flatMap(id => this.rows.get(id) ?? []))
  }

  async get(id: string) {
    return this.rows.get(id) ?? null
  }

  async insert(table: TableName, value: Record<string, unknown>) {
    const id = `${TABLE_PREFIXES[table]}:${this.nextId++}`
    const row = {
      _id: id,
      _creationTime: this.now++,
      ...value,
    }

    this.rows.set(id, row)
    this.tables.set(table, [...(this.tables.get(table) ?? []), id])
    return id
  }

  async patch(id: string, value: Record<string, unknown>) {
    const existing = this.rows.get(id)
    if (!existing) throw new Error(`Missing row ${id}`)

    for (const [key, patchValue] of Object.entries(value)) {
      if (patchValue === undefined) {
        delete existing[key]
      } else {
        existing[key] = patchValue
      }
    }
  }

  async delete(id: string) {
    this.rows.delete(id)

    for (const [table, ids] of this.tables) {
      this.tables.set(
        table,
        ids.filter(rowId => rowId !== id),
      )
    }
  }
}

function authorizedIdentity() {
  return {
    subject: 'user_admin',
    name: 'Admin User',
    token: {
      claims: {
        org_id: 'org_good',
      },
    },
  }
}

function secondAdminIdentity() {
  return {
    subject: 'user_second_admin',
    name: 'Second Admin',
    token: {
      claims: {
        org_id: 'org_good',
      },
    },
  }
}

function identityForMode(auth: AuthMode) {
  if (auth === 'unauth') return null
  if (auth === 'wrongEmail') return { ...authorizedIdentity(), email: 'other@example.com' }
  if (auth === 'secondAdmin') return secondAdminIdentity()
  if (auth === 'wrongOrg') {
    return {
      ...authorizedIdentity(),
      token: {
        claims: {
          org_id: 'org_bad',
        },
      },
    }
  }
  if (auth === 'nestedAllowedOrg') {
    return {
      ...authorizedIdentity(),
      token: {
        claims: {
          org_id: 'org_bad',
          nested: {
            org_id: 'org_good',
          },
        },
      },
    }
  }
  return authorizedIdentity()
}

function authUserForMode(auth: AuthMode): AuthUser | null {
  if (auth === 'unauth') return null

  return {
    id: auth === 'secondAdmin' ? 'user_second_admin' : 'user_admin',
    email: auth === 'wrongEmail' ? 'other@example.com' : 'Admin@Example.com',
    firstName: auth === 'secondAdmin' ? 'Second' : 'Admin',
    lastName: 'User',
  }
}

export function createPetGalleryHarness({
  auth = 'authorized',
  db,
}: {
  auth?: AuthMode
  db?: PetGalleryMemoryDb
} = {}) {
  vi.stubEnv('ADMIN_EMAIL', 'admin@example.com')
  vi.stubEnv('WORKOS_ORG_ID', 'org_good')
  vi.stubEnv('WORKOS_API_KEY', 'sk_test_placeholder')
  vi.stubEnv('WORKOS_CLIENT_ID', 'client_test_placeholder')
  vi.stubEnv('WORKOS_WEBHOOK_SECRET', 'whsec_test_placeholder')

  const memoryDb = db ?? new PetGalleryMemoryDb()
  const ctx = {
    db: memoryDb,
    auth: {
      getUserIdentity: async () => identityForMode(auth),
    },
    runQuery: async (_reference: unknown, args: { id?: unknown }) => {
      const user = authUserForMode(auth)
      return user && args.id === user.id ? user : null
    },
  }

  return { ctx, db: memoryDb }
}

function variant<Kind extends PetGalleryImageVariant['kind']>(
  photoStableId: string,
  kind: Kind,
): PetGalleryImageVariant & { kind: Kind } {
  return {
    kind,
    key: `${photoStableId}/${kind}-storage-key`,
    url: `https://cdn.example.com/${photoStableId}/${kind}.webp`,
    width: kind === 'thumb' ? 320 : kind === 'card' ? 768 : kind === 'display' ? 1600 : 2560,
    height: kind === 'thumb' ? 214 : kind === 'card' ? 512 : kind === 'display' ? 1067 : 1707,
    byteSize: kind === 'full' ? 200_000 : 20_000,
    mimeType: 'image/webp',
    extension: 'webp',
  }
}

export function petGalleryVariants(photoStableId: string): PetGalleryImageVariants {
  return {
    thumb: variant(photoStableId, 'thumb'),
    card: variant(photoStableId, 'card'),
    display: variant(photoStableId, 'display'),
    full: variant(photoStableId, 'full'),
  }
}
