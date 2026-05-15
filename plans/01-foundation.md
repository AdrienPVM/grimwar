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

- [ ] 1. Confirm the working directory is the project root (`grimwar/`). Verify `CLAUDE.md`, `docs/`, `plans/`, `prototype/grimwar.html` are present.
- [ ] 2. Initialize git: `git init`, create `.gitignore` (use the included one as base).
- [ ] 3. Scaffold Vite: `pnpm create vite@latest . --template react-ts` (answer "yes" to overwriting if asked, but **preserve** `CLAUDE.md`, `docs/`, `plans/`, `prototype/`, `content-sources/`, `scripts/`, `.gitignore`, `README.md`).
- [ ] 4. Replace generated `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json` with the project-specific versions (use the included ones).
- [ ] 5. Install runtime deps:
    ```bash
    pnpm add react-router-dom zustand dexie firebase clsx tailwind-merge
    ```
- [ ] 6. Install dev deps:
    ```bash
    pnpm add -D tailwindcss postcss autoprefixer @types/node \
      vitest @vitest/ui @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom \
      @playwright/test \
      eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-plugin-react eslint-plugin-react-hooks eslint-plugin-jsx-a11y \
      prettier
    ```
- [ ] 7. Initialize Tailwind: `npx tailwindcss init -p`. Then replace generated `tailwind.config.ts` and `postcss.config.js` with the project versions (use the included ones).
- [ ] 8. Create folder skeleton (empty `.gitkeep` files are fine for now):
    ```
    src/
      features/
        auth/.gitkeep
        library/.gitkeep
        wizard/.gitkeep
        sheet/.gitkeep
        dice/.gitkeep
        radial-menu/.gitkeep
      shared/
        components/.gitkeep
        hooks/.gitkeep
        lib/.gitkeep
        types/.gitkeep
        design/.gitkeep
      styles/
    public/
      data/.gitkeep
      icons/.gitkeep
      fonts/.gitkeep
    tests/
      e2e/.gitkeep
    ```
- [ ] 9. Write `src/styles/globals.css` with:
    - `@tailwind base; @tailwind components; @tailwind utilities;`
    - Google Fonts `@import` for Cinzel Decorative, Cinzel, Cormorant Garamond, Inter
    - `:root` CSS variables matching `docs/DESIGN-SYSTEM.md`
    - `html, body { overflow-x: hidden; max-width: 100vw; }`
    - `@media (prefers-reduced-motion: reduce)` global reset
    - `:focus-visible` style
- [ ] 10. Write `src/main.tsx`: mounts `<App />` to `#root`, imports `globals.css`.
- [ ] 11. Write `src/App.tsx`: a temporary placeholder that displays "GrimWar" in `font-display` over a dark bg with the aurora visible. This validates the design tokens load.
- [ ] 12. Replace `index.html` with the project version (set lang="fr", title="GrimWar", meta theme-color="#08060e", viewport).
- [ ] 13. Add scripts to `package.json`:
    ```json
    {
      "scripts": {
        "dev": "vite",
        "build": "tsc -b && vite build",
        "preview": "vite preview",
        "typecheck": "tsc -b --noEmit",
        "test": "vitest run",
        "test:watch": "vitest",
        "test:e2e": "playwright test",
        "lint": "eslint . --ext .ts,.tsx",
        "format": "prettier --write \"src/**/*.{ts,tsx,css}\""
      }
    }
    ```
- [ ] 14. Configure ESLint: minimal config that enforces no-unused-vars, no-explicit-any, react-hooks/rules-of-hooks, react-hooks/exhaustive-deps as errors. Save as `.eslintrc.cjs` or `eslint.config.js`.
- [ ] 15. Configure Prettier: `.prettierrc` with `{ "singleQuote": true, "semi": true, "trailingComma": "all", "printWidth": 100 }`.
- [ ] 16. Run `pnpm dev`, open `http://localhost:5173`. Verify:
    - Page loads, dark background visible
    - "GrimWar" displays in Cinzel Decorative gold gradient
    - Aurora blobs drift slowly in background
    - No console errors
- [ ] 17. Run `pnpm typecheck` — must be clean.
- [ ] 18. Run `pnpm build` — must produce a `dist/` folder without errors.
- [ ] 19. Initial commit: `git add . && git commit -m "feat: scaffold project (plan 01)"`.

## Definition of Done

- [ ] All 19 steps complete and checked
- [ ] `pnpm dev` shows the placeholder with proper fonts, gold gradient, aurora background
- [ ] `pnpm typecheck` clean
- [ ] `pnpm build` succeeds
- [ ] `pnpm test` runs (no tests yet — exits 0)
- [ ] Folder structure matches `docs/ARCHITECTURE.md`
- [ ] Git repo initialized with initial commit
- [ ] No `any` types anywhere
- [ ] No console warnings/errors on page load

## Notes for next plan

Plan 02 (Design system) builds on top: turns the inline placeholder styles into a real component library (GlassPanel, Card, Button, Aurora, Particles, Icon sprite, etc.). The SVG icon sprite content is in `prototype/grimwar.html` — copy verbatim.
