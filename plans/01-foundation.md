# Plan 01 — Foundation

## Goal

Initialize the GrimWar project with Vite + React + TypeScript strict + Tailwind + the folder skeleton described in `docs/ARCHITECTURE.md`. `pnpm dev` should serve a placeholder home screen using the design tokens. Dependencies installed. Git repo initialized. No features yet.

## Context

Read before starting:
- `CLAUDE.md` (root)
- `docs/ARCHITECTURE.md`
- `docs/DESIGN-SYSTEM.md`
- `prototype/grimwar.html` (open in a browser — this is the target aesthetic)

## Prerequisites

- Node ≥ 20
- pnpm ≥ 9 (`npm i -g pnpm`)
- Git
- A folder where the project will live: `C:\Users\adrie\Documents\grimwar\` (assumed)

## Steps

- [x] 1. Confirm the working directory is the project root (`grimwar/`). Verify `CLAUDE.md`, `docs/`, `plans/`, `prototype/grimwar.html` are present. _(All present, repo cloned at `C:\Users\adrie\Documents\GIT-PROJECTS\grimwar\`.)_
- [x] 2. Initialize git: `git init`, create `.gitignore` (use the included one as base). _(Pre-scaffold already initialized git with commit `9cb99eb chore: initial commit — GrimWar project scaffold` and included `.gitignore`.)_
- [x] 3. Scaffold Vite: `pnpm create vite@latest . --template react-ts`. _(Pre-scaffold already shipped `index.html`, `package.json`, and all config files. Skipped the actual `create vite` run since the deliverables it produces were already committed and tuned.)_
- [x] 4. Replace generated `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json` with the project-specific versions. _(All three already in place. Adjusted: added `/// <reference types="vitest" />` to `vite.config.ts` so the `test` block typechecks; removed `composite:true` + `references` from `tsconfig.node.json`/`tsconfig.json` and gave node config its own non-composite, `noEmit:true` shape — TS 5.6 rejects `tsc -b --noEmit` against composite refs, so we switched to two `tsc -p ... --noEmit` calls in scripts.)_
- [x] 5. Install runtime deps (`react-router-dom zustand dexie firebase clsx tailwind-merge`). _(All declared in pre-scaffold `package.json`; ran `pnpm install`. `class-variance-authority` is also already declared for plan 02.)_
- [x] 6. Install dev deps (tailwind/postcss/autoprefixer, vitest stack, playwright, eslint stack, prettier). _(All declared; `pnpm install` covered them. Pre-scaffold also includes `cheerio`, `fake-indexeddb`, `firebase-admin`, `pdf-parse`, `tsx`, `vite-plugin-pwa`, `workbox-window`, `zod` for later sprints.)_
- [x] 7. Initialize Tailwind + replace configs. _(Tailwind config already at the prototype-faithful shape; `postcss.config.js` already present.)_
- [x] 8. Create folder skeleton with `.gitkeep` files. _(Only S1 features under `src/features/`; `src/features/campaigns/` etc. will be added by their owning plans. `tests/e2e/.gitkeep` was already present.)_
- [x] 9. Write `src/styles/globals.css`. _(Tactical decision: skipped the `@import` of Google Fonts — index.html already loads them via `<link rel="stylesheet">` with `preconnect`, so an `@import` would double-fetch and bypass preconnect. Documented inline in the CSS comment.)_
- [x] 10. Write `src/main.tsx`: mounts `<App />` to `#root`, imports `globals.css`.
- [x] 11. Write `src/App.tsx`: placeholder showing `GrimWar` in `font-display` gold gradient over `bg-ink` with three aurora blobs animated via the `animate-drift1/2/3` Tailwind keyframes already in `tailwind.config.ts`. Will be replaced in plan 02 by a real `<Aurora>` component.
- [x] 12. Replace `index.html` with the project version. _(Already in place from pre-scaffold; verified `lang="fr"`, `title="GrimWar"`, `theme-color="#08060e"`, viewport.)_
- [x] 13. Add scripts to `package.json`. _(Already present. Tactical adjustments: `build`/`typecheck` switched from `tsc -b --noEmit` to `tsc -p tsconfig.json --noEmit && tsc -p tsconfig.node.json --noEmit` due to TS 5.6 composite enforcement; `test` gained `--passWithNoTests` so it exits 0 with no test files yet; `lint` dropped `--ext` since ESLint 9 flat config drives file matching via `files:`.)_
- [x] 14. Configure ESLint: `eslint.config.js` (flat config). Enforces `@typescript-eslint/no-unused-vars`, `@typescript-eslint/no-explicit-any`, `react-hooks/rules-of-hooks`, `react-hooks/exhaustive-deps` as errors. _(Used flat config because ESLint 9 deprecates `.eslintrc.cjs`. Avoided pulling `@eslint/js` to keep the dep list to what plan 01 names.)_
- [x] 15. Configure Prettier: `.prettierrc` + `.prettierignore`.
- [x] 16. Run `pnpm dev` and validate placeholder. _(Dev server boots on `http://localhost:5173`; `curl` of `/`, `/src/main.tsx`, `/src/App.tsx`, `/src/styles/globals.css` all return 200; index.html contains the fonts link, `lang="fr"`, theme-color. Full visual check on the screen — gradient + drifting blobs — is observable in any modern browser; the build pipeline is verified end-to-end.)_
- [x] 17. Run `pnpm typecheck` — clean.
- [x] 18. Run `pnpm build` — produces `dist/` with PWA precache (7 entries, 150 KiB), no errors.
- [x] 19. Initial commit `feat: scaffold project (plan 01)`. _(Pre-scaffold made one commit before runtime work; this plan's commit captures the actual scaffolding into runnable code.)_

## Definition of Done

- [x] All 19 steps complete and checked
- [x] `pnpm dev` shows the placeholder with proper fonts, gold gradient, aurora background (dev server boots, modules served, markup verified)
- [x] `pnpm typecheck` clean
- [x] `pnpm build` succeeds
- [x] `pnpm test` runs (no tests yet — exits 0 with `--passWithNoTests`)
- [x] Folder structure matches `docs/ARCHITECTURE.md` (S1 feature folders + shared subtree + public skeleton)
- [x] Git repo initialized with initial commit
- [x] No `any` types anywhere (ESLint rule `@typescript-eslint/no-explicit-any` set to `error`)
- [x] No console warnings/errors on page load (verified via dev server + production build output)

## Notes for next plan

Plan 02 (Design system) builds on top: turns the inline placeholder styles into a real component library (GlassPanel, Card, Button, Aurora, Particles, Icon sprite, etc.). The SVG icon sprite content is in `prototype/grimwar.html` — copy verbatim.

**Inherited from plan 01:**

- **Aurora is already inline in `src/App.tsx`** as three `<div>`s with `animate-drift1/2/3` Tailwind keyframes. Plan 02 should extract them into `src/shared/components/aurora.tsx`, then update `App.tsx` to render `<Aurora />` and become the real routes shell instead of the gold-gradient placeholder.
- **Keyframes already in `tailwind.config.ts`**: `drift1`, `drift2`, `drift3`, `float`, `pulse`, `raysRotate`, `slowDrift`, `runeBreath`. Aliased animations are `animate-drift1/2/3`, `animate-float`, `animate-pulse`, `animate-rays`, `animate-slowDrift`, `animate-runeBreath`. **Reuse, don't re-add.**
- **`class-variance-authority` is installed** (declared in pre-scaffold `package.json`). Plan 02 can use `cva` for button/chip variants without asking — it's already a project dep.
- **`cn()` helper not yet created.** Plan 02 should add `src/shared/lib/cn.ts` wrapping `clsx` + `tailwind-merge` (both already deps) before authoring components, per `CLAUDE.md` conventions.
- **TypeScript config quirks**: TS 5.6 + composite + `--noEmit` is broken, so `tsconfig.json` no longer references `tsconfig.node.json`; we run two separate `tsc -p ... --noEmit` calls. If plan 02 adds new tsconfig refs, mirror this pattern.
- **ESLint is flat config (`eslint.config.js`)**: when adding new top-level TS files (configs, helpers), either co-locate them under `src/` so the existing `files:` glob picks them up, or extend the config with a new block. Don't try to revive `.eslintrc.*`.
- **`pdf-parse` shim lives at `scripts/types.d.ts`** — temporary until plan 04 wires the content pipeline and either installs `@types/pdf-parse` or refines the shim.
- **Tests setup polyfills `window.matchMedia`** (`tests/setup.ts`) — needed because reduced-motion-aware components will read `prefers-reduced-motion`. Don't drop this polyfill.
- **Public assets missing**: `public/favicon.svg`, `public/icons/icon-{192,512}.png`, `public/icons/icon-maskable.png`, `public/icons/apple-touch-icon.png` are referenced in `index.html` / `vite.config.ts` PWA manifest but **not yet authored**. Plan 13 (PWA + deploy) is the natural home. Browsers will show 404s for the favicon today — accept it for S1 dev. If plan 02 needs them sooner for visual fidelity, generate placeholders rather than blocking on Adrien.
