# kil.dev

> [!NOTE]
> Friendly plea: pretty please don’t copy-paste this site 1:1 and ship it as your own. I know the license allows it, and I chose that license knowing that, but I’d really appreciate it if you treat this as inspiration, not a clone template.
> Add your voice, change the vibes, remix the bits you like—and if it saved you time, a little credit never hurts. Thanks!

## Demo

- [My Website!](https://kil.dev)

## Stack

- **Framework**: Next.js 15 (App Router, RSC)
- **UI**: React 19, Tailwind CSS v4, Radix UI, shadcn/ui
- **Analytics/UX**: PostHog
- **Lang/Tooling**: TypeScript, Oxlint, Prettier, Bun

## Getting started

Prereqs: **Bun** installed (`https://bun.sh`).

```bash
bun install
bun run dev
```

Build and run:

```bash
bun run build
bun run start
```

Or preview (build + start):

```bash
bun run preview
```

## Environment variables

Create a `.env.local` in the project root:

```bash
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_project_api_key
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
NEXT_PUBLIC_CONVEX_URL=your_convex_deployment_url
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token
PET_GALLERY_CONVEX_ACCESS_TOKEN=your_convex_auth_token_for_one_time_migration
WORKOS_API_KEY=your_workos_api_key
WORKOS_CLIENT_ID=your_workos_client_id
WORKOS_WEBHOOK_SECRET=your_workos_webhook_secret
WORKOS_ACTION_SECRET=your_workos_action_secret
WORKOS_COOKIE_PASSWORD=at_least_32_characters
NEXT_PUBLIC_WORKOS_REDIRECT_URI=http://localhost:3000/auth/callback
PET_GALLERY_WORKOS_ORG_ID=your_kil_dev_workos_org_id
PET_GALLERY_ADMIN_EMAIL=you@example.com
UPLOADTHING_TOKEN=your_uploadthing_token
```

Notes:

- `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST` are required for analytics to initialize.
- Pet gallery media is managed through `/admin/pet-gallery`. UploadThing stores generated web-ready variants only, Convex stores draft metadata and the published public snapshot, and gallery images are not committed to the repo.
- `BLOB_READ_WRITE_TOKEN` is optional and only used by `bun run migrate:pet-gallery:uploadthing` as a fallback when migrating old Blob-backed gallery files. Old Blob cleanup is manual/future work.
- The private pet gallery admin uses WorkOS/AuthKit, Convex, and UploadThing. Keep `WORKOS_WEBHOOK_SECRET`, `WORKOS_ACTION_SECRET`, `WORKOS_CLIENT_ID`, `WORKOS_API_KEY`, `PET_GALLERY_WORKOS_ORG_ID`, and `PET_GALLERY_ADMIN_EMAIL` configured in the Convex deployment as well as the local/Vercel runtime where applicable.

## Useful scripts

- `bun run dev` – start dev server
- `bun run build` – production build
- `bun run start` – start production server
- `bun run preview` – build + start
- `bun run lint` / `bun run lint:fix` – lint code
- `bun run typecheck` – TypeScript checks
- `bun run format:check` / `bun run format:write` – Prettier
- `bun run check` – lint + typecheck
- `bun run check:all` – all checks (type, format, lint)
- `bun run migrate:pet-gallery:uploadthing:dry-run` – preview the one-time migration from old static/Blob gallery data into UploadThing and Convex without remote writes
- `bun run migrate:pet-gallery:uploadthing` – run the one-time pet gallery migration before publishing the new gallery build

## Codex and worktrees

Codex app setup lives in `.codex/environments/environment.toml` and exposes Run, Preview, Check, Test, and E2E actions.

To make Git/Codex-created worktrees copy local ignored `.env` files from the source checkout, enable the tracked hooks once per clone:

```bash
git config core.hooksPath .githooks
```

The hook delegates to `scripts/codex/setup-worktree-local-config.sh`. It copies ignored env files only; it does not commit or synthesize secrets.

## License

This project is released under **GPL-3.0** (see `LICENSE`).

While the GPL permits reuse (including forks and derivatives), I kindly ask you not to publish a 1:1 copy as your own portfolio. Please remix, customize, and make it yours.

I can't stop you, I'm a README not a Cop.
