# Package Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the stale direct npm packages in `kil.dev` while proving the Next.js site still builds, renders, and passes its unit and Playwright coverage.

**Architecture:** This is a single Bun-managed Next.js app. Update dependencies in risk-based batches so failures are attributable: core framework first, UI/runtime libraries next, then developer tooling, with a deliberate decision point for Node/TypeScript major-version drift. Each batch updates only `package.json` and `bun.lock` unless a breaking API change forces a source fix.

**Tech Stack:** Bun 1.3.6, Node 24.12.0 locally, Next.js 16, React 19, TypeScript, Vitest, Playwright, Oxlint, Tailwind CSS 4, Convex, Vercel Blob.

---

## Current Inventory

`bun outdated` on 2026-05-17 reported these direct package updates:

| Package | Current | Latest | Group |
| --- | ---: | ---: | --- |
| `@t3-oss/env-nextjs` | `0.13.10` | `0.13.11` | runtime/config |
| `@vercel/blob` | `2.0.0` | `2.3.3` | runtime/blob |
| `convex` | `1.31.5` | `1.39.1` | runtime/data |
| `js-cookie` | `3.0.5` | `3.0.7` | runtime/browser |
| `lucide-react` | `0.562.0` | `1.16.0` | UI/icons |
| `motion` | `12.28.1` | `12.38.0` | UI/animation |
| `next` | `16.1.4` | `16.2.6` | core framework |
| `posthog-js` | `1.332.0` | `1.373.5` | runtime/analytics |
| `react` | `19.2.3` | `19.2.6` | core framework |
| `react-dom` | `19.2.3` | `19.2.6` | core framework |
| `react-photo-album` | `3.4.0` | `3.6.0` | UI/gallery |
| `tailwind-merge` | `3.4.0` | `3.6.0` | UI/styles |
| `uuid` | `13.0.0` | `14.0.0` | runtime/API |
| `yet-another-react-lightbox` | `3.28.0` | `3.32.0` | UI/gallery |
| `zod` | `4.3.5` | `4.4.3` | runtime/validation |
| `@playwright/test` | `1.57.0` | `1.60.0` | test tooling |
| `@tailwindcss/postcss` | `4.1.18` | `4.3.0` | build/styles |
| `@types/node` | `24.10.9` | `25.8.0` | type tooling |
| `@types/react` | `19.2.9` | `19.2.14` | type tooling |
| `esbuild` | `0.27.2` | `0.28.0` | build tooling |
| `knip` | `5.82.1` | `6.14.1` | lint tooling |
| `oxlint` | `1.41.0` | `1.65.0` | lint tooling |
| `postcss` | `8.5.6` | `8.5.14` | build/styles |
| `prettier` | `3.8.1` | `3.8.3` | format tooling |
| `prettier-plugin-multiline-arrays` | `4.1.3` | `4.1.8` | format tooling |
| `prettier-plugin-packagejson` | `3.0.0` | `3.0.2` | format tooling |
| `prettier-plugin-tailwindcss` | `0.7.2` | `0.8.0` | format tooling |
| `tailwindcss` | `4.1.18` | `4.3.0` | build/styles |
| `typescript` | `5.9.3` | `6.0.3` | type tooling |
| `vitest` | `4.0.17` | `4.1.6` | test tooling |

Baseline verification before updates:

- `bun run check`: passed with 0 oxlint warnings/errors and successful `tsc --noEmit`.
- `bun run test`: passed 35 files / 387 tests.
- `bun run build`: passed. Existing warning: `metadataBase property in metadata export is not set`.
- `bun run test:e2e`: passed 205 Playwright tests across desktop and mobile. Existing warnings: repeated `NO_COLOR`/`FORCE_COLOR`, existing Next `metadataBase`, and one `util._extend` deprecation warning from the web server path.

## Files

- Modify: `package.json` for pinned dependency versions.
- Modify: `bun.lock` for resolved package graph.
- Potentially modify: `src/env.js` if `@t3-oss/env-nextjs` changes validation behavior.
- Potentially modify: `src/app/api/scores/route.ts` if `uuid@14` changes the current `v4` import contract.
- Potentially modify: `src/components/layout/pet-gallery/gallery-client.tsx` and `src/components/layout/pet-gallery/server-album.tsx` if gallery packages changed exports or props.
- Potentially modify: `src/components/ui/motion-switch.tsx`, `src/components/ui/theme-menu.tsx`, and `src/components/ui/theme-options-panel.tsx` if `motion` changes React entry points.
- Potentially modify: `src/lib/themes.ts`, `src/lib/navmenu.ts`, `src/utils/themes.ts`, and other `lucide-react` import sites only if icon names/exports break.
- Potentially modify: `.github/renovate.json5` and `.github/workflows/lint.yml` only if choosing to move the repo from Node 24 type targets to Node 25.

