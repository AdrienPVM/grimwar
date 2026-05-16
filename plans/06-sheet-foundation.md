# Plan 06 — Sheet foundation

## Goal

The character sheet screen at `/character/:id` exists, loads from Firestore, shows a hero card with name + class + level + portrait, a status strip (HP/AC/Init/Speed at a glance), and a tabbed/swipeable mode selector across the 5 modes (Combat / Essence / Magie / Avoir / Âme). Mode content is empty placeholders — filled by plans 07-10 and 20.

## Context
Read `prototype/grimwar.html` (especially the sheet layout), `docs/DATA-MODEL.md` (Character schema), `docs/PERMISSIONS.md` (read access).

## Prerequisites
Plans 01-05 complete. A character exists in Firestore.

## Steps

### Route + data layer
- [x] 1. Add route `/character/:id` → `<SheetScreen />`. Lazy-loaded comme `ManualCharacterScreen` ; remplace le stub `CharacterPlaceholder` ajouté en plan 05.
- [x] 2. Create `src/features/sheet/use-character.ts`: subscribes to `users/{uid}/characters/{id}` via `onSnapshot`; returns `{ character, isLoading, error }`. If not found, returns `{ character: null }`. Validation Zod inline pour surfacer un doc Firestore corrompu plutôt que crasher un mode plus tard.
- [x] 3. Create `src/features/sheet/sheet-screen.tsx`. On mount, read `:id` from URL. While loading, show splash. If not found, render a "Personnage introuvable" empty state with link back to `/`. Ajouté aussi un état d'erreur (validation Zod ou Firestore) avec retry-friendly UX.

### Layout
- [x] 4. Outer container: full-viewport, aurora background, glass panel safe area with `pb-32` for the FAB region. Aurora vient déjà du shell App.tsx — pas besoin de la re-monter.
- [x] 5. Top: `<HeroCard />` showing portrait, name (Cinzel Decorative), class + ancestry + level subtitle, alignment chip. Multi-class : subtitle "Classe1 N / Classe2 M" si >1 classe.
- [x] 6. Below hero: `<StatusStrip />` with 4-up grid: HP (current/max), AC, init mod, speed. Cellules glass-light avec icône + label + valeur (au lieu du `<Chip />` variant — plus lisible pour des valeurs numériques).
- [x] 7. Below status: `<ModeTabs />` — 5 tabs (Combat / Essence / Magie / Avoir / Âme), bottom-bordered for active, swipeable on mobile (touchstart/end inline, ~30 lignes vs react-swipeable comme dep).
- [x] 8. Below tabs: mode content area. Renders the active mode component (placeholders for now).

### Mode infrastructure
- [x] 9. Create `src/features/sheet/use-sheet-mode.ts` (Zustand slice persist localStorage): tracks active mode per character. Default `'combat'`. La préférence `settings.sheetDefaultMode` arrive en S2 (settings utilisateur) — le param `fallback` du hook est prêt à recevoir cette valeur.
- [x] 10. Mode components are file-scoped, all live under `src/features/sheet/modes/`:
    - `combat-mode.tsx`, `essence-mode.tsx`, `magie-mode.tsx`, `avoir-mode.tsx`, `ame-mode.tsx` — chacun délègue à `mode-placeholder.tsx` partagé (5 corps identiques en S1 = duplication inutile, plans 07-10+20 remplaceront le body de chaque fichier au cas par cas).

### HP-driven body classes
- [x] 11. The sheet root element gets a class based on HP %: `hpStateFor(current, max)` retourne `hp-healthy` (>75%), `hp-wounded` (25-75%), `hp-critical` (<25% non nul), `hp-down` (≤0 ou max≤0).
- [x] 12. CSS in `globals.css`: classes `.sheet-state.hp-*` modulent filter (saturate/brightness) + bordure crimson pulsée (critical) ou fixe (down). Pulse animation respect global reduced-motion via la règle générique déjà en place.

### Permission gate (preparatory, full enforcement S2)
- [x] 13. `usePermissions(character)` hook : en S1 retourne `{ canEdit: true }` dès lors qu'on est signed-in + character non null. Pas de `character.userId` à comparer (l'ownership est porté par le chemin Firestore `/users/{uid}/`). Plan 16 étendra pour DM authority via cross-collection lookup + Cloud Function.
- [x] 14. `PermissionProvider` + `usePermissionContext()` (context React) — les modes lisent `canEdit` via le contexte plutôt que de re-calculer.

### Updater helper
- [x] 15. Create `src/features/sheet/use-update-character.ts`: returns `updateCharacter(patch: Partial<Character>)`. Pas d'optimistic local : la source de vérité unique est `onSnapshot` (refresh <100ms, pas de rollback à gérer). Si latence visible apparaît plus tard, ajouter l'optimistic ciblé en plan 22.
- [x] 16. **NB**: Event logging will be added in plan 22 (S3) when we have campaigns. For S1, character updates don't log events yet.

### Tests
- [!] 17. e2e: open `/character/{id}`, see hero card, see status strip, switch modes via tap. **Reporté à S5 plan 39** avec la suite e2e globale (cohérent avec plan 05 step 24). Couvert temporairement par : 10 unit tests pour les seuils HP (`hp-state.test.ts`) + manuel UAT.

### Final
- [x] 18. `pnpm typecheck && pnpm test && pnpm lint` — vert (32/32 tests, 0 warning lint).
- [x] 19. Commit: `feat(sheet): foundation + hero + status + mode tabs (plan 06)`

## Definition of Done
- [x] All steps checked (e2e step 17 reporté à S5 plan 39 — couverture unit-test pour les seuils HP).
- [x] Sheet loads, hero displays, mode tabs work — triple gate vert, structure prête à UAT.
- [ ] Layout responsive at 375px and 414px viewports — **UAT visuel à Adrien (voir notes ci-dessous).**
- [ ] HP-driven body class applies and visibly changes the aurora — **UAT visuel à Adrien.**
- [ ] Updates persist to Firestore (verify in console) — **bloqué tant que rules patchées ne sont pas deployées** (commit `fix(firestore): align character rules with multi-class schema` du 2026-05). Adrien deploys `firestore:rules` seul (pas d'index orphelin).

## Notes for next plan
- Plan 07 (Combat mode) is the first real mode content. It uses `useCharacter` + `useUpdateCharacter` heavily. **Quand tu remplaces `combat-mode.tsx`, vire l'import depuis `mode-placeholder.tsx` et remplace tout le body.** Le placeholder reste utile pour les 4 autres modes jusqu'à leur plan respectif.
- The event-logger.ts file is intentionally not present yet — gameplay actions in S1 update characters but don't log events (no campaign context). Logging is added retroactively in plan 22.
- `useUpdateCharacter` ne fait pas d'optimistic local — onSnapshot couvre. Si plan 07 trouve la latence visible en combat (tap dégâts), monter l'optimistic ciblé directement dans le bouton (pas dans le hook) pour ne pas généraliser une complexité sans données.
- `usePermissionContext()` est en place : les modes peuvent gray-out les boutons d'édition via `const { canEdit } = usePermissionContext()`. En S1 `canEdit === true` toujours quand on lit une fiche.
- **HP-driven aurora ne touche pas l'`<Aurora />` global** (monté dans App.tsx). Le filter/bordure s'appliquent au `<main>` du sheet. Si tu veux modifier l'Aurora elle-même selon HP en plan 07+, il faudra déplacer l'Aurora dans le sheet ou passer un signal global.
- **Sweep schéma legacy single-class** — résultat dans le commit suivant.
