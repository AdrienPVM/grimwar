# Plan 18 — Wizard de level-up

## Goal
Guided level-up wizard at `/character/:id/level-up`. Handles HP roll (or fixed average), subclass choice (if at the right level), ASI/feat choice (4/8/12/16/19), new class features auto-granted, prepared spells update, new spells known if applicable. Writes the change atomically, logs a `level-up` event.

## Context
Read plan 17 (shared wizard infra), `docs/DATA-MODEL.md`.

## Prerequisites
Plan 17 complete.

## Steps

- [ ] 1. Route `/character/:id/level-up` → `<LevelUpWizard />`.
- [ ] 2. Pre-conditions: character must have `experience >= xpForNextLevel` (5e variant: free milestone). For v1, allow level-up always (DM-controlled).
- [ ] 2b. **Multi-class step (FIRST)**: pick WHICH class to level up. Show all existing classes from `character.classes[]` + "Multi-class : ajouter une nouvelle classe" option. If new class chosen, validate 5e multi-class prerequisites (ability score min). Updates the relevant entry in `character.classes[]` (or appends a new one). `totalLevel++`.
- [ ] 3. Step: **PV** — choose roll vs fixed average. Fixed = `(hitDie / 2 + 1) + CON mod` (rounded up). Roll = animated d-roll, then `+ CON mod`. Negative results clamped to +1. Hit die from the class being leveled.
- [ ] 4. Step (conditional): **Sous-classe** — appears only at the class's subclass-choice level (e.g. Fighter level 3). List subclasses for the class with descriptions. Pick one. Updates `classes[].subclassId`.
- [ ] 5. Step (conditional): **Augmentation de caractéristiques ou Don** — appears at levels 4/8/12/16/19. Two tabs: +2 to one stat (or +1/+1), OR pick a feat.
- [ ] 6. Step: **Aptitudes de classe** — show the new features granted at this level (read-only, just info). Auto-applied (additional class resources, etc.).
- [ ] 7. Step (conditional): **Sorts** — show new spell slots gained, allow adjustments to prepared spells, allow learning new spells (for known-spells classes).
- [ ] 8. Step: **Récap** — show before/after diff. "Confirmer" button.
- [ ] 9. On confirm:
    - Atomic Firestore write with `level: level + 1, hp: { ... new max ... }, spellSlots: ..., featureUsage: ..., classResources: ...`
    - Log `level-up` event via event-logger (once event log is live — plan 22; for now, stub).
    - Navigate back to `/character/:id`.

### Tests
- [ ] 10. Unit: HP gain formula (fixed average rounding).
- [ ] 11. Unit: per-level feature unlock list per class.
- [ ] 12. e2e: level a character from 1 → 2 (Fighter), verify HP increase + Second Wind feature gained.
- [ ] 13. `pnpm typecheck && pnpm test && pnpm lint`
- [ ] 14. Commit: `feat(wizard): level-up wizard (plan 18)`

## Definition of Done
- [ ] All level-up choice paths work
- [ ] Atomic write; no half-updated character on failure
- [ ] Mobile-first
- [ ] Event placeholder logged

## Notes for next plan
- Multi-class is fully supported. The wizard handles "level up an existing class" vs "add a new class" cases. Spell slots, HP, proficiencies all derived in `lib/rules/multiclass.ts`.