### Task 1: Create the Dependency Update Branch and Reconfirm Baseline

**Files:**
- No source files changed.

- [ ] **Step 1: Create an isolated branch**

Run:

```bash
git switch -c codex/package-refresh-2026-05-17
```

Expected: branch switches to `codex/package-refresh-2026-05-17`.

- [ ] **Step 2: Confirm the working tree is clean before edits**

Run:

```bash
git status --short
```

Expected: no output.

- [ ] **Step 3: Re-run package inventory**

Run:

```bash
bun outdated
```

Expected: the same package list as the Current Inventory section, unless newer packages were published after this plan was written.

- [ ] **Step 4: Re-run fast baseline checks**

Run:

```bash
bun run check
```

Expected: `Found 0 warnings and 0 errors.` and `tsc --noEmit` exits 0.

Run:

```bash
bun run test
```

Expected: 35 test files and 387 tests pass.

### Task 2: Update Core Framework Packages

**Files:**
- Modify: `package.json`
- Modify: `bun.lock`
- Potentially modify: `next.config.ts`
- Potentially modify: `src/app/layout.tsx`

- [ ] **Step 1: Update Next and React together**

Run:

```bash
bun add next@16.2.6 react@19.2.6 react-dom@19.2.6
```

Expected: `package.json` pins `next` to `16.2.6`, `react` to `19.2.6`, and `react-dom` to `19.2.6`; `bun.lock` is regenerated.

- [ ] **Step 2: Typecheck the framework update**

Run:

```bash
bun run check
```

Expected: no oxlint warnings/errors and no TypeScript errors.

- [ ] **Step 3: Build the production site**

Run:

```bash
bun run build
```

Expected: build passes. The existing `metadataBase` warning may still appear; no new warnings should be introduced.

- [ ] **Step 4: Run focused framework-sensitive e2e coverage**

Run:

```bash
bunx playwright test tests/e2e/pages/home.spec.ts tests/e2e/flows/navigation.spec.ts --project=chromium-desktop --project=chromium-mobile
```

Expected: all selected tests pass for desktop and mobile.

- [ ] **Step 5: Commit core framework update**

Run:

```bash
git add package.json bun.lock
git commit -m "chore(deps): update next and react"
```

Expected: a commit containing only `package.json` and `bun.lock`, unless a required Next/React compatibility source fix was made.

### Task 3: Update Runtime and API Libraries

**Files:**
- Modify: `package.json`
- Modify: `bun.lock`
- Potentially modify: `src/env.js`
- Potentially modify: `scripts/sync-pet-gallery.ts`
- Potentially modify: `convex/schema.ts`, `convex/gameSessions.ts`, `convex/scoreSubmission.ts`, `convex/scores.ts`, and `convex/dev/seedScores.ts`
- Potentially modify: `src/app/api/scores/route.ts`
- Potentially modify: `src/lib/api-schemas.ts`, `src/lib/score-validation.ts`, and related tests under `src/lib/__test__/`

- [ ] **Step 1: Update runtime packages with mostly minor/patch changes**

Run:

```bash
bun add @t3-oss/env-nextjs@0.13.11 @vercel/blob@2.3.3 convex@1.39.1 js-cookie@3.0.7 posthog-js@1.373.5 zod@4.4.3
```

Expected: `package.json` and `bun.lock` update. No source changes unless TypeScript reports API drift.

- [ ] **Step 2: Update `uuid` separately because it is a major version**

Run:

```bash
bun add uuid@14.0.0
```

Expected: `package.json` and `bun.lock` update. If `src/app/api/scores/route.ts` fails on `import { v4 as uuidv4 } from 'uuid'`, change only that import/call site to the package's current documented v4 API.

- [ ] **Step 3: Run targeted runtime unit tests**

Run:

```bash
bun run test src/lib/__test__/api-schemas.test.ts src/lib/__test__/score-validation.test.ts src/lib/__test__/game-validation.test.ts src/lib/__test__/leaderboard.test.ts
```

Expected: all selected tests pass.

- [ ] **Step 4: Typecheck and build**

Run:

```bash
bun run check
```

Expected: no oxlint warnings/errors and no TypeScript errors.

Run:

```bash
bun run build
```

Expected: production build passes with no new warnings.

