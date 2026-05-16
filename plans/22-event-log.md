# Plan 22 — Event log infrastructure

## Goal
The single `event-logger.ts` is implemented; every gameplay action throughout the codebase logs an event into `campaigns/{id}/events`. Visibility model enforced. Stats counters denormalized. This is a refactor that touches many existing files.

## Context
Read `docs/EVENT-LOG.md` in full. Read `docs/PERMISSIONS.md` (event visibility).

## Prerequisites
Plans 14-16 (campaigns + permissions). Most gameplay code from S1 that currently doesn't log events.

## Steps

### Core logger
- [ ] 1. `src/shared/lib/event-logger.ts`:
    - One exported function per event kind (logRoll, logHpChange, logConditionAdd, …).
    - Each function constructs the Event doc, sets visibility default (per docs/EVENT-LOG.md table), writes via Firestore.
    - All functions require an active `campaignId` — if no active campaign, the logger is a no-op (returns silently).
    - All functions read `useActiveCampaign().campaignId` from the Zustand slice.

### Hook into existing actions
- [ ] 2. Update `src/features/dice/use-dice.ts` — replace the `logRollIfCampaign` stub with the real `logRoll`. **Le payload doit inclure** `mode: 'digital' | 'physical'`, `rawFaces: number[]`, `keptFaces: number[]`, `total`, `crit`, `fumble`, `advantage`, en plus du label/kind/characterId (cf. shape `RollResult` plan 12). Les jets physiques sont des événements de plein droit ; le compilateur de journal plan 25 distinguera mode physique/digital pour la prose.
- [ ] 3. Update `useUpdateCharacter` — after a successful patch, diff what changed and log appropriate events:
    - `hp.current` changed → `logHpChange`
    - `conditions` added/removed → `logConditionAdd` / `logConditionRemove`
    - `spellSlots[level].current` changed → `logSlotConsumed` / `logSlotRestored`
    - `level` changed → `logLevelUp`
    - `inventory.items` added/removed → `logItemAcquired` / `logItemRemoved`
- [ ] 4. Update `castSpell` flow (sheet/magie) — log `spell-cast` event with components.
- [ ] 5. Update level-up wizard (plan 18) — replace stub with `logLevelUp`.
- [ ] 6. Update encounter actions (placeholder until plan 24).

### Denormalized stats counters
- [ ] 7. After successful event write, update per-character lifetime stats:
    - `roll` event → `stats.totalRolls++, totalD20Sum += d20Value, crits++ if crit, fumbles++ if fumble`
    - Skill rolls → `stats.skillUses[skillId]++`
- [ ] 8. After successful event write, update per-campaign membership stats:
    - `roll` → `rollsInCampaign++, critsInCampaign++ if crit`
    - `death` → `deathsInCampaign++`
    - `session-end` (if attended) → `sessionsAttended++`
- [ ] 9. Use Firestore `increment(1)` for atomicity.

### Visibility filtering (client-side, complementing rules)
- [ ] 10. In any event reader (e.g. journal feed, dashboard events panel), filter by visibility using `canViewEvent` from `permissions.ts`.

### Tests
- [ ] 11. Unit tests for event-logger functions (mock Firestore).
- [ ] 12. e2e: in a campaign, roll a d20, see event in DM dashboard's feed within 2s.

### Final
- [ ] 13. `pnpm typecheck && pnpm test && pnpm lint`
- [ ] 14. Commit: `feat(events): event-logger + auto-log all gameplay actions (plan 22)`

## Definition of Done
- [ ] All gameplay actions log events
- [ ] No active campaign → no events logged (silent no-op)
- [ ] Visibility model enforced
- [ ] Denormalized stats counters increment correctly
- [ ] Cross-account verified: player sees own private rolls, DM sees all (including 'dm' visibility)

## Notes for next plan
- Plan 25 (journal compiler) reads events and turns them into prose. Les events `roll`/`attack`/`damage` portent `mode` + `rawFaces` — le compilateur peut ajouter une note de couleur pour les tables physiques (« lancé sur les vrais dés de Lyralei »).
- Plan 24 (encounters) consomme les events `damage` mode physique pour le hand-off MJ → cible.
