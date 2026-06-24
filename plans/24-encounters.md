# Plan 24 — Combat encounters

## Goal
DM creates encounters with participants (players auto-included; DM adds monsters from `monsters.json` or campaign customContent). Shared initiative tracker. Turn order. Monster HP/conditions managed by DM. `encounter-start`, `turn-start`, `monster-hp-change`, `encounter-end` events logged. Real-time sync.

## Context
Read `docs/DATA-MODEL.md` (encounter schema), `docs/EVENT-LOG.md`.

## Prerequisites
Plans 22-23 complete.

## Steps
- [~] 1. Route `/campaign/:id/encounter/:eid` → `<EncounterScreen />`. **24.2 livre la route LISTE `/campaigns/:cid/encounters` (`<EncountersListScreen>`) — convention `/campaigns/:cid/...` cohérente avec sessions, PAS le `/campaign/:id` littéral du plan.** La route DÉTAIL (tracker de combat `/campaigns/:cid/encounters/:eid`) reste à livrer en 24.3 ; les lignes de liste sont des cartes statiques en attendant.
- [x] 2. DM dashboard "Créer rencontre" → modal: name, link to session, add monsters (search the monster DB, select, qty). **DÉCISION ADRIEN RÉSOLUE → option (a) SAISIE MANUELLE (nom + PV)** : `monsters.json` étant vide (0/332), la « recherche dans la DB monstres » est remplacée par une saisie manuelle de monstre (nom + PV, quantité ⇒ N participants numérotés « Gobelin 1/2… »), `monsterContentId: null`. **`link to session` NON câblé en 24.2** (la rencontre se crée hors séance, `sessionId: null` ; le lien viendra avec l'écran de combat 24.3 si utile). **CONSTAT BLOQUANT pour la « CA » du stopgap original** : le schéma participant documenté (DATA-MODEL.md) ne porte PAS de champ `ac` — la saisie de CA manuelle nécessiterait un changement de schéma (décision Adrien). Le tracker (initiative/tours/PV) fonctionne sans CA ; la CA viendra du stat block (bestiaire SRD) ou d'une décision schéma ultérieure. Livré 24.2.
- [x] 3. On create, write `encounters/{eid}` with status `'planned'`, participants array (all players auto-added; monsters per choice). **Livré 24.2** : `EncounterCreateModal` auto-inclut les fiches liées de la table (`useEncounterPartyDraft` — lecture cross-owner one-shot des PJ liés, snapshot des PV à la création) + les monstres manuels, puis appelle `createEncounter` (data layer 24.1). Auto-inclusion + expansion quantité + validations testées.
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

### JALON 24.2 — Liste + création de rencontre (route + écran + modale) ✅ livré
Mirror exact de 23.2 (sessions). Couvre les steps 1 (partiel — route liste), 2 et 3.

- **`src/features/campaigns/use-encounters.ts`** — hook liste one-shot + refresh (mirror `useSessions`), consomme `listEncounters` (24.1) et la rule de read `isMemberOf || isDMOf`.
- **`src/features/campaigns/use-encounter-party-draft.ts`** — lecture cross-owner **one-shot** (`getDoc`, pas `onSnapshot`) des fiches liées de la table → participants joueurs (nom + PV courants/max, snapshot à la création). Extraction DÉFENSIVE des 3 champs (`name`, `hp.current`, `hp.max`) stables v1/v2 plutôt qu'un parse `CharacterSchema` complet (ne rejette pas une fiche v1 non migrée). `enabled` gate le fetch (la modale ne lit la table qu'à son ouverture). Une fiche illisible est exclue et lève `hadReadError`.
- **`src/features/campaigns/encounter-create-modal.tsx`** — modale « Nouvelle rencontre » : nom (obligatoire) + section joueurs auto-inclus (lecture seule) + saisie manuelle de monstres (nom + PV + quantité, lignes ajout/retrait). Quantité > 1 ⇒ N participants numérotés. Validations : nom requis/≤120, nom de monstre requis sur ligne active, PV monstre > 0, au moins 1 participant. Appelle `createEncounter`.
- **`src/features/campaigns/encounters-list-screen.tsx`** — route `/campaigns/:cid/encounters` (mirror `SessionsListScreen`) : liste (cartes statiques : nom + nb participants + chip statut), empty state MJ/membre, CTA « Créer une rencontre » MJ-only. Pluriel correct (« 1 participant » / « N participants »).
- **`src/routes.tsx`** + **`campaign-detail-screen.tsx`** — route déclarée ; entrée MJ « Rencontres » ajoutée à côté de « Séances » dans la nav du détail campagne.
- **i18n** — bloc `encounters.*` (FR + EN, ~45 clés) + `campaigns.detail.encountersCta`. Terminologie FR officielle : « Rencontre » (= encounter SRD FR), « Préparée/En cours/Terminée/Abandonnée » pour les 4 statuts.
- **Tests** — `use-encounters.test.tsx` (5, mirror sessions), `use-encounter-party-draft.test.tsx` (6 : extraction, fiche absente/malformée ⇒ hadReadError, enabled=false, vide, erreur globale), `encounters-list-screen.test.tsx` (11 : empty MJ/membre, identité des libellés de statut, pluriel singulier/pluriel rouge-avant-vert, erreur+retry, et flow modale : nom requis, joueurs auto-inclus → participants joueurs exacts, monstre qty=2 → 2 participants numérotés, PV manquant → erreur, aucun participant → erreur, erreur create générique). **+22 tests.** Triple gate verte (typecheck + 2379 fast + lint).
- **UAT e2e** — `tests/e2e/encounters-list-uat.spec.ts` (émulateur, vert) → galerie `uat-review/jalon-24/24.2/` (01 liste vide, 02 modale fullPage+viewport, 03 modale avec monstre, 04 liste, 05 mobile, 06 tablet). Non-régression vérifiée : `campaigns-detail-uat` + `sessions-list-uat` + `session-lifecycle-uat` verts après le changement de nav.

