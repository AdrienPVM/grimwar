# Plan 05 — Manual character form

## Goal

A fast, no-frills form to create a D&D 5e character: pick class, ancestry, background, assign abilities, name, level. Writes to Firestore. Navigates to `/character/:id`. The proper guided wizard lands in Sprint 2 (plan 17) — this is the **table-ready shortcut** so Adrien can play Lyralei at the next session.

## Context

Read:
- `docs/DATA-MODEL.md` (Character schema)
- `docs/I18N.md`
- `prototype/grimwar.html` (design vocabulary)
- Plan 04 output: `public/data/classes.json`, `ancestries.json`, `backgrounds.json`

## Prerequisites

Plans 01-04 complete. Content is in `public/data/`.

## Steps

### Route + screen scaffold
- [x] 1. Add route `/create` → `<ManualCharacterScreen />` in `src/routes.tsx`.
- [x] 2. Create `src/features/wizard/manual-character-screen.tsx`:
    - Full-page form, mobile-first
    - Aurora background, glass panel container
    - Sections separated by `<Divider />` with flourish
- [x] 3. Section: **Identité** — name (text input), level (1-20, dropdown), alignment (dropdown).
- [x] 4. Section: **Lignée** — ancestry dropdown (load from `useContent('ancestries')`), subancestry dropdown (filtered by ancestry).
- [x] 5. Section: **Classe** — class dropdown (load from `useContent('classes')`), subclass dropdown (only if level ≥ 3, filtered by class).
- [x] 6. Section: **Historique** — background dropdown (load from `useContent('backgrounds')`).

### Abilities
- [x] 7. Section: **Caractéristiques** — 6 number inputs (3-20), one per ability (FOR/DEX/CON/INT/SAG/CHA). Show modifier next to each value, updating live.
- [x] 8. Add a "Méthode" toggle above: `Standard Array` | `Point Buy` | `Manual`. 
    - Standard Array prefills `[15, 14, 13, 12, 10, 8]` distributable.
    - Point Buy enforces 27 points (cost table: 8→0, 9→1, 10→2, 11→3, 12→4, 13→5, 14→7, 15→9).
    - Manual = no validation.
- [x] 9. Apply ancestry/subancestry ability score increases automatically. Display the modified totals as the "Total après lignée" row.

### HP, AC, init
- [x] 10. Section: **Combat de base** — auto-compute max HP from class hit die + CON mod + level. Show editable max HP (defaults to computed, can override). Current HP defaults to max.
- [x] 11. Compute AC default: `10 + DEX mod` (no armor selected yet). Show editable.
- [x] 12. Initiative: `DEX mod`. Speed: from ancestry.

### Skills & saves
- [x] 13. Section: **Maîtrises** — checkboxes for save proficiencies (auto-checked based on class). Skill list with checkboxes for proficiency (class skills filtered, can pick N as per class).

### Spells (conditional)
- [x] 14. Section: **Sorts** — visible only if class is a spellcaster.
    - Show cantrips list (filter by class), let user pick N as per class.
    - Show level-1 spells list, let user pick N known/prepared.
    - Save selected spell IDs in `knownSpells` / `preparedSpells`.

### Inventory (starting)
- [x] 15. Section: **Équipement de départ** — render the class's starting equipment options (from `classes.json`). Player picks one option per choice group.
- [x] 16. Each picked item creates an inventory entry referencing the items DB (uses `addItemToInventory` from `inventory.ts` — strict, no free strings).
- [x] 17. Background starting equipment also added (background often grants a few items).
- [x] 18. Starting coins from background.

### Save & navigate
- [x] 19. Big "Créer le personnage" button at the bottom (sticky on mobile).
- [x] 20. On submit:
    - Validate via Zod schema (`CharacterSchema` from `src/shared/types/character.ts`)
    - Generate ID (slug from name + short random suffix)
    - Write to `users/{uid}/characters/{charId}` with `schemaVersion: 1, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), updatedBy: uid`
    - On success, navigate to `/character/${charId}`
    - On failure, show toast with the validation error
