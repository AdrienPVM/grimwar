# Plan 09 — Sheet Magie mode

## Goal
Magie mode shows the magic circle (slot levels as concentric runes), spellcasting stats, prepared/known spells list with categorization, and a spell detail modal on tap that includes "Cast" button.

## Context
Read `prototype/grimwar.html` (Magie section — magic circle), `docs/DATA-MODEL.md` (spell slots, prepared/known spells).

## Prerequisites
Plans 01-06.

## Steps

### Magic circle
- [ ] 1. `src/features/sheet/modes/magie/magic-circle.tsx`: SVG concentric circles, one ring per spell-slot level (cantrips innermost = level 0 if applicable, then 1-9 outward).
- [ ] 2. Each ring shows runes (dots) for slot count; filled = available, empty = consumed.
- [ ] 3. Tap a ring → opens "Consume slot" prompt with confirm (also consumable inline from a cast).
- [ ] 4. Long-press → restore one slot (for ad-hoc).

### Spellcasting stats panel
- [ ] 5. Compact bar per class that has spellcasting: spellcasting ability (INT/SAG/CHA), spell save DC, spell attack bonus, prepared spell capacity (`level + ability mod` for prepared casters).
- [ ] 5b. **Multi-class**: spell slots are UNIFIED (one slot table for all classes). The class panel shows per-class prep/known lists. Slot table calculated from `casterLevel` (sum of full × 1, half × 0.5 floor, third × 0.33 floor) via `lib/rules/multiclass.ts`. **Cantrips and prepared spells remain per-class** — slots are shared.

### Spell list
- [ ] 6. `spell-list.tsx`: spells grouped by level. Sections collapsible.
- [ ] 7. Each spell row: name (i18n), school chip, components (V/S/M chips), concentration badge if any, ritual badge.
- [ ] 8. Search input at top filtering by name (locale-aware), school, concentration.
- [ ] 9. Visual distinction: prepared (full intensity) vs known but not prepared (dimmed). Cantrips always "prepared" feel.

### Cast flow
- [ ] 10. Tap a spell → opens `<SpellDetailModal />`:
    - Full spell text (i18n description)
    - Casting time, range, components, duration
    - "À niveau supérieur" section if applicable
    - "Lancer le sort" button → opens slot-level picker (if not cantrip), consumes the chosen slot, fires `useDice` if the spell has a damage roll
- [ ] 11. If concentration spell: setting `currentConcentration` on character (breaks any existing concentration via toast).

### Update logic
- [ ] 12. Slot consumption: `updateCharacter({ spellSlots: { ...slots, [level]: { current: current - 1, max } } })`.
- [ ] 13. Concentration: stored as `character.currentConcentration: { spellId, slotLevel } | null`.

### Tests
- [ ] 14. Unit: slot consumption clamps to 0.
- [ ] 15. e2e: open a spellcaster, cast a level-1 spell, slot count decreases by 1.

### Final
- [ ] 16. `pnpm typecheck && pnpm test && pnpm lint`
- [ ] 17. Commit: `feat(sheet): magie mode + magic circle (plan 09)`

## Definition of Done
- [ ] Magic circle renders, slot counts correct
- [ ] Spell list paginates, searchable, locale-aware
- [ ] Cast flow consumes slot and rolls damage if applicable
- [ ] Concentration tracked

## Notes for next plan
- Spell selection during level-up will be handled in plan 18 (wizard level-up) — same data layer.
- The bibliothèque (plan 19) is a richer browser for all spells regardless of preparation status.
