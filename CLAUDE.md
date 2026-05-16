# GrimWar — Claude Code context

> **Read this in full at the start of every session.** This is the master rulebook. The plans in `plans/` are the work queue. The docs in `docs/` are the architectural reference. The prototype at `prototype/grimwar.html` is the visual reference.

## Project overview

**GrimWar** is a D&D 5e campaign management PWA — mobile-first, cinematic, illuminated-manuscript aesthetic. It is **not** a fiche numérique : it's a full table-companion tool where a DM runs a campaign, invites players, and **every game event is auto-logged** to build a living session journal.

**Players** create their PJ via a guided wizard, manage inventory from a strict items DB (no free-string items), level up with assistance, and play with a roll-by-tap radial menu interface.

**The DM** runs encounters, controls maps (with .dd2vtt imports from Dungeon Alchemist), takes session notes, sees the auto-compiled campaign journal, and has **full authority** over every player's character sheet.

**Commercial intent**: this codebase is built to be potentially commercialized. No paywall yet, but the foundations (security rules, GDPR endpoints, subscription tier placeholder, EU data residency) are in place from day one.

**Primary user (and DM)**: Adrien. Brussels-based. French. The first campaign is in person with friends; the app must work in airplane mode on a phone in a cave.

## Stack (locked)

- **React 18** + **Vite** + **TypeScript strict** (no `any`)
- **Tailwind CSS** with custom design tokens — see `docs/DESIGN-SYSTEM.md`
- **Zustand** for global state (slices per feature)
- **Dexie** (IndexedDB) for local cache + offline reads of public content
- **Firebase**: Auth (anonymous + Google + email), Firestore (europe-west1 region for GDPR), Hosting, App Check (rate limiting)
- **PixiJS** — Sprint 4 only, for the VTT map
- **Vitest** + **Playwright** for tests
- **Workbox** for service worker / offline

## GSD workflow + autonomy rules

Plans in `plans/` are numbered, sequential, sprinted (`S1` table-ready MVP, `S2` campaigns, `S3` DM tools + journal, `S4` map, `S5` polish + launch). See `docs/ROADMAP.md`.

### Execution rules

1. **Pick the lowest-numbered unfinished plan.**
2. **Read it fully before any code.**
3. **Each step has a `[ ]` checkbox** — mark `[x]` only when verifiably done.
4. **Definition of Done** at the bottom must all pass. Run `pnpm typecheck && pnpm test && pnpm lint` at every DoD check.
5. **Commit** with conventional message at end of every plan.

### Autonomy — what Claude Code decides alone

Claude Code has authority to make tactical decisions without asking. Specifically:

- **File structure within a feature folder** — split into sub-files as makes sense
- **Variable, function, type names** (follow conventions below)
- **Library version bumps within a minor** (e.g. zustand 5.0.1 → 5.0.4 fine; 5 → 6 ask)
- **Minor UX adjustments** — exact button placement, hover-state styling, error message wording
- **Test composition** — which functions to unit-test, which flows to e2e
- **Internal refactors** that don't change public APIs
- **Adding small utility helpers** when a pattern repeats 3+ times
- **CSS class organization** within a Tailwind cluster
- **Skipping a documented optional step** if it doesn't apply (e.g. a class isn't a spellcaster, skip spell choice UI)

When making any of these decisions, **document it inline in the plan** (e.g. `- [x] 5. Used cva for button variants (over manual switch)`).

### Autonomy — what requires Adrien

Stop and ask Adrien if:

- **Architectural conflict** with an existing decision in this file or any `docs/*.md`
- **New external dependency** not in `package.json`
- **Scope creep** — a step reveals work that isn't in the plan's stated goal
- **Schema change** to Firestore data model (must update `docs/DATA-MODEL.md` + bump migration version)
- **Security rules change** beyond what the plan specifies
- **Commercial-readiness compromise** — anything that would weaken security, leak data, or break GDPR
- **Visual departure** from the prototype style guide — small refinements are fine, large changes require approval
- **A step is blocked by an external action** (e.g. "Adrien must create Firebase project" — pause and document)

