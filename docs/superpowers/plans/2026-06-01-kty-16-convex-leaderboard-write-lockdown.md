# KTY-16 Convex Leaderboard Write Lockdown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lock down Convex leaderboard and game-session write surfaces so public clients cannot insert scores or mutate sessions directly.

**Architecture:** Keep Next.js route handlers as the public gameplay write boundary. Move raw Convex score/session writes behind internal mutations and expose only a narrow `convex/serverGameWrites.ts` action bridge that requires a server-only shared secret. Preserve current browser HTTP route behavior and add tests for both route behavior and public Convex export drift.

**Tech Stack:** Next.js App Router route handlers, TypeScript, Convex object-style functions, Vitest, Bun, Oxlint, T3 env validation.

---

## File Structure

- Modify `src/env.js`: add optional `CONVEX_GAME_WRITE_SECRET` and `requireConvexGameWriteSecret`.
- Modify `.env.example`: document `CONVEX_GAME_WRITE_SECRET`.
- Modify `src/env.test.ts`: cover the new helper and placeholder failure.
- Modify `convex/gameSessions.ts`: convert raw create/update/cleanup writes to internal mutations; keep read logic internal and make any public session read non-secret.
- Modify `convex/scores.ts`: remove the public raw score insertion mutation.
- Create `convex/serverGameWrites.ts`: public action bridge that requires `CONVEX_GAME_WRITE_SECRET` and delegates to internal Convex functions.
- Create `convex/__test__/serverGameWrites.test.ts`: unit-test secret validation and delegation behavior.
- Create `convex/__test__/publicGameWriteSurface.test.ts`: regression-test that raw public score/session write exports do not return.
- Modify `src/lib/game-validation.ts`: call server-authenticated Convex actions instead of public mutations/secret-returning public query.
- Modify `src/lib/leaderboard.ts`: call the server-authenticated score action instead of `scores.addScorePublic`.
- Modify `src/lib/__test__/game-validation.test.ts`: add helper-level coverage for server action usage.
- Modify `src/lib/__test__/leaderboard.test.ts`: add helper-level coverage for authenticated score insertion.
- Create `src/app/api/game/start/route.test.ts`: route success and failure coverage.
- Create `src/app/api/game/end/route.test.ts`: route success, validation failure, and invalid game result coverage.
- Create `src/app/api/scores/route.test.ts`: route success, missing session data, bad signature, and validation failure coverage.

## Task 1: Add Server Secret Env Contract

**Files:**
- Modify: `src/env.js`
- Modify: `.env.example`
- Modify: `src/env.test.ts`

- [ ] **Step 1: Write failing env tests**

Add these tests to `src/env.test.ts`:

```ts
it('exposes the Convex game write secret for server-only write actions', async () => {
  const { env, requireConvexGameWriteSecret } = await importEnvWith({
    CONVEX_GAME_WRITE_SECRET: 'game-write-secret-test-value',
  })

  expect(env.CONVEX_GAME_WRITE_SECRET).toBe('game-write-secret-test-value')
  expect(requireConvexGameWriteSecret()).toBe('game-write-secret-test-value')
})

it('fails closed when the Convex game write secret is missing', async () => {
  const { requireConvexGameWriteSecret } = await importEnvWith({
    CONVEX_GAME_WRITE_SECRET: '',
  })

  expect(() => requireConvexGameWriteSecret()).toThrow(
    'Missing Convex game write environment variables: CONVEX_GAME_WRITE_SECRET',
  )
})

it('fails closed when the Convex game write secret still has a placeholder', async () => {
  const { requireConvexGameWriteSecret } = await importEnvWith({
    CONVEX_GAME_WRITE_SECRET: 'replace-with-game-write-secret',
  })

  expect(() => requireConvexGameWriteSecret()).toThrow(
    'Replace Convex game write placeholder environment variables: CONVEX_GAME_WRITE_SECRET',
  )
})
```

- [ ] **Step 2: Run env tests and verify failure**

Run:

```bash
bun run build:runtimes
bunx vitest run src/env.test.ts
```

Expected: `requireConvexGameWriteSecret` is not exported or `CONVEX_GAME_WRITE_SECRET` is not defined.

- [ ] **Step 3: Implement env helper**

Update `src/env.js`:

