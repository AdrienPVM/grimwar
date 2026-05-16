# Plan 24 — Combat encounters

## Goal
DM creates encounters with participants (players auto-included; DM adds monsters from `monsters.json` or campaign customContent). Shared initiative tracker. Turn order. Monster HP/conditions managed by DM. `encounter-start`, `turn-start`, `monster-hp-change`, `encounter-end` events logged. Real-time sync.

## Context
Read `docs/DATA-MODEL.md` (encounter schema), `docs/EVENT-LOG.md`.

## Prerequisites
Plans 22-23 complete.

## Steps
- [ ] 1. Route `/campaign/:id/encounter/:eid` → `<EncounterScreen />`.
- [ ] 2. DM dashboard "Créer rencontre" → modal: name, link to session, add monsters (search the monster DB, select, qty).
- [ ] 3. On create, write `encounters/{eid}` with status `'planned'`, participants array (all players auto-added; monsters per choice).
- [ ] 4. **Roll initiative** button: rolls d20 + DEX mod for each participant in parallel. Players can re-roll if they want. Sorts participants by init desc.
- [ ] 5. **Start encounter** → status `'active'`, `round=1`, `turnIndex=0`. Logs `encounter-start` event.
- [ ] 6. **Turn order strip** — horizontal scroll showing all participants in order. Active turn highlighted. "Fin du tour" advances `turnIndex`. Wraps round on overflow.
- [ ] 7. **Monster control** (DM only): each monster card shows HP, conditions, AC. Tap to damage/heal/condition (logged as `monster-hp-change`, visibility 'all').
- [ ] 7b. **Hand-off dégâts physiques (DM only)** : un panneau d'en-tête du tracker liste les `damage`/`attack` events récents en mode physique posés par les joueurs (« Lyralei — 11 tranchants · épée longue · Att 17 »). Le MJ tape un participant pour appliquer le total à ses PV (logged comme `monster-hp-change` ou `hp-change`), ou édite les PV manuellement. **Le joueur ne cible jamais ; le MJ choisit la cible.** Le total d'attaque s'affiche côté CA de la cible pour adjuger touché/raté à la main quand l'auto-crit/auto-raté n'a pas suffi (mode physique avec jet d'attaque ouvert). L'event reste dans le panneau jusqu'à application ou dismiss DM (TTL court, 5min, ou bouton « Ignorer »).
- [ ] 8. **Party view** for players: shows all participants' HP bars (their own + party + monsters with DM-controlled visibility).
- [ ] 9. **End encounter** → status `'completed'`, outcome selector (victory/defeat/fled). Logs `encounter-end`.
- [ ] 10. Real-time: all participants share state via Firestore listeners.
- [ ] 11. Optional: encounter linked to a map (plan 27-30) — position field per participant. For S3, position is null.

### Tests
- [ ] 12. e2e: DM creates 3-goblin encounter, rolls init, runs 2 rounds, kills all goblins, ends with victory.
- [ ] 13. `pnpm typecheck && pnpm test && pnpm lint`
- [ ] 14. Commit: `feat(encounters): combat tracker (plan 24)`

## Definition of Done
- [ ] Create / start / run / end encounter works
- [ ] Players see live turn order and HP changes
- [ ] DM controls monsters
- [ ] All events logged correctly

## Notes for next plan
- Plan 25 (journal) uses encounter events heavily — encounter-start/end frame "Combat" sections in the journal.
- Le hand-off dégâts physiques s'enrichira en S4 avec le ciblage visuel sur la carte (tokens, plan 30) : tap une cible sur la carte pour appliquer un événement de dégâts en cours. Le cœur « MJ applique sur un participant d'encounter » reste celui-ci.
