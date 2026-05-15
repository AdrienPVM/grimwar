# Plan 08 — Sheet Essence mode

## Goal
Essence mode displays the character's abilities (hexagram of 6 stats), saves row, and skills (searchable list). Tap any → rolls the appropriate d20 + modifier.

## Context
Read `prototype/grimwar.html` (Essence section — hexagram layout), `docs/DATA-MODEL.md` (abilities, saves, skills shape).

## Prerequisites
Plans 01-06. Plan 12 (dice engine) ideally done first, but can stub roll function.

## Steps

### Hexagram
- [ ] 1. `src/features/sheet/modes/essence/hexagram.tsx`: SVG hexagonal layout with 6 ability "petals" — FOR/DEX/CON/INT/SAG/CHA arranged.
- [ ] 2. Each petal shows: ability name (small caps), score (large), modifier (medium, "+3" etc.).
- [ ] 3. Tap a petal → `useDice().rollD20Plus(mod, { label: 'Test de Force' })`.
- [ ] 4. Long-press → shows context menu: roll, roll with advantage, roll with disadvantage.

### Saves row
- [ ] 5. `saves-row.tsx`: 6 chips (one per ability). Proficient saves visually highlighted (gold dot or border).
- [ ] 6. Tap → rolls save (d20 + ability mod + prof bonus if proficient).
- [ ] 7. Save proficiency bonus: `getProficiencyBonus(level)` helper in `src/shared/lib/rules/proficiency.ts`.

### Skills list
- [ ] 8. `skills-list.tsx`: vertical list of all 18 skills. Search input at top.
- [ ] 9. Each row: skill name, ability key chip, modifier (computed: ability mod + prof bonus × proficiencyLevel).
- [ ] 10. Visual indicator for proficiency level: empty (0), filled circle (1 = proficient), filled diamond (2 = expertise).
- [ ] 11. Tap → rolls d20 + modifier with skill label.

### Inspiration toggle
- [ ] 12. Small "Inspiration" toggle in the essence header — when on, the next d20 roll uses advantage automatically (consume on roll).

### Exhaustion display
- [ ] 13. If `exhaustion > 0`, show an exhaustion banner at the top with explanation (5e 2024 rules: each level = −2 to d20 rolls). Apply to all rolls automatically.

### Tests
- [ ] 14. Unit: ability modifier formula `Math.floor((score - 10) / 2)`.
- [ ] 15. Unit: skill modifier composition.
- [ ] 16. e2e: tap a skill, see roll result toast.

### Final
- [ ] 17. `pnpm typecheck && pnpm test && pnpm lint`
- [ ] 18. Commit: `feat(sheet): essence mode (plan 08)`

## Definition of Done
- [ ] Hexagram renders, all 6 abilities show correct modifiers
- [ ] Skill list filterable, all rolls work
- [ ] Inspiration toggle consumes on next roll
- [ ] Exhaustion penalty applied

## Notes for next plan
- Plan 11 (radial FAB) will also need ability rolls — reuse the `useDice` calls.