- [ ] **Step 5: Run API/game e2e smoke coverage**

Run:

```bash
bunx playwright test tests/e2e/flows/snake-leaderboard.spec.ts tests/e2e/flows/achievements/page-visits.spec.ts --project=chromium-desktop
```

Expected: all selected tests pass.

- [ ] **Step 6: Commit runtime update**

Run:

```bash
git add package.json bun.lock src/env.js scripts/sync-pet-gallery.ts convex src/app/api/scores/route.ts src/lib src/hooks src/components/providers
git commit -m "chore(deps): update runtime packages"
```

Expected: commit includes dependency files and only source files required by actual compatibility fixes.

### Task 4: Update UI, Animation, and Gallery Libraries

**Files:**
- Modify: `package.json`
- Modify: `bun.lock`
- Potentially modify: `src/lib/themes.ts`
- Potentially modify: `src/lib/navmenu.ts`
- Potentially modify: `src/utils/themes.ts`
- Potentially modify: `src/components/layout/header/mobile-nav.tsx`
- Potentially modify: `src/components/layout/experience/work-history/collapsible-highlights.tsx`
- Potentially modify: `src/components/layout/achievements/achievement-reset-button.tsx`
- Potentially modify: `src/components/ui/theme-toggle.tsx`
- Potentially modify: `src/components/ui/flip-indicator.tsx`
- Potentially modify: `src/components/ui/motion-switch.tsx`
- Potentially modify: `src/components/ui/theme-menu.tsx`
- Potentially modify: `src/components/ui/theme-options-panel.tsx`
- Potentially modify: `src/components/layout/pet-gallery/gallery-client.tsx`
- Potentially modify: `src/components/layout/pet-gallery/server-album.tsx`

- [ ] **Step 1: Update UI packages**

Run:

```bash
bun add lucide-react@1.16.0 motion@12.38.0 react-photo-album@3.6.0 tailwind-merge@3.6.0 yet-another-react-lightbox@3.32.0
```

Expected: `package.json` and `bun.lock` update. `lucide-react` is a major update, so TypeScript is the first source of truth for icon export breakage.

- [ ] **Step 2: Typecheck and run UI unit tests**

Run:

```bash
bun run check
```

Expected: no oxlint warnings/errors and no TypeScript errors.

Run:

```bash
bun run test src/utils/__test__/theme-css.test.ts src/utils/__test__/skillicons.test.ts src/utils/__test__/utils.test.ts
```

Expected: all selected tests pass.

- [ ] **Step 3: Build the site**

Run:

```bash
bun run build
```

Expected: production build passes with no new warnings.

- [ ] **Step 4: Run focused visual/interaction e2e coverage**

Run:

```bash
bunx playwright test tests/e2e/pages/pet-gallery.spec.ts tests/e2e/flows/theme-switching.spec.ts tests/e2e/flows/theme-no-fouc.spec.ts --project=chromium-desktop --project=chromium-mobile
```

Expected: all selected tests pass for desktop and mobile.

- [ ] **Step 5: Commit UI update**

Run:

```bash
git add package.json bun.lock src/lib src/utils src/components
git commit -m "chore(deps): update ui packages"
```

Expected: commit includes dependency files and only source files required by actual compatibility fixes.

### Task 5: Update Low-Risk Developer Tooling

**Files:**
- Modify: `package.json`
- Modify: `bun.lock`
- Potentially modify: formatting output if Prettier plugins intentionally change formatting.

- [ ] **Step 1: Update patch/minor tooling**

Run:

```bash
bun add -d @types/react@19.2.14 oxlint@1.65.0 postcss@8.5.14 prettier@3.8.3 prettier-plugin-multiline-arrays@4.1.8 prettier-plugin-packagejson@3.0.2 tailwindcss@4.3.0 @tailwindcss/postcss@4.3.0 vitest@4.1.6 @playwright/test@1.60.0
```

Expected: `package.json` and `bun.lock` update. Formatting should not change unless a plugin has different output.

- [ ] **Step 2: Refresh Playwright browser binaries**

Run:

```bash
bunx playwright install chromium
```

Expected: Chromium used by local Playwright is available for `@playwright/test@1.60.0`.

- [ ] **Step 3: Run full local validation after tooling updates**

Run:

```bash
bun run check:all
```

Expected: typecheck, format check, lint, and knip all pass.

Run:

```bash
bun run test
```

Expected: 35 test files and 387 tests pass, unless test count changed only because Vitest reporting changed.

Run:

```bash
bun run test:e2e
```

