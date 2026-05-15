# Plan 06 — Sheet foundation

## Goal

The character sheet screen at `/character/:id` exists, loads from Firestore, shows a hero card with name + class + level + portrait, a status strip (HP/AC/Init/Speed at a glance), and a tabbed/swipeable mode selector across the 5 modes (Combat / Essence / Magie / Avoir / Âme). Mode content is empty placeholders — filled by plans 07-10 and 20.

## Context
Read `prototype/grimwar.html` (especially the sheet layout), `docs/DATA-MODEL.md` (Character schema), `docs/PERMISSIONS.md` (read access).

## Prerequisites
Plans 01-05 complete. A character exists in Firestore.

## Steps

### Route + data layer
- [ ] 1. Add route `/character/:id` → `<SheetScreen />`.
- [ ] 2. Create `src/features/sheet/use-character.ts`: subscribes to `users/{uid}/characters/{id}` via `onSnapshot`; returns `{ character, isLoading, error }`. If not found, returns `{ character: null }`.
- [ ] 3. Create `src/features/sheet/sheet-screen.tsx`. On mount, read `:id` from URL. While loading, show splash. If not found, render a "Personnage introuvable" empty state with link back to `/`.

### Layout
- [ ] 4. Outer container: full-viewport, aurora background, glass panel safe area with `pb-32` for the FAB region.
- [ ] 5. Top: `<HeroCard />` showing portrait, name (Cinzel Decorative), class + ancestry + level subtitle, alignment chip.
- [ ] 6. Below hero: `<StatusStrip />` with 4-up grid: HP (current/max), AC, init mod, speed. Each is a `<Chip />` variant.
- [ ] 7. Below status: `<ModeTabs />` — 5 tabs (Combat / Essence / Magie / Avoir / Âme), bottom-bordered for active, swipeable on mobile.
- [ ] 8. Below tabs: mode content area. Renders the active mode component (placeholders for now).

### Mode infrastructure
- [ ] 9. Create `src/features/sheet/use-sheet-mode.ts` (Zustand slice or local store): tracks active mode per character. Default to user's `settings.sheetDefaultMode` if set, else `'combat'`.
- [ ] 10. Mode components are file-scoped, all live under `src/features/sheet/modes/{mode}/`:
    - `combat-mode.tsx` (just renders "Combat — TODO" for now)
    - `essence-mode.tsx`
    - `magie-mode.tsx`
    - `avoir-mode.tsx`
    - `ame-mode.tsx`

### HP-driven body classes
- [ ] 11. The sheet root element gets a class based on HP %:
    - `> 75%` → `hp-healthy`
    - `25–75%` → `hp-wounded`
    - `< 25%` → `hp-critical`
    - `0` → `hp-down`
- [ ] 12. CSS in `globals.css`: these classes adjust aurora intensity and add subtle pulsing border on critical/down (respect `prefers-reduced-motion`).

### Permission gate (preparatory, full enforcement S2)
- [ ] 13. Use `usePermissions(character)` hook (skeleton): returns `{ canEdit: boolean }`. For S1, `canEdit` is `character.userId === currentUser.uid`. S2 expands for DM authority.
- [ ] 14. Pass `canEdit` down via context so mode components can show/hide edit affordances.

### Updater helper
- [ ] 15. Create `src/features/sheet/use-update-character.ts`: returns `updateCharacter(patch: Partial<Character>)`. Internally:
    - Optimistic update in Zustand (currentCharacter slice)
    - Firestore `updateDoc(charRef, { ...patch, updatedAt: serverTimestamp(), updatedBy: uid })`
    - On error: rollback Zustand + toast
- [ ] 16. **NB**: Event logging will be added in plan 22 (S3) when we have campaigns. For S1, character updates don't log events yet.

### Tests
- [ ] 17. e2e: open `/character/{id}`, see hero card, see status strip, switch modes via tap.

### Final
- [ ] 18. `pnpm typecheck && pnpm test && pnpm lint`
- [ ] 19. Commit: `feat(sheet): foundation + hero + status + mode tabs (plan 06)`

## Definition of Done
- [ ] All steps checked
- [ ] Sheet loads, hero displays, mode tabs work
- [ ] Layout responsive at 375px and 414px viewports
- [ ] HP-driven body class applies and visibly changes the aurora
- [ ] Updates persist to Firestore (verify in console)

## Notes for next plan
- Plan 07 (Combat mode) is the first real mode content. It uses `useCharacter` + `useUpdateCharacter` heavily.
- The event-logger.ts file is intentionally not present yet — gameplay actions in S1 update characters but don't log events (no campaign context). Logging is added retroactively in plan 22.