```ts
export const env = createEnv({
  server: {
    NODE_ENV: z.enum(['development', 'test', 'production']),
    BLOB_READ_WRITE_TOKEN: z.string().optional(),
    CONVEX_DEPLOYMENT: z.string().optional(),
    CONVEX_DEPLOY_KEY: z.string().optional(),
    CONVEX_GAME_WRITE_SECRET: z.string().optional(),
    PET_GALLERY_CONVEX_ACCESS_TOKEN: z.string().optional(),
    WORKOS_API_KEY: z.string().optional(),
    WORKOS_CLIENT_ID: z.string().optional(),
    WORKOS_WEBHOOK_SECRET: z.string().optional(),
    WORKOS_ACTION_SECRET: z.string().optional(),
    WORKOS_COOKIE_PASSWORD: z.string().min(32).optional(),
    PET_GALLERY_WORKOS_ORG_ID: z.string().optional(),
    PET_GALLERY_ADMIN_EMAIL: z.string().email().optional(),
    UPLOADTHING_TOKEN: z.string().optional(),
  },
  client: {
    NEXT_PUBLIC_POSTHOG_KEY: z.string(),
    NEXT_PUBLIC_POSTHOG_HOST: z.string(),
    NEXT_PUBLIC_CONVEX_URL: z.string().or(z.literal('')).optional(),
    NEXT_PUBLIC_WORKOS_REDIRECT_URI: z.string().url().optional(),
  },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
    CONVEX_DEPLOYMENT: process.env.CONVEX_DEPLOYMENT,
    CONVEX_DEPLOY_KEY: process.env.CONVEX_DEPLOY_KEY,
    CONVEX_GAME_WRITE_SECRET: process.env.CONVEX_GAME_WRITE_SECRET,
    PET_GALLERY_CONVEX_ACCESS_TOKEN: process.env.PET_GALLERY_CONVEX_ACCESS_TOKEN,
    WORKOS_API_KEY: process.env.WORKOS_API_KEY,
    WORKOS_CLIENT_ID: process.env.WORKOS_CLIENT_ID,
    WORKOS_WEBHOOK_SECRET: process.env.WORKOS_WEBHOOK_SECRET,
    WORKOS_ACTION_SECRET: process.env.WORKOS_ACTION_SECRET,
    WORKOS_COOKIE_PASSWORD: process.env.WORKOS_COOKIE_PASSWORD,
    PET_GALLERY_WORKOS_ORG_ID: process.env.PET_GALLERY_WORKOS_ORG_ID,
    PET_GALLERY_ADMIN_EMAIL: process.env.PET_GALLERY_ADMIN_EMAIL,
    UPLOADTHING_TOKEN: process.env.UPLOADTHING_TOKEN,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
    NEXT_PUBLIC_WORKOS_REDIRECT_URI: process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
})

export function requireConvexGameWriteSecret() {
  const required = {
    CONVEX_GAME_WRITE_SECRET: env.CONVEX_GAME_WRITE_SECRET,
  }
  const missing = Object.entries(required)
    .filter(([, value]) => !value)
    .map(([key]) => key)
  const placeholders = Object.entries(required)
    .filter(([, value]) => value?.includes('placeholder') || value?.startsWith('replace-with-'))
    .map(([key]) => key)

  if (missing.length > 0) {
    throw new Error(`Missing Convex game write environment variables: ${missing.join(', ')}`)
  }
  if (placeholders.length > 0) {
    throw new Error(`Replace Convex game write placeholder environment variables: ${placeholders.join(', ')}`)
  }

  return required.CONVEX_GAME_WRITE_SECRET ?? ''
}
```

Update `.env.example` by adding:

```dotenv
CONVEX_GAME_WRITE_SECRET=
```

Update `BASE_ENV` in `src/env.test.ts`:

```ts
const BASE_ENV = {
  NODE_ENV: 'test',
  NEXT_PUBLIC_POSTHOG_KEY: 'test-posthog-key',
  NEXT_PUBLIC_POSTHOG_HOST: 'https://example.test',
  NEXT_PUBLIC_CONVEX_URL: 'https://example.convex.cloud',
  CONVEX_GAME_WRITE_SECRET: 'game-write-secret-test-value',
  WORKOS_API_KEY: 'sk_test_valid_test_value',
  WORKOS_CLIENT_ID: 'client_test_valid_value',
  WORKOS_WEBHOOK_SECRET: 'whsec_test_valid_value',
  WORKOS_ACTION_SECRET: 'action_secret_test_valid_value',
  WORKOS_COOKIE_PASSWORD: 'a'.repeat(32),
  NEXT_PUBLIC_WORKOS_REDIRECT_URI: 'http://localhost:3000/auth/callback',
  PET_GALLERY_WORKOS_ORG_ID: 'org_test_valid_value',
  PET_GALLERY_ADMIN_EMAIL: 'admin@example.test',
  UPLOADTHING_TOKEN: 'uploadthing-token-valid-value',
}
```

