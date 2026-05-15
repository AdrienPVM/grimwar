# Plans overview

40 plans across 5 sprints. Numbered, sequential. Pick lowest unfinished. Each has explicit DoD.

## Sprint 1 — Table-ready MVP (13 plans)

Adrien joue Lyralei sur son téléphone à la prochaine session.

| # | Plan | Status |
|---|---|---|
| 01 | [Foundation](./01-foundation.md) — Vite/React/TS scaffold, Tailwind, folder skeleton | TODO |
| 02 | [Design system](./02-design-system.md) — tokens, atomic components, sprite, aurora, particles | TODO |
| 03 | [Firebase setup](./03-firebase-setup.md) — Auth (anon+Google+email), Firestore eu-west1, App Check, baseline rules | TODO |
| 04 | [Content pipeline](./04-content-pipeline.md) — PDFs (truth #1), AideDD translations, i18n shape, items DB strict | TODO |
| 05 | [Manual character form](./05-manual-character.md) — formulaire rapide pour créer un PJ | TODO |
| 06 | [Sheet foundation](./06-sheet-foundation.md) — routes, layout, hero card, mode tabs, status strip | TODO |
| 07 | [Sheet Combat mode](./07-sheet-combat.md) — battle HUD, HP, conditions, attacks, death saves, revive | TODO |
| 08 | [Sheet Essence mode](./08-sheet-essence.md) — hexagram, saves, skills | TODO |
| 09 | [Sheet Magie mode](./09-sheet-magie.md) — magic circle, slot runes, spell list (multi-class slots) | TODO |
| 10 | [Sheet Avoir mode](./10-sheet-avoir.md) — inventory strict, weight, coins | TODO |
| 11 | [Radial FAB menu](./11-radial-fab.md) — gesture, wedges, sub-menus | TODO |
| 12 | [Dice + roll engine](./12-dice-engine.md) — parser, advantage, history, toasts | TODO |
| 13 | [PWA + deploy v0.0.1](./13-pwa-deploy.md) — manifest, SW, install, Firebase Hosting | TODO |

## Sprint 2 — Campaigns + wizard (7 plans)

Tes copains rejoignent, créent leur PJ via wizard.

| # | Plan | Status |
|---|---|---|
| 14 | [Campaigns model](./14-campaigns-model.md) — Firestore campaigns + memberships + variant toggles | TODO |
| 15 | [Invitation system](./15-invitations.md) — link + 6-char code, accept flow, Cloud Function | TODO |
| 16 | [Memberships + permissions](./16-memberships-permissions.md) — DM authority, security rules | TODO |
| 17 | [Wizard creation](./17-wizard-creation.md) — 7 étapes guidées, multi-class, feat-at-lvl-1 variant | TODO |
| 18 | [Wizard level-up](./18-wizard-levelup.md) — pick class, HP, sous-classe, ASI/feat | TODO |
| 19 | [Bibliothèque](./19-bibliotheque.md) — content browser, recherche, filtres | TODO |
| 20 | [Sheet Âme mode](./20-sheet-ame.md) — personality, features, stats dashboard | TODO |

## Sprint 3 — DM tools + auto-journal + handouts + NPCs (8 plans)

Vue MJ, event log, journal compilé, documents, PNJs récurrents.

| # | Plan | Status |
|---|---|---|
| 21 | [DM dashboard](./21-dm-dashboard.md) — vue d'ensemble campagne | TODO |
| 22 | [Event log infrastructure](./22-event-log.md) — event-logger.ts + auto-log gameplay | TODO |
| 23 | [Sessions manager](./23-sessions.md) — start/end, attendance, notes Markdown | TODO |
| 24 | [Combat encounter manager](./24-encounters.md) — initiative, monstres, party view DM | TODO |
| 25 | [Journal compiler](./25-journal-compiler.md) — events → narrative auto par session | TODO |
| 26 | [DM omniedit](./26-dm-omniedit.md) — UI exposant l'autorité totale du MJ + revive | TODO |
| **27** | [**Handouts MJ→joueur**](./27-handouts.md) — envoyer images/textes pendant la session | **TODO** |
| **28** | [**NPCs récurrents**](./28-npcs.md) — fiche light, directory, invocation en combat | **TODO** |

## Sprint 4 — Carte + mode TV (5 plans)

Import .dd2vtt, tokens, lighting, fog, mode présentation TV.

| # | Plan | Status |
|---|---|---|
| 29 | [PixiJS + .dd2vtt import](./29-pixijs-foundation.md) — parser dd2vtt, viewport, pan/zoom | TODO |
| 30 | [Tokens](./30-tokens.md) — placement, drag, sync temps réel | TODO |
| 31 | [Lighting + LOS](./31-lighting.md) — sources, calcul vision par token | TODO |
| 32 | [Fog of war](./32-fog-of-war.md) — control MJ-only, sync | TODO |
| **33** | [**Mode présentation / TV**](./33-tv-presentation.md) — full-screen carte+init pour TV | **TODO** |

## Sprint 5 — Polish + public launch (7 plans)

i18n EN, account, GDPR, legal, PDF export, spell sigils, public stats, prod.

| # | Plan | Status |
|---|---|---|
| 34 | [i18n EN](./34-i18n-en.md) — extraction strings, traduction, switcher | TODO |
| 35 | [Account management + GDPR](./35-account-management.md) — settings, export data, delete account | TODO |
| 36 | [Legal pages + privacy](./36-legal-pages.md) — privacy policy, terms, cookie consent | TODO |
| **37** | [**Export PDF de la fiche**](./37-pdf-export.md) — Puppeteer + 2 styles (Classic / GrimWar) | **TODO** |
| **38** | [**Spell card sigils**](./38-spell-sigils.md) — animations procédurales sur cast | **TODO** |
| **39** | [**Stats publiques de campagne**](./39-public-stats.md) — page partageable souvenir | **TODO** |
| 40 | [Production deploy + perf](./40-production-deploy.md) — Lighthouse 90+, prod URL, monitoring | TODO |

## Rules

- **Sequential**: don't jump unless dependencies are clearly satisfied.
- **Mark each step `[x]`** as completed (or `[!]` if blocked).
- **Run checkpoints** every 3-5 steps: `pnpm typecheck && pnpm test && pnpm lint`.
- **DoD must pass** before marking the plan complete.
- **Architectural surprises** → stop and ask Adrien before improvising.

## Plan template

```md
# Plan NN — [Name]

## Goal
One paragraph. What does "done" look like for the user?

## Context
- Files to read first
- Related docs
- Prerequisites (previous plans, env setup)

## Steps
- [ ] 1. …
- [ ] 2. …

## Definition of Done
- [ ] All steps checked
- [ ] `pnpm typecheck` clean
- [ ] `pnpm test` green
- [ ] (relevant) `pnpm dev` shows expected UI
- [ ] (relevant) tested on mobile viewport (375px and 414px)
- [ ] Committed with conventional message

## Notes for next plan
(Anything the next plan should know — schema updates, tech debt, etc.)
```
