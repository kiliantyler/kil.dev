# KTY-16 Convex Leaderboard Write Lockdown Design

## Goal

Lock down Convex score and game-session write surfaces so unauthenticated Convex clients cannot insert leaderboard scores or mutate session state directly. Keep the existing browser-facing HTTP gameplay flow working through `/api/game/start`, `/api/game/end`, and `/api/scores`.

## Scope

This is limited to KTY-16. The browser-visible session secret and broader server-authoritative score protocol belong to KTY-17 and are intentionally out of scope.

In scope:

- Remove or stop exporting public Convex mutations that directly insert scores.
- Remove or stop exporting public Convex mutations that directly create or patch game sessions.
- Preserve public read behavior needed by the site, including leaderboard reads and score qualification checks.
- Keep score submission routed through server-side validation before any score insert.
- Add tests that fail if public Convex write exports return.

Out of scope:

- Redesigning the game-session signing protocol.
- Removing the browser-visible session secret.
- Changing leaderboard UI, scoring rules, or achievement behavior.
- Adding rate limits or automated session cleanup beyond preserving existing cleanup behavior.

## Architecture

Next.js route handlers remain the public write boundary. Browser code continues to call the existing HTTP endpoints. Server-only helpers in `src/lib/game-validation.ts` and `src/lib/leaderboard.ts` call Convex internals through server-side code.

Convex keeps public reads public:

- `scores.getLeaderboard`
- `scores.checkQualification`
- Any session read that remains necessary for existing behavior, provided it does not become a write bypass.

Convex writes move behind internal functions or action-mediated server paths:

- Score insertion stays in an internal mutation.
- Session creation and session update move away from public mutations.
- Direct public score/session write wrappers are removed or made inaccessible to generated public API callers.

## Data Flow

Game start:

1. Browser posts to `/api/game/start`.
2. The route calls `createGameSession`.
3. Server-side code creates the Convex session through a non-public Convex write path.
4. The route returns the same response shape required by the current client.

Game end:

1. Browser posts to `/api/game/end`.
2. The route validates the submitted game payload.
3. Server-side code loads the session and updates validated session state through a non-public Convex write path.
4. The route returns the existing success or error response shape.

Score submission:

1. Browser submits to `/api/scores`.
2. The route verifies signed/session-backed score state.
3. Server-side code inserts the score through the internal Convex score mutation.
4. Public Convex clients cannot call a score insertion mutation directly.

## Error Handling

Existing HTTP error shapes should be preserved where practical. Invalid sessions, invalid signatures, expired sessions, and score mismatch cases should still return client-safe failures from the HTTP routes. Internal Convex errors can still be logged server-side and mapped to existing generic route errors.

## Testing

Testing must cover both security boundaries and normal behavior:

- Add focused tests that inspect the generated Convex public API surface or source exports and fail if public write functions such as `scores.addScorePublic`, `gameSessions.createSessionWithId`, or `gameSessions.updateSession` are exposed.
- Add or update route/helper tests proving `/api/game/start`, `/api/game/end`, and `/api/scores` still use the locked-down server path successfully.
- Add negative tests showing direct public score insertion and session mutation paths are unavailable or rejected.
- Run `bun run test` for the focused suite.
- Run `bun run check` because Convex generated API typing and route helper imports are likely to change.

## Acceptance Criteria

- Unauthenticated Convex clients cannot insert leaderboard scores directly.
- Unauthenticated Convex clients cannot create or patch game sessions directly.
- Existing gameplay and leaderboard submission routes continue to work.
- Focused regression tests cover the locked-down export surface and route behavior.
- `bun run test` and `bun run check` pass.
