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
- **Lang/Tooling**: TypeScript, ESLint, Prettier, Bun

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
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token
```

Notes:

- `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST` are required for analytics to initialize.
- `BLOB_READ_WRITE_TOKEN` is optional and only needed for blob upload features.

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

## License

This project is released under **GPL-3.0** (see `LICENSE`).

While the GPL permits reuse (including forks and derivatives), I kindly ask you not to publish a 1:1 copy as your own portfolio. Please remix, customize, and make it yours.

I can't stop you, I'm a README not a Cop.
