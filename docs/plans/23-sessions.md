# Plan 23 — Sessions manager

## Goal
DM can start/end sessions in a campaign. Attendance tracked. Each session has a number, title, planned date, notes (Markdown). `session-start` / `session-end` events logged. Sessions list at `/campaign/:id/sessions`, individual session at `/campaign/:id/session/:sid`.

## Context
Read `docs/DATA-MODEL.md` (sessions schema), `docs/EVENT-LOG.md` (session events).

## Prerequisites
Plans 14, 22.

## Steps
- [x] 1. Route `/campaigns/:cid/sessions` → `<SessionsListScreen />`: liste triée, bouton MJ-only « Planifier une séance ». (23.2 — route alignée sur le préfixe `/campaigns/:cid` de la feature, PAS `/campaign/:id` du texte du plan.)
- [x] 2. `<SessionCreateModal />`: titre + date prévue. « Description optionnelle » NON modélisée (pas de champ au schéma — décision 23.1, repliable sur les notes 23.3). (23.2)
- [x] 3. Auto-number sessions: query max `number`, +1. (livré en 23.1 dans `createSession`, consommé tel quel par la modale.)
- [x] 4. Route `/campaigns/:cid/sessions/:sid` → `<SessionScreen />` with tabs: Notes / Présence / Événements / Journal. (23.3 — Events + Journal sont des placeholders, câblés en 23.4 / plan 25.)
- [x] 5. **Notes tab** — éditeur Markdown-as-text (MJ-only) + auto-save debounced 5 s → `sessions/{sid}.notes`. (23.3) ⚠️ Le RENDU Markdown enrichi (preview gras/titres/listes) est DIFFÉRÉ : il requiert une dépendance externe (react-markdown), décision Adrien (règle d'autonomie). Le texte est stocké tel quel, la vue lecture préserve les sauts de ligne.
- [x] 6. **Attendance tab** — cases cochables par membre (MJ-only), push de la liste complète → `sessions/{sid}.attendance: string[]`. (23.3)
- [ ] 7. **Events tab** — events scoped to this session (`events` where `sessionId == sid`), grouped by encounter / chronological. (placeholder posé en 23.3, lecture câblée en 23.4)
- [x] 8. **Start session** button (when status='planned'): `status='active'`, `startedAt=now`, logue `session-start`. (23.4) — la version « sticky in DM dashboard top bar » (rappel persistant hors écran séance) reste un raffinement DM-dashboard ultérieur.
- [x] 9. **End session** button (when status='active'): `status='completed'`, `endedAt=now`, logue `session-end`. (23.4) — compilation journal = plan 25.
- [x] 10. Only one session can be `'active'` at a time per campaign. (garde-fou service 23.1 `another-session-active`, surfacé en UI 23.4 avec message dédié.)
- [~] 11. Active session ID flows through Zustand → events tagués `sessionId`. **MJ-side livré** (23.4 : `setActiveCampaign(cid, sid)` au start, les events MJ + `session-start`/`session-end` portent `sessionId`). **Propagation cross-client DÉFÉRÉE** — pour que les events d'un JOUEUR soient tagués, son appareil doit connaître la séance active ; en jeu hors-ligne (« téléphone dans une grotte ») la propagation temps-réel Firestore ne fonctionne pas → décision d'architecture à trancher avec Adrien (one-shot au montage de fiche vs onSnapshot vs join manuel). Voir « Décision Adrien en attente ».

### Tests
- [~] 12. e2e: DM crée séance, démarre, clôt, events journalisés + rendus au feed, placeholder journal visible — **livré en single-MJ** (`tests/e2e/session-lifecycle-uat.spec.ts` + les 3 specs UAT 23.2/23.3/23.4). La branche « players join » (multi-user) est déférée (nécessite un second compte e2e, comme la promotion MJ de `campaigns-detail-uat`).
- [x] 13. `pnpm typecheck && pnpm test && pnpm lint` — vert à chaque sous-jalon (23.2 → 23.4).
- [x] 14. Commits conventionnels par sous-jalon (23.2 `e60b80a`, 23.3 `8dfaf3f`, 23.4 ci-après).

## Definition of Done
- [x] Session creation, start, end flows work
- [x] One active session at a time
- [~] Events auto-tagged with sessionId — MJ-side OK ; propagation cross-client joueur déférée (décision Adrien)
- [x] Notes auto-save

## Sous-jalons

### JALON 23.1 — Data layer (type + service + rule-widening) ✅ livré
Fondation sans UI, entièrement testée. Couvre le socle des steps 3/5/6/8/9/10 côté données.

- **`src/shared/types/session.ts`** — `SessionSchema` (Zod) reproduisant À L'IDENTIQUE la forme documentée `docs/DATA-MODEL.md` (aucun champ ajouté ⇒ pas de changement de schéma Firestore). `SESSION_STATUSES` + `SessionStatus`.
- **`src/shared/lib/services/sessions.ts`** — `createSession` (auto-numérotation max+1, step 3), `listSessions`, `getSession`, `getActiveSession`, `startSession` (garde-fou « une seule active à la fois » côté client, step 10 → `SessionServiceError('another-session-active')`, re-start idempotent), `endSession` (step 9, sans la compilation journal plan 25), `updateSessionNotes` (step 5), `setSessionAttendance` (step 6). Pattern aligné sur `campaigns.ts` (`trackPendingWrite`, `serverTimestamp`, erreurs typées `SessionServiceError`).
- **`firestore.rules`** — lecture sessions élargie `isMemberOf(cid)` → `isMemberOf(cid) || isDMOf(cid)`. Un MJ pur n'a pas de doc `members/` ⇒ ne pouvait pas lire SA PROPRE liste. Élargissement identique au précédent events 22.3 / maps CHANTIER D. **⚠️ Non déployé** — `pnpm firebase:deploy:rules` requis avant que 23.2+ ne consomme la liste en prod (cf. discipline deploy CLAUDE.md).
- **Tests** — `tests/firestore-rules.test.ts` : bloc sessions (read membre/MJ/non-membre incl. gap MJ-sans-`members/` rouge-avant-vert, query liste, CRUD MJ-only) → 87/87 contre l'émulateur. `src/shared/lib/services/__tests__/sessions.test.ts` : 17 tests (auto-numérotation, garde-fou actif, payloads). Triple gate verte.

**Décisions tactiques 23.1 :**
- Garde-fou « une seule session active » placé dans `startSession` (data layer, testable sans UI) plutôt que reporté au wiring 23.4. Client-enforced — les rules ne peuvent pas asserter à bas coût l'unicité cross-doc ; acceptable single-DM V1.
- Auto-numérotation read-then-write non atomique : collision possible sur `number` en cas de double-MJ simultané (id du doc reste unique ⇒ collision cosmétique). Documenté dans le service. Durcissement transactionnel déféré si co-MJ l'exige.
- Pas d'event `session-start`/`session-end` ni de câblage `activeSessionId` Zustand dans le service — c'est du wiring UI (23.4). L'event-logger auto-tag déjà `sessionId` depuis `activeSessionId` (`event-logger.ts:48`, prêt depuis 22.1).
- « description optionnelle » du step 2 NON modélisée comme champ (le schéma documenté n'en a pas) — repliable sur `notes` côté UI 23.2 sans changement de service.

### JALON 23.2 — Liste + planification (steps 1-3 UI) ✅ livré
Premier consommateur UI du data layer 23.1. Triple gate verte (typecheck + 2621 tests dont +15 nouveaux + lint).

- **`src/features/campaigns/use-sessions.ts`** — hook one-shot + refresh manuel (mirror `useMyCampaigns` / `useCampaign`), wrap fin sur `listSessions`. Pas d'`onSnapshot` (volume bas, mutations user-initiated) — le live ne concerne que `activeSessionId` (23.4).
- **`src/features/campaigns/session-create-modal.tsx`** — modale « Planifier une séance » : titre (obligatoire, max 120 = `SessionSchema.title`) + date prévue optionnelle (`<input type="date">` → `Date` locale `T00:00:00`, vide ⇒ `null`). Toutes les erreurs create tombent sur le message générique (aucun `kind` levé sur ce chemin). Pattern aligné sur `CreateCampaignModal`.
- **`src/features/campaigns/sessions-list-screen.tsx`** — route `/campaigns/:cid/sessions`. Liste lisible par tout membre, CTA « Planifier » MJ-only (`gmIds.includes(uid)` via `useCampaign`). Empty states distincts MJ/joueur. Lignes = cartes statiques (numéro + titre + chip statut + date courte FR) — l'ouverture du détail `/sessions/:sid` arrive en 23.3. Chip statut : planned=default, active=gold, completed=heal, cancelled=damage.
- **`src/routes.tsx`** — route `/campaigns/:cid/sessions` (avant `/campaigns/:cid` pour ne pas masquer le segment). Lazy, comme les autres écrans campaigns.
- **`src/features/campaigns/campaign-detail-screen.tsx`** — bouton MJ-only « Séances » dans la nav du détail (point d'entrée vers la liste).
- **i18n** — bloc `sessions.*` (FR + EN) + `campaigns.detail.sessionsCta`.
- **Tests** — `__tests__/use-sessions.test.tsx` (5, contrat du hook) + `__tests__/sessions-list-screen.test.tsx` (10, dont identité EXACTE des libellés de statut, gating MJ du CTA, flow create). UAT e2e : `tests/e2e/sessions-list-uat.spec.ts` (captures `uat-review/jalon-23/23.2/`).

**Décisions tactiques 23.2 :**
- Route `/campaigns/:cid/sessions` (cohérence avec le préfixe existant de la feature) au lieu du `/campaign/:id` littéral du plan — jamais réalisé, plus ancien.
- « Description optionnelle » (step 2) non modélisée : pas de champ au schéma documenté (décision 23.1). Repliable sur les notes Markdown de la séance (23.3).
- Liste visible aux membres (rule `isMemberOf || isDMOf` le permet), seul le create est MJ-only — fidèle au texte du step 1 (« DM-only "Planifier" button »).
- ⚠️ **Rule `|| isDMOf` toujours NON déployée** (cf. 23.1) : la liste de séances côté MJ pur crashera en prod tant que `pnpm firebase:deploy:rules` n'a pas tourné. Inerte localement (émulateur OK).

### JALON 23.3 — Écran séance + Notes + Présence (steps 4-6) ✅ livré
Shell SessionScreen 4 onglets + 2 onglets fonctionnels. Triple gate verte (typecheck + 2639 tests dont +18 nouveaux + lint).

- **`src/features/campaigns/use-session.ts`** — hook one-shot + refresh (mirror `useCampaign`) sur `getSession`. Expose `SessionServiceError('session-not-found')` dans `error`.
- **`src/features/campaigns/session-notes-tab.tsx`** — MJ : `<textarea>` + auto-save **debounced 5 s** (`updateSessionNotes`), indicateur Modifié/Enregistrement…/Enregistré/Échec, **flush au démontage** si modifs en attente (refs anti-stale-closure). Membre : lecture seule, `whitespace-pre-wrap`. **Markdown RENDU différé** (dépendance externe = décision Adrien) — stockage Markdown-as-text, zéro perte de données.
- **`src/features/campaigns/session-attendance-tab.tsx`** — MJ : `Checkbox` par entrée du roster (réutilise `buildRoster`), toggle → push liste complète (`setSessionAttendance`) avec rollback optimiste sur erreur. Membre : cases désactivées reflétant l'état.
- **`src/features/campaigns/session-screen.tsx`** — route `/campaigns/:cid/sessions/:sid`, en-tête (n° + titre + chip statut), tablist 4 onglets, `canEdit = isGm`. Events + Journal = `TabPlaceholder`. `key={session.id}` sur les onglets pour ré-init propre au changement de séance.
- **`sessions-list-screen.tsx`** — lignes désormais cliquables (`<button>`) → navigation vers le détail (wiring différé de 23.2).
- **`campaign-detail-screen.tsx`** — export de `RosterEntry` (consommé par l'onglet Présence).
- **`routes.tsx`** — route `/campaigns/:cid/sessions/:sid` (avant `/sessions`).
- **i18n** — bloc `sessions.detail.*` / `sessions.tab.*` / `sessions.notes.*` / `sessions.attendance.*` / placeholders (FR + EN).
- **Tests** — `use-session` (4) + `session-notes-tab` (7, dont debounce 5 s, frappe continue ne sauve que la dernière valeur, flush au démontage, lecture seule) + `session-screen` (7, dont identité du chip statut, gating MJ, toggle présence, lecture seule membre). UAT e2e : `tests/e2e/session-screen-uat.spec.ts` (captures `uat-review/jalon-23/23.3/`).

**Décisions tactiques 23.3 :**
- « Markdown editor + preview » (step 5) : la PARTIE editor + auto-save + stockage Markdown est livrée ; la PARTIE preview (rendu enrichi) est différée faute de dépendance markdown — règle d'autonomie « new external dependency » → décision Adrien. Vue lecture intermédiaire = texte brut avec sauts de ligne préservés.
- Auto-save interprété en **debounce 5 s** (après la dernière frappe) plutôt qu'intervalle fixe : moins d'écritures, pas de write par seconde en frappe continue. Flush au démontage garantit zéro perte.
- Onglet Events = placeholder en 23.3 ; sa lecture (`where sessionId == sid`) est groupée avec le wiring `activeSessionId` en 23.4 (les events ne sont tagués `sessionId` que pendant la séance active).

### JALON 23.4 — Start/End + event-logging + pointeur MJ (steps 8-11 partiel) ✅ livré
Cycle de vie de la séance côté MJ, vérifié bout-en-bout contre l'émulateur. Triple gate verte (typecheck + 2648 tests dont +9 nouveaux + lint) + `pnpm test:rules` 88/88.

- **`event-logger.ts`** — `logSessionStart` / `logSessionEnd` (kind dédié, `actorCharacterId: null`, visibilité `all`, `sessionId` explicite, payload `{ sessionNumber, title }`).
- **`session-screen.tsx`** — boutons MJ-only **Démarrer** (planned) / **Clore** (active). Start : `startSession` → `setActiveCampaign(cid, sid)` (pointeur posé APRÈS succès) → `logSessionStart` → `refresh` ; garde-fou `another-session-active` surfacé (message dédié, pointeur non posé). End : (re)pose le pointeur (robuste au reload) → `endSession` → `logSessionEnd` → libère le pointeur de session → `refresh`.
- **`event-line.ts`** — `summarizeEvent` rend `session-start`/`session-end` (« Séance démarrée/terminée » + titre en détail) au lieu du libellé générique.
- **`firestore.rules`** — **events CREATE élargi `isMemberOf` → `isMemberOf || isDMOf`** (bug trouvé en UAT lifecycle : un MJ pur ne pouvait PAS journaliser ses propres events → `session-start` silencieusement refusé). Même gap/précédent que la lecture 22.3. ⚠️ **Non déployé.**
- **i18n** — `sessions.action.*` (start/end/pending/erreurs) + `eventFeed.kind.sessionStart`/`sessionEnd` (FR + EN).
- **Tests** — event-logger (+3 : start/end payload + no-op hors campagne) ; session-screen (+4 : démarrer pose pointeur+logge, clore libère, garde-fou message, gating MJ) ; event-line (+2 : identité libellés session) ; `firestore-rules` (+1 rouge-avant-vert : MJ pur crée un `session-start`). UAT e2e : `tests/e2e/session-lifecycle-uat.spec.ts` (create→start→clore + events rendus au feed, vérifié contre les vraies rules) → `uat-review/jalon-23/23.4/`.

**Décisions tactiques 23.4 :**
- Rule events CREATE élargie à `|| isDMOf` : strictement dans le périmètre des steps 8-9 (le MJ DOIT pouvoir logguer) et fidèle au commentaire existant de la rule (« DM can log anything ») qui n'avait jamais été implémenté. Couvert par un test rules rouge-avant-vert.
- Pointeur de campagne active posé APRÈS la transition `startSession` réussie (sur échec `another-session-active`, aucun pointeur posé) ; (re)posé au démarrage de `handleEnd` pour rester robuste à un reload mid-séance.

### Reste à livrer (décisions Adrien requises)
1. **Propagation cross-client de `activeSessionId` (step 11 complet) + onglet Events scopé (step 7).** Pour que les events d'un JOUEUR soient tagués `sessionId`, son appareil doit connaître la séance active. En jeu hors-ligne (contrainte « téléphone dans une grotte », cf. CLAUDE.md), la propagation temps-réel Firestore ne marche pas. **Options** : (a) one-shot `getActiveSession` au montage de la fiche du joueur (simple, rate les démarrages en cours de session ouverte) ; (b) `onSnapshot` sur la séance active par client (live mais ne marche pas hors-ligne) ; (c) « rejoindre la séance » manuel côté joueur. L'onglet Events scopé en dépend (et d'un index composite `(sessionId, visibility, createdAt)` à déclarer). **À trancher avec Adrien avant de livrer.**
2. **Rendu Markdown de l'onglet Notes** — dépendance externe (react-markdown ou équiv.). Sans elle, les notes restent en texte brut (fonctionnel, stockage Markdown intact).
3. **e2e multi-user (« players join », step 12)** — nécessite un second compte e2e (même blocage que la promotion MJ de `campaigns-detail-uat`).

## Notes for next plan
- Plan 25 reads sessions + events to compile journal. Le compilateur se branchera dans `endSession` / `logSessionEnd` (le hook est déjà en place ; `journalCompiled` reste `null` jusque-là).
- **⚠️ DEUX changements `firestore.rules` NON déployés à déployer avant prod** (`pnpm firebase:deploy:rules`, après `pnpm test:rules`) : (1) sessions read `|| isDMOf` (23.1) ; (2) events CREATE `|| isDMOf` (23.4). Sans le (2), le MJ ne peut pas démarrer/clore une séance en prod (events refusés). Les deux sont couverts par `tests/firestore-rules.test.ts` (88/88 émulateur).
- 23.4 livre le cycle MJ. Le tagging `sessionId` des events JOUEURS (step 11 complet) + l'onglet Events scopé restent en attente d'une décision d'archi (cf. « Reste à livrer »).
