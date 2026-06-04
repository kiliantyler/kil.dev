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
- The generated runtime files are produced by `bun run build:runtimes`; pet gallery media is managed through UploadThing and Convex via `/admin/pet-gallery`.

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

## Linear Tracking

- Track code, content, configuration, bug, feature, and maintenance work in the Linear project `kil.dev`.
- Project URL: https://linear.app/ktyler/project/kildev-617c75ebaf38
- Team: `Ktyler` (`KTY`).
- When the user names or pastes a Linear issue ID or URL, fetch the issue from Linear immediately and use its description, comments, child issues, and linked documents as the working context.
- Before starting a repository change, search for an existing matching Linear issue in the `kil.dev` project. If none exists, create one with the relevant label and milestone.
- Reference the Linear issue identifier in branch names, commits, and PRs when practical.
- Keep issue scope concrete: one bug, feature, cleanup, or verification task per issue unless the user explicitly asks for a broader tracking bucket.
- Use the existing project labels where they fit: `Frontend`, `Convex`, `Generated assets`, `Analytics`, `Ops`, plus `Bug`, `Feature`, or `Improvement`.
- Use the existing milestones where they fit: `Experience and content`, `Runtime and data`, `Production confidence`, and `Baseline tracking`.
- If the Linear plugin is unavailable, continue the work and call out that tracking could not be updated.

## Specs, Plans, and Linear Documents

- Do not commit brainstorming specs, design docs, PRDs, implementation plans, or exploratory planning documents to this repository unless the user explicitly asks for a committed artifact.
- For Linear-backed brainstorming and implementation planning, treat Linear as the durable home for approved specs, plans, and implementation breakdowns.
- After the user approves a brainstormed design, create or update a Linear document linked to the parent issue with the approved spec.
- After the user approves an implementation plan, create or update a Linear document linked to the parent or child issue with the approved plan.
- If a local Markdown spec or plan is useful while drafting, keep it untracked and sync the durable copy into the Linear document after approval.
- Do not leave approved specs or implementation plans only in chat or only in local scratch; put them in Linear so future agents can fetch the issue and continue from the linked document.
- After the approved spec is in Linear, create narrow Linear child issues or related issues for implementation passes, parented under the original issue when possible.
- Add a parent issue comment linking the Linear spec document and listing the child issue map.

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
- If a local plan is useful, put it under `.plans/` and keep it agent-executable with concrete file paths and exit criteria, but do not commit it unless explicitly requested. Sync approved plans into Linear documents for durable tracking.
