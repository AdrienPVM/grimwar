# Plan 25 — Journal compiler

## Goal
Per-session, transform events into a Markdown narrative auto. Stored in `sessions/{sid}.journalCompiled`. DM can edit (becomes the canonical "final" version, events still source). Available at `/campaign/:id/session/:sid` Journal tab and aggregated at `/campaign/:id/journal`.

## Context
Read `docs/EVENT-LOG.md` (journal compilation section, templates).

## Prerequisites
Plans 22-24.

## Steps
- [x] 1. `src/features/journal/templates/` — one template file per event kind. Exports `(event, context) => string` returning a markdown line in FR. **Livré 25.1.** Décision tactique (autonomie « structure de fichiers dans une feature ») : templates **groupés par domaine** (`rolls.ts`, `character.ts`, `combat.ts`, `lifecycle.ts`) plutôt qu'un fichier par kind (16 fichiers d'1 fonction = bruit), agrégés dans `templates/index.ts` (registre `EVENT_TEMPLATES: Partial<Record<EventKind, JournalTemplate>>` + `renderEventLine`). Signature `(event, ctx: JournalContext) => string | null` (`null` = kind structurel muet OU non templaté).
- [x] 2. Templates handle plural/singular via `tPlural`. Use `localize` for entity names. **Livré 25.1, ADAPTÉ** : `tPlural` n'existe PAS dans le projet (constat audit) — pluriel géré par ternaire sur 2 clés i18n (`…One`/`…Many`), pattern établi (encounters list). `localize` non utilisé directement : la résolution d'identité (perso/sort/objet/état) passe par un **`JournalContext`** injecté (resolvers) pour garder le compilateur PUR/testable sans Firestore ni contenu. Interpolation `{clé}` via helper local `fillTemplate` (le compilateur produit du Markdown, pas du JSX — il ne peut pas composer en fragments React).
- [x] 3. `src/features/journal/compiler.ts` — `compileJournal(events, ctx): string` PUR. Segmente le flux ordonné `createdAt ASC` par `encounterId` (combat = « ## Combat — {nom} » depuis l'`encounter-start`, pied d'issue depuis l'`encounter-end` ; hors-combat = « ## Exploration »). Segments dans l'ORDRE CHRONOLOGIQUE de leur 1ᵉʳ event (alternance exploration/combat fidèle). Sortie Markdown H2 + puces. Repli `journal.empty` si rien à raconter (vide ou tous segments muets). **La query Firestore est sortie du compilateur** → `listSessionEvents` (service, voir ci-dessous) pour garder le compilateur pur.
- [x] 4. Triggered automatically on `session-end` event (Cloud Function listener or client-side at end-session UX). **Livré 25.2, CLIENT-SIDE** : `SessionScreen.handleEnd` appelle `compileSessionJournal` APRÈS `logSessionEnd` (pour que l'event de clôture figure dans la narration), AVANT de libérer le pointeur de session. Best-effort — un échec de compilation ne fait PAS échouer la clôture (le MJ re-compile depuis l'onglet). Pas de Cloud Function (pas d'infra Functions en place ; le client MJ a les droits `update : isDMOf`).
- [x] 5. Stored in `sessions/{sid}.journalCompiled`. **Livré 25.2** : `updateSessionJournal` (service) persiste la chaîne compilée. Champ déjà au schéma `Session` (nullable) — zéro changement de schéma.
- [x] 6. **Manual edit UI**: in the Journal tab, "Editer" toggle → Markdown editor. Saves to `journalCompiled`. **Livré 25.3** : bouton « Éditer » (MJ) → `textarea` Markdown pré-remplie + « Enregistrer » (→ `updateSessionJournal`) / « Annuler ». L'édition devient le snapshot final ; les events restent source de vérité (re-compilable). État optimiste + `onCompiled`.
- [x] 7. "Re-compiler depuis les events" button (DM only) — rewrites `journalCompiled` from scratch (discards manual edits with confirmation). **Livré 25.3** : « Re-compiler depuis les événements » → écran de confirmation INLINE (pas de `confirm()` natif) « Re-compiler le journal ? » avertissant de l'écrasement de l'édition manuelle, boutons « Annuler » / « Re-compiler et écraser ». L'orchestrateur n'est appelé qu'après confirmation.
- [x] 8. **Aggregate view** at `/campaign/:id/journal` — list of all completed sessions with their journal entries, expandable, chronological. "Exporter" button → downloads as `.md` file. **Livré 25.4** : route `/campaigns/:cid/journal` (`<CampaignJournalScreen>`, convention `/campaigns/:cid/...`) — séances `completed` triées par numéro CROISSANT (chronologique), cartes dépliables (`aria-expanded`) rendant `journalCompiled` via `JournalMarkdown` (note « non compilé » si absent). « Exporter (.md) » → `buildJournalExport` (pur) concatène les récits sous le titre de campagne + `journalExportFilename` (slug) → download Blob. Lisible par TOUT membre (bouton « Journal » du détail campagne, hors gate `isGm`).

### Tests
- [x] 9. Unit: each template handles its event correctly. **Livré 25.1** : `templates.test.ts` (22) — VÉRITÉ DU CONTENU (identité exacte de chaque ligne, pas présence) : crit/fumble/normal, dégâts, sort à emplacement vs sort mineur, hp dégâts/soin, états résolus en libellé FR, slot singulier/pluriel, item ×1/×N, turn-start, monster-hp-change, session-start/end, encounter-start/end muets (null), kind non templaté → null, repli acteur « Quelqu'un ».
- [x] 10. Unit: compiler groups events correctly (encounters wrap their sub-events). **Livré 25.1** : `compiler.test.ts` (6) — vide → repli, exploration-only, combat avec pied d'issue, alternance exploration→combat→exploration ordonnée, segment combat muet sauté, tous events muets → repli.
- [x] 11. e2e: run a quick mock session with 5 events, end session, verify journal renders. **Livré 25.2** : `tests/e2e/journal-compiler-uat.spec.ts` seede (Admin SDK) une séance active + 6 events tagués `sessionId` (session-start, encounter-start/turn-start/monster-hp-change/encounter-end, session-end) → onglet Journal → « Compiler » → assertions IDENTITÉ : H2 « Combat — Les gobelins de la crypte », « Issue : victoire. », 2 phases Exploration (start/end bracketent le combat), lignes de séance exactes. Passe par les VRAIES rules (read events all/dm MJ + update session isDMOf). Helpers `seedSession` + `seedCampaignEvent` étendu (`sessionId`/`encounterId`). Galerie `uat-review/jalon-25/25.2/` (01 vide, 02 compilé). Non-régression : 3 specs session e2e vertes.

### Final
- [x] 12. `pnpm typecheck && pnpm test && pnpm lint` — typecheck clean, **2521 fast verts**, lint clean. i18n guard vert. e2e journal 3/3 + non-régression campaigns-detail/sessions verts.
- [x] 13. Commit: `feat(journal): auto-compiler from events (plan 25)` — livré en sous-commits 25.1→25.4.

## Definition of Done
- [x] Journal compiles from events — compilateur pur (25.1) + compilation client à la clôture + bouton MJ (25.2). e2e seed→compile→narration vert.
- [x] DM can edit and re-compile — édition manuelle textarea + re-compilation confirmée (25.3). e2e vert.
- [x] Aggregate view + export works — `/campaigns/:cid/journal` chronologique dépliable + export `.md` (25.4). e2e download `.md` vert.
- [x] Templates in FR for all S2-S3 event kinds — les 16 kinds RÉELLEMENT journalisés (audit logger/diff) ont un template FR (25.1) ; registre `Partial` → les kinds non encore journalisés (level-up, death, xp-gain…) produisent `null` sans crash, à templater quand leur logger arrivera. **Caveat assumé** : « tous les kinds S2-S3 » = tous les kinds ÉCRITS aujourd'hui ; les kinds déclarés mais sans logger sont prêts à recevoir leur template.

## Sous-jalons

### JALON 25.1 — Templates + compilateur (cœur pur) ✅ livré
Fondation logique sans I/O ni UI ni dépendance externe. Couvre les steps 1, 2, 3, 9, 10.

- **`src/features/journal/templates/context.ts`** — `JournalContext` (4 resolvers d'identité injectés : perso / sort / objet / état) + type `JournalTemplate = (event, ctx) => string | null`. Garde le compilateur PUR : aucune lecture Firestore / contenu SRD dans le cœur, tout passe par le contexte fourni par l'appelant (écran, 25.2).
- **`src/features/journal/templates/{fill,payload}.ts`** — `fillTemplate(tpl, vars)` substitue les placeholders `{clé}` des chaînes i18n (interpolation impossible en JSX côté Markdown). `payloadString`/`payloadNumber`/`payloadBool`/`capitalizeSlug` narrowent le `payload: Record<string, unknown>` sans `as` (résiste à un payload partiel/legacy).
- **`src/features/journal/templates/{rolls,character,combat,lifecycle}.ts`** — templates groupés par domaine. Couvrent les 16 kinds RÉELLEMENT journalisés aujourd'hui (audit `event-logger.ts` + `character-diff.ts`) : `roll` (crit/fumble/attaque/dégâts/save/check/death-save/générique), `spell-cast` (sort mineur vs emplacement), `hp-change`/`temp-hp`/`condition-add`/`condition-remove`/`slot-consumed`/`slot-restored`/`item-acquired`/`item-removed`, `turn-start`/`monster-hp-change`, `session-start`/`session-end`. `encounter-start`/`encounter-end` = templates STRUCTURELS (renvoient `null`, consommés par le groupage).
- **`src/features/journal/templates/index.ts`** — registre `EVENT_TEMPLATES` (Partial — les ~24 kinds non encore journalisés n'ont pas d'entrée) + `renderEventLine(event, ctx)` → ligne FR ou `null`. Ajouter un logger pour un kind manquant = ajouter sa clé i18n + son template, sans toucher au compilateur.
- **`src/features/journal/compiler.ts`** — `compileJournal(events, ctx): string` (cf. step 3).
- **`src/shared/lib/services/sessions.ts`** — `listSessionEvents(campaignId, sessionId)` : query CONTRAINTE `where sessionId == sid && visibility in ['all','dm'] orderBy createdAt asc` (le journal = narration MJ, events `self` privés exclus ; query contrainte car la rule filtre par doc, comme le feed MJ 22.3). Parse Zod tolérant (doc invalide ignoré + warn). **Index `(sessionId, visibility, createdAt)` ajouté à `firestore.indexes.json`** (déployé au plan consommateur 25.2). L'index `(sessionId, createdAt)` préexistait.
- **i18n** — bloc `journal.*` (FR + EN, ~45 clés : sections, repli, acteurs de repli, 1 clé par variante de template avec placeholders `{xxx}`). Terminologie officielle FR : « coup critique »/« échec critique », « sort mineur » (= cantrip, PAS « tour de magie »), « emplacement » (spell slot), « Round », « Victoire/Défaite/Fuite ». Garde anti-anglais FR vert.
- **Tests** — `templates.test.ts` (22) + `compiler.test.ts` (6) = **+28 fast (2450 → 2478)**. Triple gate verte (typecheck + 2478 fast + lint). Pas d'e2e/UAT en 25.1 (cœur sans écran) — l'e2e du parcours arrive en 25.2 avec l'écran qui rend `journalCompiled`.

**Décisions tactiques 25.1 :**
- **Templates groupés par domaine** (4 fichiers) plutôt qu'1 fichier/kind (16) — autonomie « structure de fichiers dans une feature », évite 16 fichiers d'une fonction.
- **`JournalContext` injecté** plutôt que lookups async dans le compilateur — compilateur pur, déterministe, testable sans émulateur ni contenu chargé.
- **`fillTemplate` local** pour l'interpolation `{clé}` — `t()` du projet ne fait pas d'interpolation ; le Markdown ne peut pas composer en fragments JSX. Toute la prose reste dans la couche i18n (EN ajouté en S5).
- **Registre PARTIEL** — on ne template QUE les kinds réellement écrits ; un kind futur produit `null` (aucune ligne) plutôt qu'un crash ou de la prose inventée.
- **Query `listSessionEvents` contrainte par visibilité** — `all` + `dm` (la rule rejette une query non contrainte qui toucherait un `self` d'autrui). Index composite déclaré, déployé en 25.2.

### JALON 25.2 — Compilation à la clôture + onglet Journal (rendu) ✅ livré
Branche le compilateur 25.1 sur l'écran de séance : compilation auto à la clôture + bouton MJ, rendu Markdown de la narration. Couvre les steps 4, 5, 11.

- **`src/features/journal/resolve-journal-names.ts`** — `resolveJournalCharacterNames(events, linkedMembers)` : lecture cross-owner ISOLÉE (mirror `resolveInitiativeModifiers`) des `name` des fiches liées citées (ids distincts seulement, 1 lecture/perso). Repli (non lié / fiche absente / name non-chaîne / throw) ⇒ ABSENT de la map → template applique « Quelqu'un ».
- **`src/features/journal/build-journal-context.ts`** — `buildJournalContext(sources)` PUR : assemble les 4 resolvers du `JournalContext` à partir des noms résolus + le contenu chargé (sorts/objets/états → `localize`, repli slug capitalisé). Aucune I/O.
- **`src/features/journal/compile-session-journal.ts`** — orchestrateur : `listSessionEvents` → résolution des noms → `buildJournalContext` → `compileJournal` → `updateSessionJournal`. Renvoie la chaîne (pour l'UI optimiste). Utilisé par la clôture ET le bouton « (Re-)compiler ».
- **`src/features/journal/journal-markdown.tsx`** — renderer Markdown MINIMAL du sous-ensemble émis par le compilateur (H2, puces, `**gras**`, `_italique_`, paragraphes). **DÉCISION (option a) : ZÉRO dépendance externe** — on rend l'arbre React à la main (pas de `dangerouslySetInnerHTML`, pas de react-markdown). Cohérent avec les notes de séance (23.3, pas de dépendance Markdown). Le rendu riche (tables, liens) reste un arbitrage Adrien futur si jamais demandé.
- **`src/features/journal/session-journal-tab.tsx`** — onglet Journal : rend `journalCompiled` via `JournalMarkdown` + hint « source de vérité = events ». MJ : bouton « Compiler » (vide) / « Re-compiler » (existant), état optimiste local + `onCompiled` (refresh parent), gating `pending`, message d'erreur. Joueur : lecture seule, aucun bouton.
- **`src/shared/lib/services/sessions.ts`** — `updateSessionJournal` (persiste `journalCompiled`, rule `update : isDMOf`).
- **`src/features/campaigns/session-screen.tsx`** — câblage : contenu (`spells`/`magic-items`/`conditions`) chargé au niveau écran (caché) ; `linkedMembers` dérivés du roster ; onglet Journal branché ; `handleEnd` compile auto après `logSessionEnd` (best-effort, cf. step 4).
- **i18n** — bloc `sessions.journal.*` (FR + EN, ~8 clés). Réemploi terminologique total (« Compiler », « Journal », « événements ») — zéro nouveau terme D&D.
- **Index** — `(sessionId, visibility, createdAt)` ajouté en 25.1, **toujours NON déployé** (émulateur auto-crée ; prod à déployer en batch avec les rules/indexes 23/24 en attente).
- **Tests** — `build-journal-context.test.ts` (8), `resolve-journal-names.test.ts` (6, firestore mocké : résolution / non-lié / absent / non-chaîne / throw isolé / id distinct 1×), `journal-markdown.test.tsx` (6, sous-ensemble rendu sans fuite de marqueurs), `session-journal-tab.test.tsx` (6, vide joueur/MJ, compile → orchestrateur + rendu + onCompiled, erreur, existant + re-compile, joueur lecture seule). **+26 fast (2478 → 2504).** Triple gate verte. e2e `journal-compiler-uat` vert + non-régression 3 specs session.

**Décisions tactiques 25.2 :**
- **Rendu Markdown maison, zéro dépendance** (option a) — le compilateur n'émet qu'un sous-ensemble strict et connu ; un renderer de 60 lignes suffit, pas de react-markdown. Reste dans l'autonomie (composant interne, pas de nouvelle dépendance → pas de validation Adrien requise).
- **Compilation client-side à la clôture** (pas de Cloud Function) — pas d'infra Functions ; le MJ a les droits. Best-effort : un échec ne casse pas la clôture.
- **Résolution de noms cross-owner réutilise le pattern 24.3** — ids distincts seulement, lectures isolées, repli « Quelqu'un ». Pas de displayName partagé en V1 (constat roster) → certains noms restent non résolus, c'est assumé et truthful.
- **Contenu chargé au niveau écran** (pas dans le tab) — single owner, passé en props au tab ET utilisé par `handleEnd`.

### JALON 25.3 — Édition manuelle + re-compilation confirmée ✅ livré
Couvre les steps 6 (édition) et 7 (re-compile + confirmation). Aucun changement de schéma / rule / index.

- **`src/features/journal/session-journal-tab.tsx`** — mode édition (`draft` non-null) : `textarea` Markdown pré-remplie du journal courant + « Enregistrer » (`updateSessionJournal`, réemploi 25.2) / « Annuler ». Re-compilation derrière une confirmation INLINE (`confirmingRecompile`) avertissant de l'écrasement — l'orchestrateur n'est appelé qu'après « Re-compiler et écraser ». État optimiste local, gating `pending`, messages d'erreur dédiés (compile / save). Joueur : toujours lecture seule.
- **i18n** — bloc `sessions.journal.{edit,editLabel,save,saving,cancel,saveError,editedHint,recompileConfirm*}` (FR + EN). Réemploi terminologique (« Éditer », « Enregistrer », « Annuler ») — zéro nouveau terme D&D.
- **Tests** — `session-journal-tab.test.tsx` étendu (6 → 12) : éditer pré-remplit, enregistrer → `updateSessionJournal` + rendu édité + `onCompiled`, annuler sans écrire, erreur de save ; re-compile demande confirmation AVANT compile, confirmation → compile + écrase, annuler abandonne. **+6 fast (2504 → 2510).** Triple gate verte.
- **UAT e2e** — `tests/e2e/journal-edit-uat.spec.ts` (émulateur) : seed séance avec `journalCompiled` → onglet Journal → éditer (textarea pré-remplie) → enregistrer → prose éditée rendue → « Re-compiler » → écran de confirmation. Galerie `uat-review/jalon-25/25.3/` (01 édition ouverte, 02 enregistrée, 03 confirmation).

**Décisions tactiques 25.3 :**
- **Confirmation INLINE** (pas de `window.confirm`) — cohérent avec le reste de l'app (sélecteur d'issue de combat inline, etc.), testable, stylable.
- **`textarea` brut** pour l'édition Markdown — pas d'éditeur riche (cohérent avec les notes de séance 23.3). Le MJ édite le Markdown source ; le rendu se voit en sortant de l'édition.
- **L'édition écrit `journalCompiled` directement** — c'est le snapshot « passe d'auteur » ; les events restent source de vérité (re-compile écrase).

### JALON 25.4 — Vue agrégée du journal de campagne + export ✅ livré
Dernier sous-jalon de 25. Couvre le step 8. Aucun changement de schéma / rule / index (lit `listSessions`, déjà en place).

- **`src/features/journal/build-journal-export.ts`** — `buildJournalExport(campaignName, sessions, labels)` PUR : concatène les `journalCompiled` sous un H1 campagne + H2 « Séance N — Titre » (note italique si non compilé). `journalExportFilename(name)` : slug NFD (retire diacritiques + ponctuation) + suffixe `-journal.md`, repli `journal`.
- **`src/features/journal/campaign-journal-screen.tsx`** — route `/campaigns/:cid/journal`. Séances `completed` triées par numéro CROISSANT (récit chronologique ; `useSessions` trie décroissant, on inverse). Cartes dépliables (`aria-expanded`, un seul ouvert à la fois) rendant `JournalMarkdown` (note « non compilé » si vide). « Exporter (.md) » → Blob + ancre `download` + `revokeObjectURL`. Empty state si 0 terminée. Erreur + retry. **Lisible par tout membre** (mémoire de campagne).
- **`src/routes.tsx`** — route déclarée AVANT `/campaigns/:cid` (spécificité).
- **`src/features/campaigns/campaign-detail-screen.tsx`** — bouton « Journal » ajouté à la nav, **hors gate `isGm`** (membres + MJ) ; « Séances »/« Rencontres » restent MJ-only.
- **i18n** — `journal.aggregate.*` (~11 clés) + `campaigns.detail.journalCta` (FR + EN). Réemploi terminologique (« Journal », « Séance », « Exporter ») — zéro nouveau terme D&D.
- **Tests** — `build-journal-export.test.ts` (5 : vide, concat ordonné, non-compilé, slug accents/ponctuation, repli), `campaign-journal-screen.test.tsx` (6 : empty, filtre completed + ordre croissant, dépliage rend le journal, non-compilé, export déclenche Blob download, erreur+retry). **+11 fast (2510 → 2521).** Triple gate verte.
- **UAT e2e** — `tests/e2e/journal-aggregate-uat.spec.ts` (émulateur) : seed 2 séances terminées + journaux → bouton « Journal » du détail → liste chronologique → déplier « La crypte oubliée » (récit + issue) → export → Playwright capture le `download`, nom `la-couronne-brisee-journal.md`. Galerie `uat-review/jalon-25/25.4/` (01 liste + export, 02 séance dépliée). Non-régression : campaigns-detail + sessions e2e verts.

**Décisions tactiques 25.4 :**
- **Export client-side Blob** (pas de Cloud Function / endpoint) — `buildJournalExport` pur + `URL.createObjectURL` + ancre `download`. Zéro infra.
- **Journal accessible à tout membre** (bouton hors `isGm`) — c'est la mémoire partagée de la table, pas un écran de gestion. La rule de read sessions (`isMemberOf || isDMOf`) l'autorise déjà.
- **Tri chronologique croissant** (≠ liste séances décroissante) — le journal se LIT du début à la fin de la campagne.
- **`JournalMarkdown` réutilisé** (25.2) pour le rendu des entrées dépliées — un seul renderer pour l'onglet séance ET l'agrégat.

## Notes for next plan
- **PLAN 25 ✅ TERMINÉ** (25.1 compilateur+templates, 25.2 compile+onglet, 25.3 édition+re-compile, 25.4 agrégat+export). DoD cochée.
- **⚠️ Index `(sessionId, visibility, createdAt)` NON déployé** — requis par `listSessionEvents` (25.1). `pnpm firebase:deploy:indexes` AVANT prod. L'agrégat 25.4 n'ajoute PAS d'index (lit `listSessions`, single-field). Batch deploy avec rules/indexes 23/24 en attente.
- **Templates limités aux 16 kinds journalisés** — un futur logger (level-up plan 18, death, xp-gain, note, treasure-drop, dm-edit…) doit ajouter sa clé `journal.tpl.*` + son template + son test. Registre `Partial` = absence sûre (null) en attendant.
- **JALON 25.3 ✅ livré** = édition manuelle (textarea Markdown) + re-compilation confirmée.
- **JALON 25.1 ✅ livré** : compilateur + templates PURS + `listSessionEvents`. Le compilateur ne lit rien — il reçoit `(events, JournalContext)`. L'écran 25.2 fournit les events (`listSessionEvents`) + les resolvers (roster pour les noms, `useContent` pour sorts/objets/états).
- **⚠️ Index `(sessionId, visibility, createdAt)` NON déployé** — ajouté à `firestore.indexes.json`, requis par `listSessionEvents`. **TOUJOURS À DÉPLOYER** (`pnpm firebase:deploy:indexes`) AVANT que l'écran ne consomme la query en prod (sinon failed-precondition). L'émulateur l'auto-crée (e2e OK). S'ajoute aux rules/indexes déjà en attente (plans 23/24) — à déployer en batch.
- **Décision Markdown render TRANCHÉE en 25.2 = option (a)** : renderer maison `JournalMarkdown`, zéro dépendance externe. Pas de react-markdown. Le rendu riche (tables/liens) reste un arbitrage Adrien futur SI demandé.
- **JALON 25.2 ✅ livré** = compilation client à la clôture + onglet Journal (rendu + bouton MJ compiler/re-compiler). 25.3 ajoute l'ÉDITION manuelle du journal compilé (toggle « Éditer » → éditeur Markdown) + confirmation sur « Re-compiler » (écrase l'édition).
- **Templates limités aux 16 kinds journalisés** — quand un plan ajoutera un logger (level-up plan 18, death, xp-gain, note, treasure-drop…), il devra ajouter la clé i18n `journal.tpl.*` + le template + son test. Le registre `Partial` rend l'absence sûre (null) en attendant.
- Plan 26 exposes the DM's editing authority more prominently.