- [ ] **Step 4: Run env tests and verify pass**

Run:

```bash
bunx vitest run src/env.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/env.js .env.example src/env.test.ts
git commit -m "feat: add Convex game write secret env"
```

## Task 2: Add Authenticated Convex Write Bridge

**Files:**
- Create: `convex/serverGameWrites.ts`
- Modify: `convex/gameSessions.ts`
- Modify: `convex/scores.ts`
- Create: `convex/__test__/serverGameWrites.test.ts`

- [ ] **Step 1: Write failing Convex bridge tests**

Create `convex/__test__/serverGameWrites.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { assertValidGameWriteSecret, createGameSession, updateGameSession, addScore } from '../serverGameWrites'

describe('assertValidGameWriteSecret', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
  })

  it('accepts the configured write secret', () => {
    vi.stubEnv('CONVEX_GAME_WRITE_SECRET', 'server-secret')

    expect(() => assertValidGameWriteSecret('server-secret')).not.toThrow()
  })

  it('rejects a missing deployment secret', () => {
    vi.stubEnv('CONVEX_GAME_WRITE_SECRET', '')

    expect(() => assertValidGameWriteSecret('server-secret')).toThrow('Convex game write secret is not configured')
  })

  it('rejects a mismatched caller secret', () => {
    vi.stubEnv('CONVEX_GAME_WRITE_SECRET', 'server-secret')

    expect(() => assertValidGameWriteSecret('wrong-secret')).toThrow('Unauthorized game write')
  })
})

describe('server game write actions', () => {
  beforeEach(() => {
    vi.stubEnv('CONVEX_GAME_WRITE_SECRET', 'server-secret')
  })

  it('delegates session creation to an internal mutation after auth', async () => {
    const runMutation = vi.fn().mockResolvedValue('session-id')
    const result = await createGameSession._handler(
      { runMutation },
      { writeSecret: 'server-secret', sessionSecret: 'session-secret', seed: 123 },
    )

    expect(result).toBe('session-id')
    expect(runMutation).toHaveBeenCalledWith(expect.anything(), {
      secret: 'session-secret',
      seed: 123,
    })
  })

  it('delegates session updates to an internal mutation after auth', async () => {
    const runMutation = vi.fn().mockResolvedValue(null)
    const result = await updateGameSession._handler(
      { runMutation },
      {
        writeSecret: 'server-secret',
        sessionId: 'session-id',
        isActive: false,
        validatedScore: 120,
      },
    )

    expect(result).toBeNull()
    expect(runMutation).toHaveBeenCalledWith(expect.anything(), {
      sessionId: 'session-id',
      isActive: false,
      validatedScore: 120,
    })
  })

  it('delegates score insertion to an internal mutation after auth', async () => {
    const runMutation = vi.fn().mockResolvedValue(2)
    const result = await addScore._handler({ runMutation }, { writeSecret: 'server-secret', name: 'ABC', score: 200 })

    expect(result).toBe(2)
    expect(runMutation).toHaveBeenCalledWith(expect.anything(), {
      name: 'ABC',
      score: 200,
    })
  })
})
```

- [ ] **Step 2: Run bridge test and verify failure**

Run:

```bash
bunx vitest run convex/__test__/serverGameWrites.test.ts
```

Expected: FAIL because `convex/serverGameWrites.ts` does not exist.

- [ ] **Step 3: Implement internal Convex writes and bridge actions**

In `convex/gameSessions.ts`, change imports and function builders:

```ts
import { v } from 'convex/values'
import { internalMutation, internalQuery, query } from './_generated/server'
```

Rename public write exports to internal names:

