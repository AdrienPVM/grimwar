# Plan 24 — Combat encounters

## Goal
DM creates encounters with participants (players auto-included; DM adds monsters from `monsters.json` or campaign customContent). Shared initiative tracker. Turn order. Monster HP/conditions managed by DM. `encounter-start`, `turn-start`, `monster-hp-change`, `encounter-end` events logged. Real-time sync.

## Context
Read `docs/DATA-MODEL.md` (encounter schema), `docs/EVENT-LOG.md`.

## Prerequisites
Plans 22-23 complete.

## Steps
- [ ] 1. Route `/campaign/:id/encounter/:eid` → `<EncounterScreen />`.
- [~] 2. DM dashboard "Créer rencontre" → modal: name, link to session, add monsters (search the monster DB, select, qty). **BLOCAGE PARTIEL (voir « Décision Adrien requise » 24.1) : `monsters.json` est VIDE (0/332, bloquant S3 documenté). La recherche de monstre dans la DB n'a aucune donnée à chercher.** Le data layer (24.1) modélise les participants monstres mais l'UI de création devra, soit (a) saisie manuelle nom+PV+CA en stopgap, soit (b) attendre le plan de bestiaire SRD. À trancher.
- [~] 3. On create, write `encounters/{eid}` with status `'planned'`, participants array (all players auto-added; monsters per choice). **Data layer livré 24.1** (`createEncounter` — auto-inclusion PJ faite côté UI 24.2 qui connaît le roster). L'écriture du doc + la normalisation des participants sont en place et testées.
- [~] 4. **Roll initiative** button: rolls d20 + DEX mod for each participant in parallel. Players can re-roll if they want. Sorts participants by init desc. **Cœur livré 24.1** (`rollInitiativeFor` pur via `rollDieCrypto`, `applyInitiative` trie par init desc, `setParticipants` persiste). Le bouton + le re-roll joueur = UI 24.x.
- [~] 5. **Start encounter** → status `'active'`, `round=1`, `turnIndex=0`. Logs `encounter-start` event. **Data layer + logger livrés 24.1** (`startEncounter` pose active/round 1/turnIndex 0 + garde-fous `no-participants`/`another-encounter-active` ; `logEncounterStart`). Bouton + pose du pointeur `activeEncounterId` = UI 24.x.
- [~] 6. **Turn order strip** — horizontal scroll showing all participants in order. Active turn highlighted. "Fin du tour" advances `turnIndex`. Wraps round on overflow. **Logique de tour livrée 24.1** (`nextTurn` pur : wrap au dernier participant → round +1, turnIndex 0 ; `advanceTurn` persiste ; `logTurnStart`). La strip horizontale = UI 24.x.
- [~] 7. **Monster control** (DM only): each monster card shows HP, conditions, AC. Tap to damage/heal/condition (logged as `monster-hp-change`, visibility 'all'). **Logique livrée 24.1** (`applyHpDelta` clampe 0..maxHp + renvoie before/after, `toggleCondition` add/remove idempotent ; `logMonsterHpChange`). **NB visibilité** : le logger pose `monster-hp-change` en visibilité **`dm`** (table EVENT-LOG.md), pas `all` comme l'écrit ce step — le step est divergent de la table de référence ; on suit la table (le MJ ne révèle pas forcément les PV exacts). Les cartes + le tap = UI 24.x (et dépendent en partie du blocage monstres step 2).
- [ ] 7b. **Hand-off dégâts physiques (DM only)** : un panneau d'en-tête du tracker liste les `damage`/`attack` events récents en mode physique posés par les joueurs (« Lyralei — 11 tranchants · épée longue · Att 17 »). Le MJ tape un participant pour appliquer le total à ses PV (logged comme `monster-hp-change` ou `hp-change`), ou édite les PV manuellement. **Le joueur ne cible jamais ; le MJ choisit la cible.** Le total d'attaque s'affiche côté CA de la cible pour adjuger touché/raté à la main quand l'auto-crit/auto-raté n'a pas suffi (mode physique avec jet d'attaque ouvert). L'event reste dans le panneau jusqu'à application ou dismiss DM (TTL court, 5min, ou bouton « Ignorer »).
- [ ] 8. **Party view** for players: shows all participants' HP bars (their own + party + monsters with DM-controlled visibility).
- [~] 9. **End encounter** → status `'completed'`, outcome selector (victory/defeat/fled). Logs `encounter-end`. **Data layer + logger livrés 24.1** (`endEncounter` pose completed/endedAt ; `logEncounterEnd` porte l'`outcome` dans le payload). **Décision tactique : `outcome` N'EST PAS persisté sur le doc encounter** — le schéma documenté (docs/DATA-MODEL.md) ne porte pas ce champ ; l'issue vit dans l'event `encounter-end` (conforme EVENT-LOG.md). L'ajouter au doc serait un changement de schéma Firestore → décision Adrien. Le sélecteur d'issue = UI 24.x.
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

## Sous-jalons

### JALON 24.1 — Data layer (type + service + logger + rule-widening) ✅ livré
Fondation sans UI, entièrement testée. Mirror exact de 23.1 (sessions). Couvre le socle des steps 3/4/5/6/7/9 côté données + journalisation.

- **`src/shared/types/encounter.ts`** — `EncounterSchema` (Zod) reproduisant À L'IDENTIQUE la forme documentée `docs/DATA-MODEL.md` (aucun champ ajouté ⇒ pas de changement de schéma Firestore). `ENCOUNTER_STATUSES` (planned/active/completed/aborted), `PARTICIPANT_TYPES` (player/monster/npc), `ENCOUNTER_OUTCOMES` (victory/defeat/fled — exposé mais **PAS** dans `EncounterSchema` : l'issue vit dans l'event `encounter-end`, le doc ne la porte pas).
- **`src/shared/lib/services/encounters.ts`** — `createEncounter` (planned/round 0, normalise les participants, `currentHp` défaut = `maxHp`, `instanceId` auto si absent), `listEncounters`/`getEncounter`/`getActiveEncounter`, helpers PURS `rollInitiativeFor` (1d20+mod via `rollDieCrypto`) / `applyInitiative` (tri init desc, stable sur égalité) / `nextTurn` (wrap → round +1) / `applyHpDelta` (clamp 0..maxHp + before/after) / `toggleCondition` (add/remove idempotent), transitions `startEncounter` (garde-fous `no-participants` + `another-encounter-active`, re-start idempotent), `advanceTurn`, `endEncounter`, `setParticipants`. Pattern aligné sur `sessions.ts` (`trackPendingWrite`, `serverTimestamp`, `EncounterServiceError` typée). La séparation calcul pur / I/O rend tout testable sans émulateur.
- **`src/shared/lib/event-logger.ts`** — `logEncounterStart` / `logEncounterEnd` (issue dans le payload) / `logTurnStart` / `logMonsterHpChange` (visibilité **`dm`** par table EVENT-LOG.md, calcule `delta = after - before`). Tous `actorCharacterId: null` (actions MJ), `encounterId` explicite.
- **`src/shared/lib/slices/active-campaign-slice.ts`** — ajout `activeEncounterId` + `setActiveEncounter`. L'event-logger tague désormais `encounterId: input.encounterId ?? activeEncounterId` (mirror du `sessionId`). `clearActiveCampaign` libère les 3 pointeurs.
- **`firestore.rules`** — lecture encounters élargie `isMemberOf(cid)` → `isMemberOf(cid) || isDMOf(cid)`. Même gap MJ-pur que sessions 23.1 / events 22.3 (un MJ pur n'a pas de doc `members/` ⇒ ne pouvait pas lire SES PROPRES rencontres). **⚠️ Non déployé** — `pnpm firebase:deploy:rules` requis avant que l'UI 24.x ne consomme la liste en prod (cf. discipline deploy CLAUDE.md). Inerte localement (émulateur OK).
- **Tests** — `services/__tests__/encounters.test.ts` (25 : create/list/get/getActive, initiative pur, tour pur + advanceTurn, start avec 3 garde-fous, end sans outcome sur doc, applyHpDelta clamp haut/bas/introuvable, toggleCondition). `__tests__/event-logger.test.ts` (+4 : encounter-start/end/turn-start/monster-hp-change visibilité dm + delta). `slices/__tests__/active-campaign-slice.test.ts` (+2 : setActiveEncounter isolé, clear libère les 3). `tests/firestore-rules.test.ts` (+11 : bloc encounters read membre/MJ/non-membre incl. **gap MJ rouge-avant-vert prouvé** — 2 tests rouges sans `|| isDMOf`, vérifié — query liste, CRUD MJ-only) → 99/99 contre l'émulateur. Triple gate verte (typecheck + 2357 fast + lint) + `pnpm test:rules` 99/99.

**Décisions tactiques 24.1 :**
- Helpers d'initiative/tour/PV/états **purs** (sans I/O), séparés des fonctions Firestore — testables en isolation, déterministes (le d20 vient de `rollDieCrypto` mocké dans les tests). Les fonctions I/O lisent l'état (`getEncounter`) puis posent le résultat calculé.
- `outcome` NON ajouté au doc encounter (schéma documenté ne le porte pas) — l'issue vit dans l'event `encounter-end`. Ajout au doc = changement de schéma → décision Adrien.
- Garde-fou « une seule rencontre active » + « pas de participants » placés dans `startEncounter` (data layer, testable) — client-enforced comme `startSession` (les rules ne peuvent pas asserter l'unicité cross-doc à bas coût).
- `logMonsterHpChange` en visibilité **`dm`** (suit la table EVENT-LOG.md) alors que le step 7 du plan écrit `'all'` — divergence du step vs la table de référence ; on suit la table. À reconfirmer en UI 24.x si le MJ veut révéler les PV monstres.

### Reste à livrer (UI + décisions Adrien requises)

**⚠️ DÉCISION ADRIEN REQUISE — `monsters.json` VIDE (bloque steps 2-3 partiel + 7 partiel).**
`public/data/monsters.json` est `[]` (0/332, statut CRITIQUE/bloquant S3 documenté dans `docs/AUDIT-SRD-COMPLETUDE.md`). La « recherche dans la DB monstres » (step 2) n'a aucune donnée. Le `MonsterSchema` existe (`src/shared/types/content.ts`) mais le bestiaire n'a jamais été peuplé — son SRD-sourcing est un **plan dédié à venir** (cf. decision log « pass-through monsters » + DEBT D-monsters). Le data layer 24.1 modélise `participants[].monsterContentId` sans pouvoir le résoudre. **Options pour l'UI 24.x** :
  - (a) **Stopgap saisie manuelle** : le MJ ajoute un monstre par nom + PV + CA libres (`monsterContentId: null`), sans stat block complet. Débloque tout le tracker immédiatement, le bestiaire SRD enrichira plus tard.
  - (b) **Attendre le plan bestiaire SRD** : ne pas livrer la création de rencontre tant que `monsters.json` n'est pas peuplé (bloque tout le plan 24 UI).
  Recommandation : **(a)** — le cœur du tracker (initiative, tours, PV, dégâts physiques hand-off) ne dépend pas du stat block complet ; la saisie manuelle suffit pour jouer, le bestiaire est un confort. **À trancher avant l'UI 24.2.**

Autres restes :
- **UI 24.x** : route `EncounterScreen` (step 1), modale de création (step 2, voir blocage ci-dessus), bouton roll-init + re-roll joueur (step 4), boutons start/end + sélecteur d'issue + pose `activeEncounterId` (steps 5/9), turn-order strip (step 6), cartes de contrôle monstre (step 7), hand-off dégâts physiques (step 7b), party view joueur (step 8), real-time `onSnapshot` (step 10).
- **e2e** (step 12) : DM crée rencontre 3 gobelins, roll init, 2 rounds, kill all, victoire — dépend de l'UI + de la résolution du blocage monstres.

## Notes for next plan
- Plan 25 (journal) uses encounter events heavily — encounter-start/end frame "Combat" sections in the journal. Les 4 loggers (`logEncounterStart`/`logEncounterEnd`/`logTurnStart`/`logMonsterHpChange`) sont en place depuis 24.1 ; le compilateur lira ces events.
- **⚠️ Rule `firestore.rules` NON déployée à déployer avant l'UI prod** : encounters read `|| isDMOf` (24.1). Couverte par `tests/firestore-rules.test.ts` (99/99 émulateur). S'ajoute aux 2 rules sessions/events déjà en attente (cf. plan 23 notes).
- **Blocage monstres** (cf. ci-dessus) à trancher avant l'UI de création de rencontre.
- Le hand-off dégâts physiques s'enrichira en S4 avec le ciblage visuel sur la carte (tokens, plan 30) : tap une cible sur la carte pour appliquer un événement de dégâts en cours. Le cœur « MJ applique sur un participant d'encounter » reste celui-ci.