**Décisions tactiques 24.2 :**
- **Décision Adrien « monstres vides » tranchée option (a)** (saisie manuelle nom + PV). Le cœur du tracker (initiative/tours/PV/hand-off) ne dépend pas du stat block ; le bestiaire SRD enrichira plus tard.
- **CONSTAT (nouveau, à arbitrer plus tard) : pas de champ `ac` sur le participant** (DATA-MODEL.md ne le porte pas). La « CA » du stopgap original n'est donc PAS saisissable sans changement de schéma. Reportée : viendra du stat block monstre ou d'une décision schéma dédiée. Ne bloque pas le tracker.
- **Lien séance (`sessionId`) non câblé** à la création (rencontre hors séance, `null`). À reconsidérer en 24.3 si l'écran de combat veut rattacher la rencontre à la séance active.
- **PV joueurs figés à la création** (snapshot). La ré-synchronisation live fiche→rencontre est un sujet de l'écran de combat 24.x (real-time, step 10).
- **Lignes de liste statiques** (pas de navigation) tant que `EncounterScreen` (24.3) n'existe pas — pas de route morte.

### Reste à livrer (UI + décisions Adrien requises)

**✅ DÉCISION ADRIEN RÉSOLUE (2026-06-24) — `monsters.json` VIDE → option (a) saisie manuelle, livrée en 24.2.**
La création de rencontre fonctionne par saisie manuelle de monstre (nom + PV). Le SRD-sourcing du bestiaire reste un plan dédié à venir ; il enrichira `monsterContentId` a posteriori. **Nouveau constat reporté** : le champ `ac` n'existe pas sur le participant (DATA-MODEL.md) — saisie de CA manuelle = changement de schéma, à arbitrer si besoin. Historique de la décision ci-dessous :
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
- **Blocage monstres** tranché option (a) en 24.2 (saisie manuelle). Plus de blocage sur la création.
- **JALON 24.3 (à venir) = écran de combat** `EncounterScreen` sur `/campaigns/:cid/encounters/:eid` : roll-init + re-roll (step 4), boutons start/end + pose `activeEncounterId` (steps 5/9, le data layer + slice sont prêts en 24.1), turn-order strip (step 6), real-time `onSnapshot` sur le doc rencontre (step 10). Rendre alors les lignes de `EncountersListScreen` cliquables (navigation vers le détail — aujourd'hui statiques). Câbler les 4 loggers encounter (24.1) au bon moment.
- **Init modifier au roll (24.3)** : le schéma participant ne stocke PAS le modificateur d'init (seulement `initiative`, le total roulé, à 0). Au roll, résoudre le modificateur joueur via sa fiche liée (`character.initiative`), monstre manuel via 0 (pas de DEX saisie). Idem la **CA** : à afficher au combat, viendra du stat block (bestiaire) ou d'une décision schéma — pas saisie en 24.2.
- Le hand-off dégâts physiques s'enrichira en S4 avec le ciblage visuel sur la carte (tokens, plan 30) : tap une cible sur la carte pour appliquer un événement de dégâts en cours. Le cœur « MJ applique sur un participant d'encounter » reste celui-ci.
