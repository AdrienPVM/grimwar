# GrimWar

[![CI](https://github.com/AdrienPVM/grimwar/actions/workflows/ci.yml/badge.svg)](https://github.com/AdrienPVM/grimwar/actions/workflows/ci.yml)

A D&D 5e **campaign management PWA** — mobile-first, cinematic, illuminated-manuscript aesthetic.

Built for the DM and their party. Real-time multi-user. Every gameplay action auto-logged to compile a living session journal. Cinematic radial menu instead of buttons. Works offline.

## Status

🛠 In active development. Roadmap: 5 sprints, 34 plans, see `docs/ROADMAP.md`.

| Sprint | Milestone | ETA (mi-temps) |
|---|---|---|
| **S1** | v0.0.1 — Table-ready solo MVP | 5-6 sem |
| **S2** | v0.0.2 — Multi-user campaigns + wizard | 4-5 sem |
| **S3** | v0.0.3 — DM tools + auto-journal | 4-5 sem |
| **S4** | v0.0.4 — Carte interactive .dd2vtt | 3-4 sem |
| **S5** | v1.0 — Public launch | 2-3 sem |

## Quick start

```bash
pnpm install
cp .env.example .env.local        # fill in Firebase config
cp .firebaserc.example .firebaserc # fill in project id
pnpm dev
```

Then open http://localhost:5173.

## Built with

- React 18 + Vite + TypeScript strict
- Tailwind CSS with custom design tokens
- Zustand for state
- Dexie for local cache + offline
- Firebase Auth (anon + Google + email), Firestore (europe-west1), Hosting, App Check
- PixiJS (Sprint 4) for VTT map
- Vitest + Playwright for tests
- Workbox for service worker

## Working with Claude Code (GSD)

This codebase is built via the GSD (Get Stuff Done) framework with Claude Code. The whole workflow is in `CLAUDE.md`.

1. Open the repo in Claude Code.
2. Run `cat CLAUDE.md` to see the rules + decision log.
3. Run `ls plans/` and pick the lowest-numbered unfinished plan.
4. Claude Code reads the plan, executes step by step, commits at the end.

Claude Code has explicit **autonomy** for tactical decisions; it only stops for architectural conflicts, scope creep, or external dependencies that need Adrien's input.

## Folder tour

```
docs/         # architectural reference — read these
plans/        # GSD work queue — pick lowest unfinished
prototype/    # the visual reference (HTML)
src/          # the code
scripts/      # content extraction (PDFs, AideDD)
content-sources/  # raw PDFs + HTML (gitignored, you provide)
```

## Key documents

- `CLAUDE.md` — the master rulebook, read at every session start
- `docs/ARCHITECTURE.md` — folder structure, routing, data flow
- `docs/DATA-MODEL.md` — Firestore schema
- `docs/DESIGN-SYSTEM.md` — colors, type, motion
- `docs/PERMISSIONS.md` — DM/Player matrix
- `docs/EVENT-LOG.md` — what gets logged + journal compiler
- `docs/I18N.md` — translation strategy
- `docs/VARIANTS.md` — 5e variants (multi-class, feats at lvl 1, flanking, slow healing, gritty realism)
- `docs/COMMERCIAL-READINESS.md` — security, GDPR, monetization placeholders
- `docs/ROADMAP.md` — 5-sprint plan

## License

TBD. Code: MIT or proprietary depending on commercialization. Content from SRD 5.1 / Free Rules 2024: under OGL / CC-BY-4.0 respectively. DMG content is not bundled.