Expected: 205 Playwright tests pass, unless test count changed only because Playwright discovery/reporting changed.

- [ ] **Step 4: Commit low-risk tooling update**

Run:

```bash
git add package.json bun.lock
git commit -m "chore(deps): update test and style tooling"
```

Expected: commit contains dependency files only, unless a formatter compatibility change is intentional and reviewed.

### Task 6: Decide on Major Tooling Updates

**Files:**
- Modify: `package.json`
- Modify: `bun.lock`
- Potentially modify: `.github/renovate.json5`
- Potentially modify: `.github/workflows/lint.yml`
- Potentially modify: TypeScript config files only if TypeScript 6 requires it.

- [ ] **Step 1: Check whether Node 25 types should be allowed**

Run:

```bash
sed -n '55,75p' .github/renovate.json5
```

Expected: the repo currently has Renovate rules keeping `node-version` and `@types/node` below 25.

Run:

```bash
sed -n '15,25p' .github/workflows/lint.yml
```

Expected: lint CI currently uses Node 22.

- [ ] **Step 2: Choose one Node types path**

Preferred conservative path:

```bash
bun add -d esbuild@0.28.0 knip@6.14.1 prettier-plugin-tailwindcss@0.8.0
```

Expected: major non-runtime tooling updates are applied, while `@types/node` remains on `24.10.9` because Renovate explicitly disallows Node 25 and CI includes Node 22.

Full latest path, only if intentionally changing the Node target:

```bash
bun add -d @types/node@25.8.0 esbuild@0.28.0 knip@6.14.1 prettier-plugin-tailwindcss@0.8.0
```

Then update `.github/renovate.json5` by changing the two `allowedVersions` entries from `<25` to `<26`, and update `.github/workflows/lint.yml` from `node-version: "22"` to the chosen runtime target.

Expected: either Node 25 types are intentionally adopted with config changes, or they are intentionally left out and documented in the final summary.

- [ ] **Step 3: Trial TypeScript 6 separately**

Run:

```bash
bun add -d typescript@6.0.3
```

Expected: `package.json` and `bun.lock` update. If Next 16.2.6 or local tooling does not support TypeScript 6 yet, revert only the TypeScript version back to `5.9.3` and document it as intentionally held.

- [ ] **Step 4: Validate major tooling updates**

Run:

```bash
bun run check:all
```

Expected: typecheck, format check, lint, and knip all pass.

Run:

```bash
bun run build
```

Expected: production build passes with no new warnings.

- [ ] **Step 5: Commit major tooling decision**

Run:

```bash
git add package.json bun.lock .github/renovate.json5 .github/workflows/lint.yml tsconfig.json convex/tsconfig.json
git commit -m "chore(deps): update major tooling"
```

Expected: commit includes only files changed by the chosen major-tooling path.

### Task 7: Full Site Verification and Final Cleanup

**Files:**
- No planned source files beyond already committed dependency and compatibility changes.

- [ ] **Step 1: Confirm no outdated packages remain, except intentional holds**

Run:

```bash
bun outdated
```

Expected: no output for updated packages. If `@types/node` or `typescript` remain, the final summary must state the exact hold reason and the current/latest versions.

- [ ] **Step 2: Run full local validation**

Run:

```bash
bun run check:all
```

Expected: typecheck, format check, lint, and knip all pass.

Run:

```bash
bun run test
```

Expected: unit tests pass.

Run:

```bash
bun run build
```

Expected: production build passes.

Run:

```bash
bun run test:e2e
```

Expected: full desktop/mobile Playwright suite passes.

- [ ] **Step 3: Manually inspect the running site in production mode**

Run:

```bash
bun run preview
```

Expected: Next starts on `http://localhost:3000`.

Open `http://localhost:3000` and manually inspect:

- Home page hero, theme toggle, social links, and navigation.
- About, Experience, Projects, Achievements, Pet Gallery, 404, and 418 routes.
- Mobile nav at a narrow viewport.
- Theme switching and persistence after reload.
- Pet gallery image layout and lightbox behavior.
- Secret console open/close and one simple command.

- [ ] **Step 4: Final repository review**

Run:

```bash
git status --short
```

Expected: no unstaged changes after all commits, except ignored local artifacts.

Run:

```bash
git log --oneline --decorate -5
```

Expected: dependency update commits are split by the task groups above.

- [ ] **Step 5: Final summary**

Report:

- Packages updated by group.
- Packages intentionally held, if any.
- Source compatibility fixes made, if any.
- Verification results for `check:all`, `test`, `build`, `test:e2e`, and manual site inspection.