```ts
export const createSessionWithId = internalMutation({
  args: {
    secret: v.string(),
    seed: v.number(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const now = Date.now()
    const sessionId = await ctx.db.insert('gameSessions', {
      secret: args.secret,
      seed: args.seed,
      createdAt: now,
      expiresAt: now + SESSION_TTL_MS,
      isActive: true,
    })
    return sessionId.toString()
  },
})

export const updateSession = internalMutation({
  args: {
    sessionId: v.id('gameSessions'),
    isActive: v.boolean(),
    validatedScore: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId)
    if (!session) {
      throw new Error('Session not found')
    }
    if (Date.now() > session.expiresAt) {
      throw new Error('Session expired')
    }
    await ctx.db.patch(args.sessionId, {
      isActive: args.isActive,
      validatedScore: args.validatedScore,
    })
    return null
  },
})

export const cleanupExpiredSessions = internalMutation({
  args: {},
  returns: v.object({
    deleted: v.number(),
  }),
  handler: async ctx => {
    const now = Date.now()
    const expiredSessions = await ctx.db
      .query('gameSessions')
      .withIndex('by_expiresAt')
      .filter(q => q.lt(q.field('expiresAt'), now))
      .collect()

    for (const session of expiredSessions) {
      await ctx.db.delete(session._id)
    }

    return { deleted: expiredSessions.length }
  },
})
```

Change `getSessionPublic` so it does not return `secret`:

```ts
export const getSessionPublic = query({
  args: {
    sessionId: v.id('gameSessions'),
  },
  returns: v.union(
    v.object({
      id: v.string(),
      seed: v.number(),
      createdAt: v.number(),
      isActive: v.boolean(),
      validatedScore: v.optional(v.number()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId)
    if (!session) return null
    if (Date.now() > session.expiresAt) return null

    return {
      id: session._id.toString(),
      seed: session.seed,
      createdAt: session.createdAt,
      isActive: session.isActive,
      validatedScore: session.validatedScore,
    }
  },
})
```

In `convex/scores.ts`, delete the `mutation` import and remove `addScorePublic` entirely:

```ts
import { v } from 'convex/values'
import { internalMutation, query, type DatabaseReader } from './_generated/server'
```

Create `convex/serverGameWrites.ts`:

```ts
'use node'

import { v } from 'convex/values'
import { internal } from './_generated/api'
import { action } from './_generated/server'

type ServerGameSession =
  | {
      id: string
      secret: string
      seed: number
      createdAt: number
      isActive: boolean
      validatedScore?: number
    }
  | null

export function assertValidGameWriteSecret(writeSecret: string) {
  const expected = process.env.CONVEX_GAME_WRITE_SECRET
  if (!expected) {
    throw new Error('Convex game write secret is not configured')
  }
  if (writeSecret !== expected) {
    throw new Error('Unauthorized game write')
  }
}

export const getGameSessionForServer = action({
  args: {
    writeSecret: v.string(),
    sessionId: v.id('gameSessions'),
  },
  returns: v.union(
    v.object({
      id: v.string(),
      secret: v.string(),
      seed: v.number(),
      createdAt: v.number(),
      isActive: v.boolean(),
      validatedScore: v.optional(v.number()),
    }),
    v.null(),
  ),
  handler: async (ctx, args): Promise<ServerGameSession> => {
    assertValidGameWriteSecret(args.writeSecret)
    return ctx.runQuery(internal.gameSessions.getSession, { sessionId: args.sessionId })
  },
})

export const createGameSession = action({
  args: {
    writeSecret: v.string(),
    sessionSecret: v.string(),
    seed: v.number(),
  },
  returns: v.string(),
  handler: async (ctx, args): Promise<string> => {
    assertValidGameWriteSecret(args.writeSecret)
    return ctx.runMutation(internal.gameSessions.createSessionWithId, {
      secret: args.sessionSecret,
      seed: args.seed,
    })
  },
})

export const updateGameSession = action({
  args: {
    writeSecret: v.string(),
    sessionId: v.id('gameSessions'),
    isActive: v.boolean(),
    validatedScore: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    assertValidGameWriteSecret(args.writeSecret)
    await ctx.runMutation(internal.gameSessions.updateSession, {
      sessionId: args.sessionId,
      isActive: args.isActive,
      validatedScore: args.validatedScore,
    })
    return null
  },
})

export const addScore = action({
  args: {
    writeSecret: v.string(),
    name: v.string(),
    score: v.number(),
  },
  returns: v.union(v.number(), v.null()),
  handler: async (ctx, args): Promise<number | null> => {
    assertValidGameWriteSecret(args.writeSecret)
    return ctx.runMutation(internal.scores.addScore, {
      name: args.name,
      score: args.score,
    })
  },
})
```

- [ ] **Step 4: Run Convex generation**

Run:

```bash
bun run build:runtimes
```

Expected: generated runtime files update if required; generated ignored files remain ignored.

- [ ] **Step 5: Run bridge test and verify pass**

Run:

```bash
bunx vitest run convex/__test__/serverGameWrites.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add convex/gameSessions.ts convex/scores.ts convex/serverGameWrites.ts convex/__test__/serverGameWrites.test.ts
git commit -m "feat: gate game write actions"
```