**How to pause**: leave a clear comment in the plan file:

```md
- [!] 12. BLOCKED: AideDD HTML format unexpected for monsters — selectors find no .statblock. Need Adrien to provide one sample file or confirm the source format.
```

Then commit with `chore(plan-NN): blocked at step 12, see plan for context` and stop. Don't improvise on blocked steps.

### Continuity

Each plan ends with `## Notes for next plan` — read this when starting the next one. If you discover something useful while executing plan N, write it there so plan N+1 inherits the knowledge.

## Decision log

These are LOCKED. Override only with Adrien's explicit instruction.

| Area | Decision |
|---|---|
| Project name | `grimwar` |
| Repo path | `C:\Users\adrie\Documents\grimwar\` |
| Default language | French (FR). i18n shape from day 1, EN added in S5. |
| Auth providers | Anonymous + Google + Email/password (Apple Sign-In deferred) |
| Firestore region | **europe-west1** (GDPR / data residency) |
| Character ownership | **Player-owned, portable** between campaigns |
| Campaign invites | **Shareable link + 6-char invite code** (no email required) |
| DM permissions | **Full authority** — DM can edit any field on any character in their campaign |
| **Multi-classing** | **Supported from v1.** Character has `classes[]` array + `totalLevel` denormalized. 5e multi-class rules in `lib/rules/multiclass.ts`. |
| **Character status** | `'alive' \| 'dead'` field. On 3 death save fails → `dead` + sheet read-only. DM has a "Ressusciter" button that restores to alive at 1 HP. |
| **5e variants** | 4 per-campaign toggles in `settings.variants`: `featAtLevel1`, `flanking`, `slowHealing`, `grittyRealism`. All default `false`. Wizard + sheet + rest mechanics respect these toggles. |
| Subscription tier | Schema field `tier: 'free' \| 'pro'` on user (placeholder, no paywall yet) |
| Items in inventory | **Strict reference to items DB** — no free-string items |
| Content source priority | **PDFs are source of truth #1**. Mechanics come from the SRD 5.2.1 PDF (Creative Commons, EN edition `SRD_CC_v5.2.1.pdf`). FR overlay comes from the SRD 5.2.1 FR edition (`FR_SRD_CC_v5.2.1.pdf`) — same ruleset, two languages, 1:1 structural mapping. AideDD HTML provides FR translations for entities not present in SRD (filtered to SRD-equivalent only). PDF wins in any conflict. |
| DMG / PHB / MM | Private only. Never bundled, never published. |
| Roll engine | Custom (~150 lines, prototyped). 3D dice deferred to S5. |
| Map / VTT | Sprint 4. PixiJS + .dd2vtt import. |
| Real-time sync | Firestore `onSnapshot` listeners on active campaign + character + recent events |
| Event logging | Auto on every gameplay action. See `docs/EVENT-LOG.md`. |
| GDPR | Export endpoint + account deletion endpoint mandatory before public launch (S5) |
| Visual fidelity | Faithful to `prototype/grimwar.html` (mobile-first), small refinements OK |

Any decision NOT in this table is Claude Code's call. If it affects multiple plans, document it in the relevant `docs/*.md`.

## Folder structure

```
grimwar/
├── public/
│   ├── data/                    # bundled SRD/Free Rules JSON
│   ├── icons/                   # PWA icons
│   └── manifest.webmanifest
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── routes.tsx
│   ├── features/
│   │   ├── auth/                # sign-in, account upgrade
│   │   ├── library/             # character list + content browser
│   │   ├── wizard/              # character creation + level-up
│   │   ├── sheet/               # character sheet (5 modes)
│   │   ├── dice/                # roll engine + tray
│   │   ├── radial-menu/         # press-hold FAB
│   │   ├── campaigns/           # S2 — campaign list, settings, invites
│   │   ├── invitations/         # S2 — join flow
│   │   ├── dm-view/             # S3 — DM dashboard
│   │   ├── encounters/          # S3 — combat tracker
│   │   ├── sessions/            # S3 — session manager + notes
│   │   ├── journal/             # S3 — auto-compiled campaign journal
│   │   ├── map/                 # S4 — PixiJS VTT
│   │   ├── account/             # S5 — settings, GDPR, billing-ready
│   │   └── legal/               # S5 — privacy, ToS
│   ├── shared/
│   │   ├── components/          # GlassPanel, Card, Button, Chip, Icon, Aurora…
│   │   ├── hooks/
│   │   ├── lib/
│   │   │   ├── firebase.ts
│   │   │   ├── dexie-db.ts
│   │   │   ├── content-loader.ts
│   │   │   ├── event-logger.ts  # the single entry point for logging
│   │   │   ├── permissions.ts   # canEdit(user, character, campaign) etc.
│   │   │   ├── i18n.ts          # t(key) + entity name resolver
│   │   │   ├── rules/           # 5e rule helpers
│   │   │   └── slices/          # zustand slices
│   │   ├── types/
│   │   └── design/
│   └── styles/
├── docs/                        # architectural reference
├── plans/                       # GSD work queue
├── scripts/                     # content extraction
├── content-sources/             # raw PDFs + HTML (gitignored)
├── prototype/grimwar.html      # visual reference
└── tests/
```

## Coding conventions

- **File names**: `kebab-case.ts` / `kebab-case.tsx`. One component per file, file name = component name.
- **Component names**: `PascalCase`. Hooks: `useThing`. Zustand stores: `useThingStore`.
- **Imports**: `@/` alias for cross-feature. Relative imports only within a feature folder.
- **Comments**: French for prose, English for code identifiers. Comment the **why**.
- **No `any`**. Use `unknown` and narrow. `as` only after a guard.
- **No default exports** for components. Named exports only.
- **Functional components only.** No class components.
- **No `useEffect` for derived state.** Compute in render or `useMemo`.
- **State boundaries**: `useState` for local UI, feature Zustand slice for cross-component, root slice for app-wide.
- **Tailwind first.** Custom CSS only when Tailwind can't express it. Prefer CSS modules over global.
- **`cn()` helper** in `src/shared/lib/cn.ts` wrapping `clsx` + `tailwind-merge` for all conditional classes.
- **All UI strings via `t(key)`** from `src/shared/lib/i18n.ts`. FR default.

## Forbidden patterns

- ❌ `eval`, `new Function`, `dangerouslySetInnerHTML` (unless sanitized — ask first)
- ❌ Class components
- ❌ Default exports for components
- ❌ Magic numbers in JSX (extract to consts or tokens)
- ❌ Inline styles for non-dynamic styling
- ❌ Hardcoded colors / fonts / sizes (use tokens)
- ❌ Hardcoded UI strings (use `t(key)`)
- ❌ **Free-string items in inventory** (must reference items DB)
- ❌ Mixing Firestore reads with presentation (data layer hooks only)
- ❌ Skipping security rules updates when adding new collections
- ❌ Skipping event logging when adding new gameplay actions

## Required at every commit

- `pnpm typecheck` clean
- `pnpm test` green
- `pnpm lint` clean
- Conventional commit message: `feat(scope): summary` or `fix(scope): summary`

## References

- `docs/ARCHITECTURE.md` — folder structure, routing, data flow, PWA
- `docs/DATA-MODEL.md` — Firestore schema, types, indexes
- `docs/DESIGN-SYSTEM.md` — colors, type, motion, components
- `docs/PERMISSIONS.md` — DM/Player/Spectator matrix
- `docs/EVENT-LOG.md` — event types, structure, visibility
- `docs/I18N.md` — text shape, translation strategy
- `docs/VARIANTS.md` — 5e variants and where each is wired
- `docs/COMMERCIAL-READINESS.md` — security, GDPR, monetization placeholders
- `docs/ROADMAP.md` — 5-sprint plan
- `plans/00-overview.md` — full plan index

## When in doubt

1. Check this file's decision log.
2. Check `docs/*.md`.
3. Check the prototype HTML.
4. Check the relevant plan's `## Notes for next plan`.
5. **Only if none answer it: pause and ask Adrien** (see autonomy rules above).
