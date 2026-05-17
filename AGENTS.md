# AGENTS.md

## Scope

These instructions apply to the whole repository.

## Project Shape

- This is a Next.js App Router site using React, TypeScript, Tailwind CSS v4, Convex, Playwright, Vitest, Oxlint, Prettier, and Bun.
- Use `bun`, not `npm`, `pnpm`, or `yarn`.
- Runtime and generated assets are intentionally not tracked:
  - `src/utils/theme-bundle.ts`
  - `src/utils/presence-bundle.ts`
  - `public/pet-gallery/`
- The generated runtime files are produced by `bun run build:runtimes`; pet gallery data is produced by `bun run sync:pet-gallery`.

## Local Setup

- Install dependencies with `bun install --frozen-lockfile`.
- Start the development server with `bun run dev`.
- Use `bun run preview` for a production-style local preview.
- The Codex app environment is in `.codex/environments/environment.toml`.
- Codex/worktree setup scripts live in `scripts/codex/`.

## Environment Files

- Do not commit real `.env` files or secrets.
- Keep `.env.example` synchronized with `src/env.js`.
- New worktrees should copy ignored local `.env` files from the source checkout via `scripts/codex/setup-worktree-local-config.sh`.
- If no local env file exists, Codex setup may create `.env.local` from `.env.example` as a non-secret placeholder so the app can boot.

## Verification

- For logic-only changes, run `bun run test`.
- For TypeScript and lint coverage, run `bun run check`.
- For formatting-sensitive changes, run `bun run format:check`.
- For UI or route behavior, run `bun run test:e2e` or targeted Playwright specs.
- Before claiming the site is production-ready, run `bun run build`.

## Frontend Conventions

- Follow the existing component structure under `src/components`.
- Use existing shadcn/Radix UI primitives and local utilities before adding new abstractions.
- Install new shadcn/ui primitives with `bunx shadcn@latest add <component>` instead of hand-writing registry files.
- This repo uses Tailwind CSS v4; configure theme tokens in CSS with `@theme` and use `@import 'tailwindcss'`, not legacy `@tailwind` directives or a new Tailwind config file.
- Keep routes and server components static unless the task explicitly needs dynamic rendering. Move browser-only behavior into small client components.
- Keep generated files generated; update the source inputs or scripts instead of hand-editing generated outputs.
- Preserve existing theme, achievement, secret-console, and game behavior unless the task explicitly changes it.

## Convex

- Use the object-style Convex function syntax with `args`, `returns`, and `handler`.
- Include return validators for Convex functions. Use `returns: v.null()` when a function returns nothing.
- Keep public functions as `query`, `mutation`, and `action`; use internal variants for private implementation details.
- Update `convex/schema.ts` when stored data shapes change.

## Analytics

- Never invent or hardcode PostHog keys. Use values from local env files.
- Keep feature flag names centralized when they are used from more than one place.
- Ask before renaming existing analytics events, properties, or feature flags unless the requested task explicitly includes that rename.

## Planning Artifacts

- Keep scratch implementation plans out of commits unless requested.
- If a local plan is useful, put it under `.plans/` and keep it agent-executable with concrete file paths and exit criteria.