## Task 3: Rewire Server Helpers to Authenticated Actions

**Files:**
- Modify: `src/lib/game-validation.ts`
- Modify: `src/lib/leaderboard.ts`
- Modify: `src/lib/__test__/game-validation.test.ts`
- Modify: `src/lib/__test__/leaderboard.test.ts`

- [ ] **Step 1: Add failing helper tests**

In `src/lib/__test__/leaderboard.test.ts`, add a mocked action test:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const action = vi.fn()
const query = vi.fn()
const setAuth = vi.fn()

vi.mock('convex/browser', () => ({
  ConvexHttpClient: vi.fn(() => ({ action, query, setAuth })),
}))

vi.mock('../../../../convex/_generated/api', () => ({
  api: {
    scores: {
      checkQualification: 'scores.checkQualification',
    },
    serverGameWrites: {
      addScore: 'serverGameWrites.addScore',
    },
  },
}))

describe('addScoreToLeaderboard Convex write path', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'test-posthog-key')
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_HOST', 'https://example.test')
    vi.stubEnv('NEXT_PUBLIC_CONVEX_URL', 'https://example.convex.cloud')
    vi.stubEnv('CONVEX_GAME_WRITE_SECRET', 'game-write-secret-test-value')
    action.mockReset()
    action.mockResolvedValue(3)
    query.mockReset()
    setAuth.mockReset()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('uses the server-authenticated score action', async () => {
    const { addScoreToLeaderboard } = await import('../leaderboard')

    await expect(
      addScoreToLeaderboard({ id: 'entry-id', name: 'ABC', score: 200, timestamp: 123 }),
    ).resolves.toBe(3)

    expect(action).toHaveBeenCalledWith('serverGameWrites.addScore', {
      writeSecret: 'game-write-secret-test-value',
      name: 'ABC',
      score: 200,
    })
  })
})
```

In `src/lib/__test__/game-validation.test.ts`, add:

```ts
const gameAction = vi.fn()
const gameQuery = vi.fn()
const gameSetAuth = vi.fn()

vi.mock('convex/browser', () => ({
  ConvexHttpClient: vi.fn(() => ({ action: gameAction, query: gameQuery, setAuth: gameSetAuth })),
}))

vi.mock('../../../../convex/_generated/api', () => ({
  api: {
    serverGameWrites: {
      createGameSession: 'serverGameWrites.createGameSession',
      getGameSessionForServer: 'serverGameWrites.getGameSessionForServer',
      updateGameSession: 'serverGameWrites.updateGameSession',
    },
  },
}))

describe('game validation Convex write path', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'test-posthog-key')
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_HOST', 'https://example.test')
    vi.stubEnv('NEXT_PUBLIC_CONVEX_URL', 'https://example.convex.cloud')
    vi.stubEnv('CONVEX_GAME_WRITE_SECRET', 'game-write-secret-test-value')
    gameAction.mockReset()
    gameQuery.mockReset()
    gameSetAuth.mockReset()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('creates sessions through the server-authenticated action', async () => {
    gameAction.mockResolvedValue('session-id')
    const { createGameSession } = await import('../game-validation')

    const result = await createGameSession()

    expect(result.sessionId).toBe('session-id')
    expect(result.secret).toHaveLength(64)
    expect(typeof result.seed).toBe('number')
    expect(gameAction).toHaveBeenCalledWith('serverGameWrites.createGameSession', {
      writeSecret: 'game-write-secret-test-value',
      sessionSecret: result.secret,
      seed: result.seed,
    })
  })
})
```

- [ ] **Step 2: Run helper tests and verify failure**

Run:

```bash
bunx vitest run src/lib/__test__/leaderboard.test.ts src/lib/__test__/game-validation.test.ts
```

Expected: FAIL because helpers still use public mutation/query paths.

- [ ] **Step 3: Update `src/lib/leaderboard.ts`**

Change the env import and write path:

```ts
import { env, requireConvexGameWriteSecret } from '@/env'
```

Update `addScoreToLeaderboard`:

```ts
export async function addScoreToLeaderboard(entry: LeaderboardEntry): Promise<number> {
  try {
    const client = getConvexClient()
    const apiModule = await import('../../convex/_generated/api')
    const api = apiModule.api
    const rank = await client.action(api.serverGameWrites.addScore, {
      writeSecret: requireConvexGameWriteSecret(),
      name: entry.name,
      score: entry.score,
    })
    return typeof rank === 'number' ? rank : 0
  } catch (error) {
    console.error('Failed to add score to leaderboard:', error)
    if (error instanceof Error) {
      console.error('Error details:', error.message, error.stack)
    }
    throw new Error('Failed to add score to leaderboard')
  }
}
```

- [ ] **Step 4: Update `src/lib/game-validation.ts`**

Change the env import:

```ts
import { env, requireConvexGameWriteSecret } from '@/env'
```

Replace Convex calls:

```ts
const queryResult: unknown = await client.action(api.serverGameWrites.getGameSessionForServer, {
  writeSecret: requireConvexGameWriteSecret(),
  sessionId,
})
```

```ts
await client.action(api.serverGameWrites.updateGameSession, {
  writeSecret: requireConvexGameWriteSecret(),
  sessionId,
  isActive: session.isActive,
  validatedScore: session.validatedScore,
})
```

```ts
const sessionId = await client.action(api.serverGameWrites.createGameSession, {
  writeSecret: requireConvexGameWriteSecret(),
  sessionSecret: secret,
  seed,
})
```

- [ ] **Step 5: Run helper tests and verify pass**

Run:

```bash
bunx vitest run src/lib/__test__/leaderboard.test.ts src/lib/__test__/game-validation.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/leaderboard.ts src/lib/game-validation.ts src/lib/__test__/leaderboard.test.ts src/lib/__test__/game-validation.test.ts
git commit -m "fix: route game writes through authenticated Convex actions"
```

## Task 4: Add Public Write Surface Regression Tests

**Files:**
- Create: `convex/__test__/publicGameWriteSurface.test.ts`

- [ ] **Step 1: Write failing surface test**

Create `convex/__test__/publicGameWriteSurface.test.ts`:

```ts
import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

