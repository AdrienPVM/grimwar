# Plan 17 — Wizard de création (7 étapes guidées)

## Goal
A guided 7-step wizard replaces the manual character form: Lignée → Classe → Caractéristiques → Historique → Compétences → Équipement → Sorts/Récap. Mobile-first, swipeable between steps, validation per step. Same `Character` shape, same `addItemToInventory` strict path.

## Context
Read plan 05 (manual form, same data layer), `docs/DATA-MODEL.md`.

## Prerequisites
Plans 01-16 complete.

## Steps

### Wizard shell
- [ ] 1. Move `/create` from `<ManualCharacterScreen />` to `<WizardScreen />`. Keep manual form accessible at `/create/manual` (fallback).
- [ ] 2. `<WizardScreen />` layout: step indicator (1-7 dots/labels at top), step content (full screen), bottom nav (Back/Next/Skip).
- [ ] 3. Wizard state: Zustand slice `wizard-slice.ts` with `currentStep`, `draft: Partial<Character>`. Persisted to Dexie so leaving the tab doesn't lose progress.

### Step 1 — Lignée
- [ ] 4. List of ancestries (cards with art, name, traits preview). Tap to select.
- [ ] 5. Subancestry sub-step if applicable (e.g. Elf → High/Wood/Drow).
- [ ] 6. Apply ability score increases + speed + size to draft.

### Step 2 — Classe
- [ ] 7. List of classes. Tap to select.
- [ ] 8. Subclass only shown at level 3+ (for level 1 character creation, skip).
- [ ] 9. Apply hit die, starting proficiencies, starting saves, spellcasting setup.

### Step 2b — Multi-class (optional, conditional on context)
- [ ] 9a. If creating a NEW character at level 1: only one class step, skip multi-class entry.
- [ ] 9b. **If creating a character at level > 1 (rare for fresh creation but supported)**: after first class, show "Ajouter une autre classe ?" toggle. If yes, enter another class entry with its own level (constrained: total class levels = character total level).
- [ ] 9c. Multi-class prerequisites enforced per 5e SRD (e.g. min 13 STR for Fighter multi-class, etc.). Show explanation if fails.
- [ ] 9d. Multi-class spell slots displayed in real-time using `lib/rules/multiclass.ts` casterLevel formula.

### Step 3a — Don au niveau 1 (variant, conditional)
- [ ] 9e. If `activeCampaign.settings.variants.featAtLevel1 === true`: insert a feat-pick step here. Show list of all feats (filtered by prerequisites). Player picks 1. Added to `extraProficiencies` / `featureUsage` as appropriate.
- [ ] 9f. If variant is OFF (default), skip this step entirely.

### Step 3 — Caractéristiques
- [ ] 10. Method toggle: Standard Array / Point Buy / Manual (3-18).
- [ ] 11. Distribute UI: 6 ability bars, drag values or tap to increase.
- [ ] 12. Live display of modifiers and ancestry-adjusted totals.
- [ ] 13. Recommended distribution per class (highlight optimal ability with a star).

### Step 4 — Historique
- [ ] 14. List of backgrounds (cards). Tap to select.
- [ ] 15. Background grants: skills, languages, equipment, feature (5e 2024: backgrounds grant a feat too).
- [ ] 16. Edit personality traits (trait/ideal/bond/flaw) — pick from background's suggestions or write custom.

### Step 5 — Compétences
- [ ] 17. Show all skills, pre-checked if from class/background.
- [ ] 18. Class allows picking N additional from a filtered list. Enforce N.

### Step 6 — Équipement
- [ ] 19. Show class equipment options (e.g. Fighter: "a) Chain mail OR b) Leather + longbow + 20 arrows"). Player picks.
- [ ] 20. Show background equipment grants (no choice usually).
- [ ] 21. Each picked item added via `addItemToInventory` (strict, public scope).
- [ ] 22. Starting coins from background or class (5e variant).

### Step 7 — Sorts + Récap
- [ ] 23. If spellcaster: pick cantrips known, pick prepared/known spells per class rules.
- [ ] 24. Récap card: full preview of the character. "Modifier" links jump back to a step.
- [ ] 25. "Créer le personnage" button → writes to Firestore, navigates to `/character/:id`.

### Validation
- [ ] 26. Each step has a validator. "Suivant" disabled until valid (with helpful inline error messages).
- [ ] 27. Schema validation at final submit (Zod) — same `CharacterSchema` as plan 05.

### Tests
- [ ] 28. Unit tests per step's validation logic.
- [ ] 29. e2e: full wizard end-to-end for a Fighter and a Wizard (different paths).

### Final
- [ ] 30. `pnpm typecheck && pnpm test && pnpm lint`
- [ ] 31. Commit: `feat(wizard): 7-step guided creation (plan 17)`

## Definition of Done
- [ ] All 7 steps work
- [ ] Validation prevents invalid characters
- [ ] Wizard draft persists across reloads (Dexie)
- [ ] Created character is identical in shape to manual-form output
- [ ] Mobile-first responsive

## Notes for next plan
- Plan 18 (level-up wizard) shares much of this infrastructure. Refactor common bits to `src/features/wizard/shared/`.
