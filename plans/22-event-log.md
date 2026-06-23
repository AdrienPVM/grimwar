# Plan 22 — Event log infrastructure

## Goal
The single `event-logger.ts` is implemented; every gameplay action throughout the codebase logs an event into `campaigns/{id}/events`. Visibility model enforced. Stats counters denormalized. This is a refactor that touches many existing files.

## Context
Read `docs/EVENT-LOG.md` in full. Read `docs/PERMISSIONS.md` (event visibility).

## Prerequisites
Plans 14-16 (campaigns + permissions). Most gameplay code from S1 that currently doesn't log events.

## Sous-jalons (split acté 2026-06-23)

Plan 22 est « a refactor that touches many existing files » — découpé en commits isolables (même discipline que le split 12/12.5), chacun gated par ses propres tests :

- **22.1 — foundation + auto-log des jets (LIVRÉ).** Type `Event` (`src/shared/types/event.ts`), slice `useActiveCampaignStore`, `event-logger.ts` réel (`logRoll` + `logRollIfCampaign`), `permissions.ts` (`canViewEvent`), câblage `SheetScreen` → campagne active depuis `character.homeCampaignId`, tests unit + rules (events) + e2e (jet sur fiche liée → event écrit). Le pivot de dés journalise désormais en vrai.
- **22.2 — diff de fiche + sort (À FAIRE).** Step 3 (`useUpdateCharacter` diff → hp/conditions/slots/items) + step 4 (`spell-cast`) + steps 7/9 (compteurs `stats` lifetime du personnage). Aucune nouvelle dépendance.
- **Bloqué / différé.** Step 5 (level-up) attend plan 18 ; step 6 (encounters) attend plan 24 ; step 8 (compteurs `members.stats` par-campagne) exige d'élargir la rule d'update `members/` au champ `stats` — à porter quand un consommateur l'exige ; step 10 (filtrage lecteur) attend un lecteur UI (dashboard MJ, plan 21).

**Décision d'archi (22.1, documentée dans docs/EVENT-LOG.md) :** la « campagne active » dérive de `character.homeCampaignId` (pointeur posé par le lien fiche↔membre, JALON 4A), pas d'un mode « session » dédié. `sessionId` reste `null` jusqu'au plan 23. Réversible, sans changement de schéma ni de rule.

**Gap connu (porté au plan 21) :** la rule de READ `events` exige `isMemberOf`, or un MJ n'a pas de doc `members/` → un MJ ne peut pas encore lire le flux. Le lecteur MJ (plan 21) devra élargir la rule à `isMemberOf || isDMOf`.

## Steps

### Core logger
- [~] 1. `src/shared/lib/event-logger.ts` (22.1 : `logRoll` + `logRollIfCampaign` livrés ; les autres `log*` en 22.2) :
    - One exported function per event kind (logRoll, logHpChange, logConditionAdd, …).
    - Each function constructs the Event doc, sets visibility default (per docs/EVENT-LOG.md table), writes via Firestore.
    - All functions require an active `campaignId` — if no active campaign, the logger is a no-op (returns silently).
    - All functions read `useActiveCampaign().campaignId` from the Zustand slice.

### Hook into existing actions
- [x] 2. Update `src/features/dice/use-dice.ts` — replace the `logRollIfCampaign` stub with the real `logRoll`. (22.1 : import redirigé du stub vers `event-logger.ts` sur les 4 call sites ; payload `mode/rawFaces/keptFaces/total/crit/fumble/advantage` + label/rollKind/characterId.) **Le payload doit inclure** `mode: 'digital' | 'physical'`, `rawFaces: number[]`, `keptFaces: number[]`, `total`, `crit`, `fumble`, `advantage`, en plus du label/kind/characterId (cf. shape `RollResult` plan 12). Les jets physiques sont des événements de plein droit ; le compilateur de journal plan 25 distinguera mode physique/digital pour la prose.
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
- [x] 11. Unit tests for event-logger functions (mock Firestore). (22.1 : `event-logger.test.ts` 9 cas + `active-campaign-slice.test.ts` + `permissions.test.ts` + 13 cas rules `events` dans `firestore-rules.test.ts`.)
- [~] 12. e2e: in a campaign, roll a d20, see event. (22.1 : `campaigns-event-log.spec.ts` — jet sur fiche liée → event `roll` relu en Admin SDK dans `campaigns/{cid}/events`. Le « voir dans le dashboard MJ » attend le lecteur du plan 21.)

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
