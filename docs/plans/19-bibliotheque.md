# Plan 19 — Bibliothèque (content browser)

## Goal
Tabbed content browser at `/library/content` showing Sorts / Objets / Monstres / Conditions / Dons / Objets magiques. Locale-aware search, filters per tab (school, level, CR, rarity…), detail modal. Reads from public + user customContent + campaign customContent. DM-only: "Créer un objet maison" button in each tab.

## Context
Read `docs/DATA-MODEL.md` (public content + customContent), `docs/I18N.md` (locale-aware search).

## Prerequisites
Plans 04, 16 complete.

## Steps
- [ ] 1. Route `/library/content` → `<ContentBrowser />`.
- [ ] 2. Tab navigation: Sorts / Objets / Monstres / Conditions / Dons / Objets magiques. Lazy-load per tab.
- [ ] 3. Per-tab list components reading from `useContent(type)` (which merges public + user + campaign).
- [ ] 4. Search input: filters by `localize(name, locale)` and `localize(description, locale)` (substring, case-insensitive, accent-insensitive).
- [ ] 5. Filter chips per tab:
    - Sorts: level (0-9), school, class, ritual, concentration
    - Objets: category, source
    - Monstres: CR range, size, type
    - Conditions: source
    - Dons: prereq
    - Objets magiques: rarity, attunement, equipped type
- [ ] 6. Tap an item → `<ContentDetailModal />` shows full description (i18n), stats, source.
- [ ] 7. "Créer" button (visible if user has DM role in active campaign, or always for "Mes objets perso"):
    - Sorts: form to create homebrew spell
    - Objets, Magic items, Monstres: similar forms
    - Writes to `users/{uid}/customContent/{type}/{id}` (private) OR `campaigns/{id}/customContent/{type}/{id}` (campaign-scoped — DM only).
    - Toggle "Visible pour ma campagne actuelle ?" if user is DM.
- [ ] 8. Edit / delete affordances on custom content owned by user (or DM-created in campaign).
- [ ] 9. Tests: unit for locale-aware search (accents folded).
- [ ] 10. e2e: search "boule" (locale FR) finds "Boule de feu".
- [ ] 11. `pnpm typecheck && pnpm test && pnpm lint`
- [ ] 12. Commit: `feat(library): content browser + homebrew creation (plan 19)`

## Definition of Done
- [ ] All 6 tabs populated from real data
- [ ] Locale-aware search works
- [ ] Filters work
- [ ] Homebrew creation works (user-private + campaign-scoped)
- [ ] Edit/delete of own custom content works

## Notes for next plan
- Plan 20 (Sheet Âme mode) uses this browser as a "see all features" link target.
