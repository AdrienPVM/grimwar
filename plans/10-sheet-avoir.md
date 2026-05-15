# Plan 10 — Sheet Avoir mode

## Goal
Avoir mode shows the inventory (STRICT items DB references — no free strings), categorized, with weight bar, coin section, and add/remove flows that go through the items database.

## Context
Read `docs/DATA-MODEL.md` (inventory shape — STRICT REFERENCE), `CLAUDE.md` (forbidden patterns — no free-string items).

## Prerequisites
Plans 01-06, plus `src/shared/lib/inventory.ts` from plan 04.

## Steps

### Coin section
- [ ] 1. `src/features/sheet/modes/avoir/coins-section.tsx`: 5 chips (cuivre/argent/électrum/or/platine). Tap to edit. Total wealth in gp shown as conversion.

### Weight bar
- [ ] 2. `weight-bar.tsx`: visual fill based on `weightCache / carryingCapacity`. Carrying capacity = `STR × 7.5kg` (5e SRD).
- [ ] 3. Encumbrance thresholds (5e variant): `> capacity` = encumbered, etc. (Adjust based on variant in `settings`.)

### Inventory list
- [ ] 4. `inventory-list.tsx`: items grouped by category (Weapons / Armor / Tools / Gear / Consumables / Magic items / Misc).
- [ ] 5. Each row: item name (i18n via `localize`), qty, equipped chip, attuned chip.
- [ ] 6. Tap → opens `<ItemDetailModal />` with full description, weight, properties, and actions: equip/unequip, attune/unattune, edit qty, edit notes, remove.

### Add item flow
- [ ] 7. FAB-or-button "Ajouter un objet" → opens `<AddItemModal />`:
    - Search input
    - Filtered list across public + user + (campaign, S2) custom content
    - Tap item → shows qty input + confirm
    - Uses `addItemToInventory(character, contentId, scope, qty)` — STRICT: throws if not in DB
- [ ] 8. "Créer un objet maison" sub-action → creates a new entry in `users/{uid}/customContent/items/{newId}` (user-scoped homebrew), then adds it to inventory. Item form: name (i18n), category, weight, cost, description, optional damage/AC fields.

### Equip & attune
- [ ] 9. Tap "Équiper" toggles `equipped`. Equipping an armor recalculates AC automatically.
- [ ] 10. Tap "S'attuner" — limited to 3 attuned items (5e rule). Show error toast if at limit.

### Recompute derived fields
- [ ] 11. `useInventoryDerived(character)` hook:
    - Computes `weightCache` from sum of (item.weight × qty).
    - Recomputes AC if equipped armor changed.
    - Returns `{ weightTotal, acFromArmor, encumbranceLevel }`.

### Tests
- [ ] 12. Unit: `addItemToInventory` throws on bad contentId.
- [ ] 13. Unit: weight + AC recomputation.
- [ ] 14. e2e: add a longsword from public content, verify in inventory list; remove it; verify removed.

### Final
- [ ] 15. `pnpm typecheck && pnpm test && pnpm lint`
- [ ] 16. Commit: `feat(sheet): avoir mode + inventory strict (plan 10)`

## Definition of Done
- [ ] Inventory lists, categorizes, tap to detail works
- [ ] Add item from items DB works; **adding free strings is impossible** (no UI path exists)
- [ ] Custom item creation (user homebrew) works
- [ ] Equip/attune toggles + AC recomputation work
- [ ] Weight bar reflects load

## Notes for next plan
- Plan 11 (Radial FAB) places the inventory ADD action in a wedge.
- For campaign-scoped homebrew items (DM creates a magic item for the campaign), that's plan 19 (bibliothèque, S2).