async function readSource(path: string) {
  return readFile(new URL(`../../${path}`, import.meta.url), 'utf8')
}

describe('public Convex game write surface', () => {
  it('does not expose raw public score insertion', async () => {
    const source = await readSource('convex/scores.ts')

    expect(source).not.toMatch(/export const addScorePublic\s*=\s*mutation\(/)
    expect(source).not.toMatch(/export const addScore\s*=\s*mutation\(/)
    expect(source).toMatch(/export const addScore\s*=\s*internalMutation\(/)
  })

  it('does not expose raw public session writes', async () => {
    const source = await readSource('convex/gameSessions.ts')

    expect(source).not.toMatch(/export const createSessionWithId\s*=\s*mutation\(/)
    expect(source).not.toMatch(/export const updateSession\s*=\s*mutation\(/)
    expect(source).not.toMatch(/export const cleanupExpiredSessions\s*=\s*mutation\(/)
    expect(source).toMatch(/export const createSessionWithId\s*=\s*internalMutation\(/)
    expect(source).toMatch(/export const updateSession\s*=\s*internalMutation\(/)
  })

  it('only exposes server-authenticated action wrappers for game writes', async () => {
    const source = await readSource('convex/serverGameWrites.ts')

    expect(source).toContain('assertValidGameWriteSecret(args.writeSecret)')
    expect(source).toMatch(/export const createGameSession\s*=\s*action\(/)
    expect(source).toMatch(/export const updateGameSession\s*=\s*action\(/)
    expect(source).toMatch(/export const addScore\s*=\s*action\(/)
  })
})
```

- [ ] **Step 2: Run surface test**

Run:

```bash
bunx vitest run convex/__test__/publicGameWriteSurface.test.ts
```

Expected: PASS after Task 2; FAIL if any raw public write remains.

- [ ] **Step 3: Commit**

```bash
git add convex/__test__/publicGameWriteSurface.test.ts
git commit -m "test: guard Convex game write surface"
```

## Task 5: Add HTTP Route Regression Tests

**Files:**
- Create: `src/app/api/game/start/route.test.ts`
- Create: `src/app/api/game/end/route.test.ts`
- Create: `src/app/api/scores/route.test.ts`

- [ ] **Step 1: Add game start route tests**

Create `src/app/api/game/start/route.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createGameSession } from '@/lib/game-validation'
import { POST } from './route'

vi.mock('@/lib/game-validation', () => ({
  createGameSession: vi.fn(),
}))

const mockedCreateGameSession = vi.mocked(createGameSession)

describe('POST /api/game/start', () => {
  beforeEach(() => {
    mockedCreateGameSession.mockReset()
    mockedCreateGameSession.mockResolvedValue({
      sessionId: 'session-id',
      secret: 'session-secret',
      seed: 123,
    })
  })

  it('returns the current game start response shape', async () => {
    const response = await POST(new Request('http://localhost/api/game/start', { method: 'POST' }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      success: true,
      sessionId: 'session-id',
      secret: 'session-secret',
      seed: 123,
      message: 'Game session started',
    })
    expect(response.headers.get('Cache-Control')).toBe('no-store')
  })

  it('returns a safe failure when session creation fails', async () => {
    mockedCreateGameSession.mockRejectedValue(new Error('Convex denied write'))

    const response = await POST(new Request('http://localhost/api/game/start', { method: 'POST' }))

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: 'Failed to start game session',
    })
    expect(response.headers.get('Cache-Control')).toBe('no-store')
  })
})
```

- [ ] **Step 2: Add game end route tests**

Create `src/app/api/game/end/route.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { endGameSession } from '@/lib/game-validation'
import { POST } from './route'

vi.mock('@/lib/game-validation', () => ({
  endGameSession: vi.fn(),
}))

const mockedEndGameSession = vi.mocked(endGameSession)

function postEnd(body: unknown) {
  return POST(
    new Request('http://localhost/api/game/end', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  )
}

describe('POST /api/game/end', () => {
  beforeEach(() => {
    mockedEndGameSession.mockReset()
    mockedEndGameSession.mockResolvedValue({ success: true, validatedScore: 120 })
  })

  it('validates and ends a game session through the helper', async () => {
    const response = await postEnd({
      sessionId: 'session-id',
      signature: 'signature',
      finalScore: 120,
      events: [{ t: 100, k: 'UP' }],
      foods: [{ t: 200, g: false }],
      durationMs: 1000,
    })

    expect(response.status).toBe(200)
    expect(mockedEndGameSession).toHaveBeenCalledWith(
      'session-id',
      'signature',
      120,
      [{ t: 100, k: 'UP' }],
      [{ t: 200, g: false }],
      1000,
    )
    await expect(response.json()).resolves.toEqual({
      success: true,
      validatedScore: 120,
      message: 'Game session ended and score validated',
    })
  })

  it('rejects malformed request bodies before calling the helper', async () => {
    const response = await postEnd({ sessionId: '', signature: '', finalScore: 120 })

    expect(response.status).toBe(400)
    expect(mockedEndGameSession).not.toHaveBeenCalled()
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      message: 'Invalid request body',
    })
  })

  it('returns helper validation failures as client errors', async () => {
    mockedEndGameSession.mockResolvedValue({ success: false, message: 'Invalid signature' })

    const response = await postEnd({ sessionId: 'session-id', signature: 'signature', finalScore: 120 })

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: 'Invalid signature',
    })
  })
})
```

- [ ] **Step 3: Add score route tests**

Create `src/app/api/scores/route.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { validateScoreSubmissionBySession, verifySignedScoreSubmission } from '@/lib/game-validation'
import { addScoreToLeaderboard } from '@/lib/leaderboard'
import { POST } from './route'

vi.mock('@/lib/game-validation', () => ({
  validateScoreSubmissionBySession: vi.fn(),
  verifySignedScoreSubmission: vi.fn(),
}))

vi.mock('@/lib/leaderboard', () => ({
  addScoreToLeaderboard: vi.fn(),
}))

const mockedVerifySignedScoreSubmission = vi.mocked(verifySignedScoreSubmission)
const mockedValidateScoreSubmissionBySession = vi.mocked(validateScoreSubmissionBySession)
const mockedAddScoreToLeaderboard = vi.mocked(addScoreToLeaderboard)

function postScore(body: unknown) {
  return POST(
    new Request('http://localhost/api/scores', {
      method: 'POST',
      body: JSON.stringify(body),
    }) as never,
  )
}

describe('POST /api/scores', () => {
  beforeEach(() => {
    mockedVerifySignedScoreSubmission.mockReset()
    mockedValidateScoreSubmissionBySession.mockReset()
    mockedAddScoreToLeaderboard.mockReset()
    mockedVerifySignedScoreSubmission.mockResolvedValue({ success: true })
    mockedValidateScoreSubmissionBySession.mockResolvedValue({ success: true, validatedScore: 120 })
    mockedAddScoreToLeaderboard.mockResolvedValue(2)
  })

  it('submits validated scores through the leaderboard helper', async () => {
    const response = await postScore({
      name: 'abc',
      score: 120,
      sessionId: 'session-id',
      timestamp: Date.now(),
      signature: 'signature',
    })

    expect(response.status).toBe(201)
    expect(mockedVerifySignedScoreSubmission).toHaveBeenCalledWith({
      sessionId: 'session-id',
      name: 'abc',
      score: 120,
      timestamp: expect.any(Number),
      signature: 'signature',
    })
    expect(mockedValidateScoreSubmissionBySession).toHaveBeenCalledWith('session-id', 120)
    expect(mockedAddScoreToLeaderboard).toHaveBeenCalledWith({
      id: expect.any(String),
      name: 'ABC',
      score: 120,
      timestamp: expect.any(Number),
    })
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      position: 2,
    })
  })

  it('rejects score submissions without session data', async () => {
    const response = await postScore({ name: 'abc', score: 120 })

    expect(response.status).toBe(400)
    expect(mockedAddScoreToLeaderboard).not.toHaveBeenCalled()
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: 'Missing session data. Score submissions must be validated.',
    })
  })

  it('rejects invalid signatures before score insertion', async () => {
    mockedVerifySignedScoreSubmission.mockResolvedValue({ success: false, message: 'Invalid signature' })

    const response = await postScore({
      name: 'abc',
      score: 120,
      sessionId: 'session-id',
      timestamp: Date.now(),
      signature: 'signature',
    })

    expect(response.status).toBe(400)
    expect(mockedAddScoreToLeaderboard).not.toHaveBeenCalled()
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: 'Signature verification failed',
    })
  })

  it('rejects session score mismatches before score insertion', async () => {
    mockedValidateScoreSubmissionBySession.mockResolvedValue({
      success: false,
      message: 'Submitted score does not match validated score',
    })

    const response = await postScore({
      name: 'abc',
      score: 120,
      sessionId: 'session-id',
      timestamp: Date.now(),
      signature: 'signature',
    })

    expect(response.status).toBe(400)
    expect(mockedAddScoreToLeaderboard).not.toHaveBeenCalled()
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: 'Score validation failed',
      details: 'Submitted score does not match validated score',
    })
  })
})
```

- [ ] **Step 4: Run route tests**

Run:

```bash
bunx vitest run src/app/api/game/start/route.test.ts src/app/api/game/end/route.test.ts src/app/api/scores/route.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/game/start/route.test.ts src/app/api/game/end/route.test.ts src/app/api/scores/route.test.ts
git commit -m "test: cover game score route write boundaries"
```

## Task 6: Final Verification and Linear Update

**Files:**
- No code changes expected.
- Update Linear issue `KTY-16` after verification.

- [ ] **Step 1: Run focused tests**

Run:

```bash
bunx vitest run src/env.test.ts convex/__test__/serverGameWrites.test.ts convex/__test__/publicGameWriteSurface.test.ts src/lib/__test__/leaderboard.test.ts src/lib/__test__/game-validation.test.ts src/app/api/game/start/route.test.ts src/app/api/game/end/route.test.ts src/app/api/scores/route.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run full unit test suite**

