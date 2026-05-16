# Plan 11 — Radial FAB menu

## Goal
The signature press-hold-drag radial menu: hold the FAB, drag toward a wedge to commit, release to fire. 5 main wedges (Aller à, Sorts, Outils, Lancer, Repos). Some wedges open sub-menus with dynamic-angle layouts.

## Context
Read `prototype/grimwar.html` (the radial FAB animation in detail). The gesture is the soul of the app — get it right.

## Prerequisites
Plans 01-10 **et plan 12** (swap d'ordre acté dans `plans/00-overview.md`). Plans 07, 09, 10 utilisent les actions de ce menu. **Tous les wedges qui déclenchent un jet (Lancer, Sorts, …) DOIVENT router via `useDice()` / `rollWithFlags` du plan 12 — jamais `dice.ts` en direct** — pour hériter du mode physique transparent.

## Steps

### Gesture mechanics
- [ ] 1. `src/features/radial-menu/use-pointer-gesture.ts`:
    - On `pointerdown` on FAB: capture pointer, start gesture
    - Track angle from FAB center to pointer (`Math.atan2(dy, dx)`)
    - Track distance
    - 30px dead zone — below distance threshold, no wedge is highlighted
    - 60° angular tolerance per wedge (for 5 wedges spanning 90° each in the upper hemisphere, with 60° detection window each → easy targeting)
    - On `pointerup`: if pointer is over a wedge (distance > dead zone AND within angular tolerance), fire that wedge's action
    - On `pointercancel` or `pointerleave` document: abort
- [ ] 2. **Document-level listeners** (not on FAB) for `pointermove`/`pointerup` so user can drag anywhere on screen.

### Visual
- [ ] 3. `radial-fab.tsx`: floating button bottom-center, gold gradient, idle icon = ⚜ or similar.
- [ ] 4. On press-hold > 100ms, expand wedges: 5 arc segments in upper hemisphere, each ~60° wide, with icon + label.
- [ ] 5. Active wedge highlighted (scale + glow).
- [ ] 6. Quarter-arc layout: wedges arranged from angle 180° (left) to 0° (right), spaced evenly above the FAB.

### 5 main wedges
- [ ] 7. **Aller à** (icon: compass) — opens sub-menu: Combat, Essence, Magie, Avoir, Âme (switch sheet mode). Sub-menu uses dynamic-angle layout: 5 wedges arranged.
- [ ] 8. **Sorts** (icon: sparkle) — opens sub-menu showing favorite/recent spells (top 5). Tap-drag on one fires `castSpell(spellId)`.
- [ ] 9. **Outils** (icon: hammer) — sub-menu: Long Rest, Short Rest, Lancer d20 custom, Toggle Inspiration.
- [ ] 10. **Lancer** (icon: die) — fires immediate `useDice().rollD20Plus(0, { label: 'd20 vif' })`. No sub-menu, just rolls. **Mode-aware via le pivot plan 12** : en mode physique, le `<PhysicalRollModal />` s'ouvre automatiquement.
- [ ] 11. **Repos** (icon: moon) — opens sub-menu: Repos court, Repos long, Annuler. Applies the rest effects (HP, slot restoration per class rules).

### Sub-menus
- [ ] 12. Sub-menu replaces main wedges with smaller wedges around the FAB. Same gesture, same tolerance.
- [ ] 13. Dynamic angle: number of options drives the arc layout (N items → 60° / N angular spacing inside a 60° arc above the FAB; or full half-disk if many).
- [ ] 14. Long-press a main wedge to commit to its sub-menu without releasing.

### Tap vs drag
- [ ] 15. Quick tap (< 150ms, no movement) on FAB → opens a docked menu (touchable, no gesture). This is the accessibility fallback.

### Haptic + sound
- [ ] 16. On wedge highlight change: short `navigator.vibrate(10)` if supported.
- [ ] 17. On fire: medium vibrate + soft sound (use Web Audio API, prefer settings-controlled).

### Accessibility
- [ ] 18. Keyboard support: ArrowKeys to navigate wedges, Enter to fire. Tab opens the docked variant.
- [ ] 19. `aria-label`s on each wedge.

### Tests
- [ ] 20. Unit: angle-to-wedge mapping function.
- [ ] 21. e2e (Playwright): tap FAB, see docked menu, fire an action.

### Final
- [ ] 22. `pnpm typecheck && pnpm test && pnpm lint`
- [ ] 23. Commit: `feat(radial-fab): press-hold-drag menu with 5 wedges + sub-menus (plan 11)`

## Definition of Done
- [ ] FAB visible on sheet screen
- [ ] Press-hold opens wedges; drag highlights; release fires
- [ ] All 5 main wedges work, 3+ sub-menus work
- [ ] Tap-only fallback works
- [ ] Vibration on supported devices

## Notes for next plan
- The radial FAB will get more entries in S2-S3 (Sessions, DM-specific actions if user is DM). Keep the wedge config data-driven, not hard-coded.
- **Dice mode** : tous les wedges qui produisent un jet routent via `useDice()` / `rollWithFlags` du plan 12. Aucun wedge ne doit appeler `dice.ts` ou `rollD20`/`rollDamage` directement — sinon le mode physique est court-circuité. Un test unitaire ou e2e devrait verrouiller ce contrat.
