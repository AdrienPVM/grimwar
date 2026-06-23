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
- **22.2 — diff de fiche + sort + stats lifetime (LIVRÉ).** Module pur `character-diff.ts` (`diffCharacterEvents`) ; `useUpdateCharacter(character)` reçoit la fiche complète et journalise le diff (hp-change / temp-hp / condition-add/remove / slot-consumed/restored / item-acquired/removed) après un patch réussi, sauf override `{ log: 'manual' }`. `logSpellCast` câblé dans `handleCast` (le cast passe `log: 'manual'` pour éviter un `slot-consumed` redondant). Compteurs lifetime `stats.{totalRolls,totalD20Sum,crits,fumbles,skillUses}` incrémentés via `increment(1)` dans `logRoll` (steps 7/9) ; `skillId` threadé du pivot d20 (`skills-list` → `rollWithFlags` → `RollResult.skillId`). Le wizard de montée de niveau passe `{ log: 'manual' }` (level-up différé plan 18). Aucune nouvelle dépendance. **Découverte** : fragilité de la campagne active sous migration v1→v2 — cf. `plans/DEBT.md > D27`.
- **22.3 — lecteur du flux (feed d'activité MJ) (LIVRÉ).** Premier consommateur du journal. Rule de read `events` élargie de `isMemberOf` à `isMemberOf || isDMOf` (un MJ pur n'a pas de doc `members/` — gap 22.1 fermé). Hook temps-réel `useCampaignEvents` (`onSnapshot` + query contrainte `where visibility in ['all','dm']` côté MJ — la rule filtrant par doc, une query non contrainte serait rejetée) ; renderer léger `event-line.ts` (libellé i18n + détail payload, PAS le compilateur plan 25) ; composant `CampaignEventFeed` monté MJ-only dans `campaign-detail-screen`, filtré par `canViewEvent` (step 10). Index composite `(visibility, createdAt DESC)`. Tests : rules-unit (+6 : MJ lit `all`/`dm` ✓, `self` d'autrui ✗, query contrainte ✓, query non contrainte ✗), unit (event-line 19, hook 7, feed 6, screen +2), e2e `campaigns-dm-event-feed.spec.ts` (feed live). **⚠️ deploy rules + index requis avant prod** (cf. discipline 4A.3).
- **Bloqué / différé.** Step 5 (level-up) attend plan 18 ; step 6 (encounters) attend plan 24 ; step 8 (compteurs `members.stats` par-campagne) exige d'élargir la rule d'update `members/` au champ `stats` — à porter quand un consommateur l'exige. Le feed JOUEUR (membre voit le flux public de sa campagne) est un suivi trivial (la query membre `where visibility == 'all'` est déjà supportée par le hook) — non monté en V1, le feed est MJ-only.

**Décision d'archi (22.1, documentée dans docs/EVENT-LOG.md) :** la « campagne active » dérive de `character.homeCampaignId` (pointeur posé par le lien fiche↔membre, JALON 4A), pas d'un mode « session » dédié. `sessionId` reste `null` jusqu'au plan 23. Réversible, sans changement de schéma ni de rule.

**Gap connu (porté au plan 21) :** la rule de READ `events` exige `isMemberOf`, or un MJ n'a pas de doc `members/` → un MJ ne peut pas encore lire le flux. Le lecteur MJ (plan 21) devra élargir la rule à `isMemberOf || isDMOf`.

## Steps

### Core logger
- [~] 1. `src/shared/lib/event-logger.ts` (22.1 : `logRoll` + `logRollIfCampaign`. 22.2 : `logSpellCast` + `logCharacterDiff` + `bumpRollStats`. **Décision d'archi 22.2** : plutôt qu'une fonction `log*` par kind appelée explicitement à chaque call site — fragile, facile à oublier — le diff de fiche est CENTRALISÉ dans `useUpdateCharacter` via la fonction pure `diffCharacterEvents(before, patch)`. Un seul point de câblage, garde le « single entry point ». Les kinds restants — level-up/encounters/etc. — viendront avec leurs plans respectifs) :
    - One exported function per event kind (logRoll, logHpChange, logConditionAdd, …).
    - Each function constructs the Event doc, sets visibility default (per docs/EVENT-LOG.md table), writes via Firestore.
    - All functions require an active `campaignId` — if no active campaign, the logger is a no-op (returns silently).
    - All functions read `useActiveCampaign().campaignId` from the Zustand slice.

### Hook into existing actions
- [x] 2. Update `src/features/dice/use-dice.ts` — replace the `logRollIfCampaign` stub with the real `logRoll`. (22.1 : import redirigé du stub vers `event-logger.ts` sur les 4 call sites ; payload `mode/rawFaces/keptFaces/total/crit/fumble/advantage` + label/rollKind/characterId.) **Le payload doit inclure** `mode: 'digital' | 'physical'`, `rawFaces: number[]`, `keptFaces: number[]`, `total`, `crit`, `fumble`, `advantage`, en plus du label/kind/characterId (cf. shape `RollResult` plan 12). Les jets physiques sont des événements de plein droit ; le compilateur de journal plan 25 distinguera mode physique/digital pour la prose.
- [x] 3. Update `useUpdateCharacter` — after a successful patch, diff what changed and log appropriate events (22.2 : diff pur `character-diff.ts`, appelé par le hook via `logCharacterDiff`) :
    - `hp.current` changed → `hp-change` (before/after/delta/reason) ✓
    - `hp.temp` augmenté → `temp-hp` ✓
    - `conditions` added/removed → `condition-add` / `condition-remove` ✓
    - `spellSlots[level].current` changed → `slot-consumed` / `slot-restored` ✓
    - `inventory.items` added/removed (présence + qty) → `item-acquired` / `item-removed` ✓
    - `level` changed → `logLevelUp` : **différé plan 18** (le wizard de montée passe `{ log: 'manual' }`).
    - Hors périmètre 22.2 (kinds existants, plan ultérieur) : `coins-change`, `item-equipped/unequipped`, `attunement-changed`.
- [x] 4. Update `castSpell` flow (sheet/magie) — `logSpellCast` dans `handleCast` avec `{spellId, level, slotConsumed, components}` ; le cast passe `{ log: 'manual' }` pour ne pas dupliquer `slot-consumed`.
- [ ] 5. Update level-up wizard (plan 18) — replace stub with `logLevelUp`.
- [ ] 6. Update encounter actions (placeholder until plan 24).

### Denormalized stats counters
- [x] 7. After successful event write, update per-character lifetime stats (22.2 : `bumpRollStats` dans `logRoll`, ne s'exécute que si l'event `roll` a été écrit) :
    - `roll` event → `stats.totalRolls++` ✓, `totalD20Sum += d20 conservé` (kinds d20 only) ✓, `crits++ if crit` ✓, `fumbles++ if fumble` ✓
    - Skill rolls → `stats.skillUses[skillId]++` ✓ (`skillId` porté par `RollResult`, posé par `skills-list`)
- [ ] 8. After successful event write, update per-campaign membership stats: **différé** — exige d'élargir la rule d'update `members/` au champ `stats` (à porter quand un consommateur l'exige, cf. sous-jalons ci-dessus).
    - `roll` → `rollsInCampaign++, critsInCampaign++ if crit`
    - `death` → `deathsInCampaign++`
    - `session-end` (if attended) → `sessionsAttended++`
- [x] 9. Use Firestore `increment(1)` for atomicity (22.2 : `increment()` sur tous les compteurs de stats).

### Visibility filtering (client-side, complementing rules)
- [x] 10. In any event reader (e.g. journal feed, dashboard events panel), filter by visibility using `canViewEvent` from `permissions.ts`. **(22.3 — LIVRÉ.)** Premier lecteur : le feed d'activité MJ (`CampaignEventFeed` + `useCampaignEvents`) dans `campaign-detail-screen`. `canViewEvent` filtre l'affichage ; la query est contrainte par visibilité (`where in ['all','dm']` MJ) — barrière de sécurité = rules + query, affinage = `canViewEvent`. Rule de read `events` élargie à `isMemberOf || isDMOf` (gap 22.1 fermé).

### Tests
- [x] 11. Unit tests for event-logger functions (mock Firestore). (22.1 : `event-logger.test.ts` 9 cas. 22.2 : +12 cas `event-logger.test.ts` (stats lifetime, `logSpellCast`, `logCharacterDiff`) + 15 cas `character-diff.test.ts` (diff pur, toutes branches + non-événements).)
- [~] 12. e2e: in a campaign, roll a d20, see event. (22.1 : `campaigns-event-log.spec.ts` — jet sur fiche liée → event `roll`. 22.2 : +1 test — dégât sur fiche liée → event `hp-change` relu en Admin SDK. Les 2 tests seedés en preset v2 pour éviter la fenêtre de campagne-active-nulle de la migration, cf. D27. Le « voir dans le dashboard MJ » attend le lecteur du plan 21.)

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