Run:

```bash
bun run test
```

Expected: PASS.

- [ ] **Step 3: Run type/lint check**

Run:

```bash
bun run check
```

Expected: PASS.

- [ ] **Step 4: Inspect git diff**

Run:

```bash
git status --short
git diff --stat HEAD
```

Expected: only intentional files from this plan are changed, unless already committed task-by-task.

- [ ] **Step 5: Update Linear**

Move `KTY-16` to `In Review` and add a short comment:

```md
Implemented Convex leaderboard/session write lockdown.

Verification:
- bun run test
- bun run check

Notes:
- Public Convex raw score/session write exports are covered by regression tests.
- Browser gameplay still uses the existing HTTP route flow.
- Browser-visible session secret remains intentionally out of scope for KTY-17.
```

- [ ] **Step 6: Final commit if needed**

If any final verification-only changes were made:

```bash
git add <changed-files>
git commit -m "chore: finalize KTY-16 verification"
```

## Self-Review

Spec coverage:

- Raw score insertion locked down: Tasks 2, 3, and 4.
- Raw session create/update locked down: Tasks 2, 3, and 4.
- Public reads preserved: Task 2 keeps leaderboard and qualification reads public; session public read is non-secret.
- Existing HTTP route flow preserved: Tasks 3 and 5.
- Adequate tests: Tasks 1 through 5 add env, bridge, helper, route, and public-surface coverage.
- Full verification: Task 6.

No known placeholders remain. The plan intentionally leaves browser-visible session secrets to KTY-17.
