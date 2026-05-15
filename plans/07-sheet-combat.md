# Plan 07 — Sheet Combat mode

## Goal
The Combat mode of the sheet: battle HUD with HP mega-card, initiative strip, conditions row, spell slot counts (compact), attacks list, party row (preparatory for S2 multi-player view), death saves modal. Adrien can manage Lyralei in a real fight from this screen.

## Context
Read `prototype/grimwar.html` (Combat section), `docs/DATA-MODEL.md` (character HP/conditions/attacks fields).

## Prerequisites
Plans 01-06 complete.

## Steps

### HP mega-card
- [ ] 1. `src/features/sheet/modes/combat/hp-mega-card.tsx`:
    - Current / max HP big numerals, Cinzel Decorative
    - Temp HP smaller, above
    - "−" / "+" buttons for ±1
    - Long-press on "−" / "+" opens a number pad for arbitrary damage/heal amounts
    - Heal/damage applied via `updateCharacter({ hp: { ...hp, current: newCurrent } })`
    - Visual: HP fill bar behind, colored by health %
- [ ] 2. When HP reaches 0, auto-open `<DeathSavesModal />`.

### Conditions row
- [ ] 3. `conditions-row.tsx`: horizontal chips of current conditions (load condition names from public content). Tap to remove. "+" chip opens a picker with all conditions, search.

### Init + initiative
- [ ] 4. `init-chip.tsx`: shows init modifier with a `🎲` button to roll initiative (uses `useDice().rollD20Plus(initMod)`). Result toast.
- [ ] 5. Death saves are not init-related but live below in the same section.

### Spell slots compact
- [ ] 6. `slots-compact.tsx`: row of slot-level chips, each showing `n/max` filled dots/runes. Tap to consume one slot. Long-press to restore.

### Attacks list
- [ ] 7. `attacks-list.tsx`: derives the character's available attacks from equipped weapons + class features.
- [ ] 8. Each attack row: name, attack bonus, damage. Tap → rolls attack + damage in sequence, shows toast with both.
- [ ] 9. Long-press → shows a context menu: roll with advantage, disadvantage, crit (auto-double dice).

### Party view (preparatory)
- [ ] 10. `party-strip.tsx`: shows other PCs in the active campaign (S2-aware but no-op for S1). For S1, render an empty placeholder if no campaign joined yet.

### Death saves modal
- [ ] 11. `death-saves-modal.tsx`: visible when `hp.current === 0`. Three success slots, three fail slots. "Lancer une sauvegarde" button rolls a d20; ≥10 success, <10 fail, nat 1 = 2 fails, nat 20 = revives with 1 HP.
- [ ] 12. On 3 successes: stabilize (toast). On 3 fails: set `status: 'dead'`, log `death` event, modal stays + grim aurora, **sheet enters read-only mode** (all controls disabled).

### Revive (DM-only)
- [ ] 12b. When `status === 'dead'` AND viewer is DM (`canEditCharacter` with isDMEdit), show a "Ressusciter" button in the death modal. On confirm: sets `status: 'alive'`, `hp.current = 1`, resets `deathSaves`, logs `revival` event (visibility: 'all'). Toast: "{name} revient à la vie !".

### Updaters
- [ ] 13. All gameplay actions use `updateCharacter`. Wrap in `try/catch` for offline cases (Firestore will queue).

### Tests
- [ ] 14. Unit: HP clamp logic (no negative, no exceed max).
- [ ] 15. Unit: death save state machine.
- [ ] 16. e2e: open combat mode, take damage to 0, modal opens, roll 3 successes → stabilize.

### Final
- [ ] 17. `pnpm typecheck && pnpm test && pnpm lint`
- [ ] 18. Commit: `feat(sheet): combat mode + HP mega-card + death saves (plan 07)`

## Definition of Done
- [ ] HP modifiable, persists, visualization matches prototype
- [ ] Conditions add/remove works
- [ ] Spell slots consume/restore
- [ ] Attack rolls work end-to-end
- [ ] Death save modal works

## Notes for next plan
- Plan 12 (dice engine) provides the `useDice` hook used here. If plan 12 isn't done yet, stub the dice with a simple `Math.floor(Math.random() * 20) + 1` and replace later.
- For real-time updates with other party members, defer to S2 plan 16 (memberships sync).