- [x] 21. Form draft persistence: store in-progress form state in Zustand (so closing the tab doesn't lose progress). Clear after successful submit.

### Tests
- [x] 22. Unit test for the ability point-buy calculator (`src/shared/lib/rules/__tests__/abilities.test.ts`, 7 tests).
- [x] 23. Unit test for HP auto-compute formula (`src/shared/lib/rules/__tests__/multiclass.test.ts`, 5 tests).
- [-] 24. **DEFERRED** : e2e Playwright reporté avec la suite e2e en S5 (plan 39 polish). Le manual form est verifié à la main par Adrien sur la prochaine session — UAT conditionnée à la DoD "Adrien crée Lyralei en < 2min".

### Final
- [x] 25. `pnpm typecheck && pnpm test && pnpm lint`
- [x] 26. Commit: `feat(wizard): manual character form (plan 05)`

## Definition of Done

- [x] 25/26 steps checked, step 24 explicitement reporté (e2e en S5 plan 39)
- [-] Form renders correctly on 375px mobile viewport — **À VÉRIFIER PAR ADRIEN** (UAT visuel)
- [-] Adrien can create Lyralei (his existing PJ) end-to-end in < 2 minutes — **À VÉRIFIER PAR ADRIEN** (UAT bout-en-bout)
- [-] Created character writes correctly to Firestore (verify shape in Console) — **À VÉRIFIER PAR ADRIEN** (UAT Firestore)
- [x] All inventory items reference real content IDs (no free strings) — `addItemToInventory` valide chaque entrée, fail-loud si itemId inconnu (cf. `submit-character.ts`)
- [x] `pnpm typecheck && pnpm test && pnpm lint` green (22 tests passent)

## Notes for next plan

- Plan 06 (sheet foundation) loads the character we just created. The sheet should handle gracefully if optional fields are missing (some fields skipped by manual form will be filled in later).
- Wizard creation (plan 17, S2) will reuse the same `CharacterSchema` and same `inventory.ts` strict-add helpers — just with a guided 7-step UX over the same submit.

### Décisions tactiques prises pendant l'exécution
- **Architecture** : un seul fichier `manual-character-screen.tsx` orchestre toutes les sections en sub-composants (~700 lignes). Évite la prolifération de fichiers pour un écran S1 monolithique. Plan 17 wizard pourra extraire les sections en sub-files si nécessaire.
- **react-router-dom** : remplace le hash router temporaire de plan 04 par `BrowserRouter`. Routes : `/`, `/create`, `/character/:id`, `/debug-content`, fallback `*` → `/`. La route `/character/:id` rend un placeholder stub (la fiche réelle arrive en plan 06).
- **Draft persistence** : `useWizardStore` Zustand avec middleware `persist` (clé `grimwar-wizard-draft` localStorage, version 1). Reset après submit réussi.
- **Spells** : on charge le bundle complet (330 sorts) et on filtre par `classes.includes(classId)`. Pour S1 manual c'est suffisant ; plan 17 wizard fera mieux (recherche, filtres niveau).
- **Skills** : la liste vient de `class.skillChoices.from` (texte FR brut, ex "Athlétisme"). Pour les ranger en clés stables côté Character.skills, on mappe via `SKILLS_FR_TO_KEY` au moment du submit (mais TODO : actuellement `submit-character.ts` enregistre la chaîne FR brute comme clé skill — à canonicaliser dans plan 06 sheet quand le rendu skill arrive).
- **Equipment cross-validation** : `submit-character.ts` itère `addItemToInventory` qui throw sur itemId inconnu — l'invariant items DB strict est vérifié au submit, pas au draft (le brouillon peut contenir des IDs spéculatifs).
- **Spellcasting check** : `characterClass.spellcasting !== null` — les non-casters skip la section sans warning.
- **Multi-class** : explicitement single-class (1 entrée dans `classes[]`). Plan 17 ajoutera l'UI multi-class.

### À surveiller pour plan 06+
- `SKILLS_FR_TO_KEY` est partiel — étendre quand de nouvelles compétences apparaissent dans des classes non-couvertes (Tromperie, Persuasion, etc.). Aujourd'hui les skills sont stockés en FR brut faute de canonicalisation au submit.
- L'overlay `#debug-content` est désormais une vraie route `/debug-content` (pas un hash).
- App Check : toujours reporté à plan 13 (cf. notes plan 03 et 04).

## Multi-class + status (locked decisions, baked from S1)

- Schema has `classes: [{ classId, subclassId, level }]` (array) — multi-class supported in data model from day one. **Manual form S1 only allows one class entry**; multi-class entry arrives in wizard plan 17.
- New character defaults: `status: 'alive'`, `classes: [{ classId, subclassId: null, level: 1 }]`, `totalLevel: 1`, `primaryClassId: <class>`, `hitDice: [{ classId, current: 1, max: 1, die }]`.
- `featAtLevel1` variant: **this plan does NOT honor it** (manual form is power-user). Wizard plan 17 reads the active campaign's `settings.variants.featAtLevel1` and adds the step.
