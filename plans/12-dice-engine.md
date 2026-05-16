# Plan 12 — Dice + roll engine

## Goal
Custom dice notation parser and roll engine. `useDice()` hook exposes `rollD20Plus`, `rollExpression`, `rollAttackDamage`, etc. Roll history persisted to Dexie. Toast feedback on every roll. Crit/fumble visual flash. Event logging hook added (no-op for S1, wired in S3 plan 22).

## Context
Read `prototype/grimwar.html` (dice tray + toast animation).

## Prerequisites
Plans 01-06. Used by 07/08/09/11.

## Steps

### Parser
- [ ] 1. `src/shared/lib/dice/parser.ts`:
    - Supports: `1d20`, `2d6+3`, `1d20+1d4-2`, `8d6` (fireball-style), `1d20kh1` (keep highest, advantage), `1d20kl1` (keep lowest, disadvantage), `2d20kh1` (advantage), `2d20kl1` (disadvantage).
    - Returns AST: `{ terms: DiceTerm[], modifier: number }` where each term has `{ count, sides, kh?, kl? }`.
- [ ] 2. Unit tests for the parser (20+ cases).

### Roller
- [ ] 3. `src/shared/lib/dice/roller.ts`:
    - `roll(ast, opts?)` → `{ rolls: number[], total: number, perTerm: TermResult[], crit: boolean, fumble: boolean }`.
    - Crit / fumble detection on single-d20 terms (nat 20 / nat 1).
    - Uses `crypto.getRandomValues` for randomness.
- [ ] 4. Unit tests for the roller (deterministic via seed for testing).

### Hook
- [ ] 5. `src/features/dice/use-dice.ts`:
    - `rollD20Plus(mod, opts)` — convenience for d20 + flat mod
    - `rollExpression(expr, opts)` — generic
    - `rollWithAdvantage(mod, opts)` / `rollWithDisadvantage(mod, opts)`
    - `rollAttackDamage(attackBonus, damageExpr, opts)` — sequential: attack then damage on hit (caller decides AC threshold)
    - `useRollHistory()` — returns recent 50 rolls from Dexie
- [ ] 6. Every roll auto-logs to Dexie `diceHistory` table (id, characterId, label, total, rolls, kind, timestamp, ...) — keep last 200, auto-prune.

### Event-logging hook (forward-compat)
- [ ] 7. Inside `useDice`, after a roll succeeds, call `await logRollIfCampaign(rollResult)` — a no-op function for S1 that becomes the real event-logger entry point in plan 22. Stub it out for now so the wiring is in place.

### Spell damage canonical mapping (remplace l'heuristique regex de plan 09)
- [ ] 7b. Pendant `scripts/build-public-content`, extraire pour chaque sort une liste structurée de dégâts depuis le SRD : `damage: Array<{ formula: string, type: DamageType, atHigherLevels?: { perLevel: string } }>`. Persister dans `public/data/spells.json` à côté de la description.
- [ ] 7c. Remplacer `extractDamageFormula` (regex sur description FR) dans `src/features/sheet/modes/magie/spell-detail-modal.tsx` par une lecture directe de `spell.damage[]`. Garder le toast actuel comme fallback si `damage` est absent (sorts utilitaires sans dégâts). Couvre les dés multiples, les dégâts par-niveau-supérieur, et les types de dégâts. Mettre à jour le test correspondant.

### Visual feedback
- [ ] 8. `<DiceToast />` component: top-center toast with:
    - Label of the roll
    - Per-die animated value pop
    - Total with the modifier
    - Crit: gold flash + special icon
    - Fumble: red flash
    - Auto-dismiss 3s, persists if hovered/tapped
- [ ] 9. Toast queue manager — stacks multiple rolls.

### Roll history panel (overlay)
- [ ] 10. `<RollHistoryPanel />` slide-up panel from bottom, shows the last 50 rolls with timestamps, character names. Filter by character. Tap a roll to repeat it.

### Tests
- [ ] 11. Unit: parser comprehensive coverage.
- [ ] 12. Unit: roller advantage/disadvantage correctness over 10000 sample size.
- [ ] 13. e2e: tap the radial "Lancer" wedge, see toast, see entry in history panel.

### Final
- [ ] 14. `pnpm typecheck && pnpm test && pnpm lint`
- [ ] 15. Commit: `feat(dice): notation parser + roller + history + toast (plan 12)`

## Definition of Done
- [ ] Parser handles all common notations + advantage/disadvantage syntax
- [ ] Rolls produce correct totals with proper modifier composition
- [ ] Toast shows on every roll, dismissible
- [ ] History persists across reloads (Dexie)
- [ ] Crit/fumble visual feedback works
- [ ] All sheet modes that use rolls now connect to this engine

## Notes for next plan
- The `logRollIfCampaign` stub becomes real in plan 22. Until then, rolls are local only.
- 3D dice (`@3d-dice/dice-box`) deferred to S5 polish — toast-only for now.
