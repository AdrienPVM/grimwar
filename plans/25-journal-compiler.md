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
- [ ] 4. Triggered automatically on `session-end` event (Cloud Function listener or client-side at end-session UX). → **25.2**
- [ ] 5. Stored in `sessions/{sid}.journalCompiled`. → **25.2**
- [ ] 6. **Manual edit UI**: in the Journal tab, "Editer" toggle → Markdown editor. Saves to `journalCompiled`. → **25.3**
- [ ] 7. "Re-compiler depuis les events" button (DM only). → **25.3**
- [ ] 8. **Aggregate view** at `/campaign/:id/journal`. → **25.4**

### Tests
- [x] 9. Unit: each template handles its event correctly. **Livré 25.1** : `templates.test.ts` (22) — VÉRITÉ DU CONTENU (identité exacte de chaque ligne, pas présence) : crit/fumble/normal, dégâts, sort à emplacement vs sort mineur, hp dégâts/soin, états résolus en libellé FR, slot singulier/pluriel, item ×1/×N, turn-start, monster-hp-change, session-start/end, encounter-start/end muets (null), kind non templaté → null, repli acteur « Quelqu'un ».
- [x] 10. Unit: compiler groups events correctly (encounters wrap their sub-events). **Livré 25.1** : `compiler.test.ts` (6) — vide → repli, exploration-only, combat avec pied d'issue, alternance exploration→combat→exploration ordonnée, segment combat muet sauté, tous events muets → repli.
- [ ] 11. e2e: run a quick mock session with 5 events, end session, verify journal renders. → **25.2** (besoin d'un écran qui rend `journalCompiled`).

### Final
- [ ] 12. `pnpm typecheck && pnpm test && pnpm lint`
- [ ] 13. Commit: `feat(journal): auto-compiler from events (plan 25)`

## Definition of Done
- [ ] Journal compiles from events
- [ ] DM can edit and re-compile
- [ ] Aggregate view + export works
- [ ] Templates in FR for all S2-S3 event kinds

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

### JALON 25.2 (à venir) — Compilation à la clôture + onglet Journal (lecture)
Branche `endSession` (ou le wiring UI de clôture) sur `listSessionEvents` + `compileJournal` + persiste dans `journalCompiled`. Rend `journalCompiled` dans l'onglet Journal de l'écran de séance (lecture seule). **POINT DE DÉCISION ADRIEN** : le rendu Markdown (puces, gras, H2) nécessite un renderer. Les notes de séance (23.3) affichent du Markdown brut en `whitespace-pre-wrap` faute de décision sur une dépendance (react-markdown…). 25.2 doit soit (a) rendre en texte préformaté comme les notes (cohérent, zéro dépendance), soit (b) introduire un renderer Markdown léger (nouvelle dépendance → **validation Adrien requise**). Recommandation par défaut : (a) en 25.2, (b) reporté si Adrien veut le rendu riche. Steps 4, 5, 11. **Index `(sessionId, visibility, createdAt)` à déployer ici** (`pnpm firebase:deploy:indexes`).

## Notes for next plan
- **JALON 25.1 ✅ livré** : compilateur + templates PURS + `listSessionEvents`. Le compilateur ne lit rien — il reçoit `(events, JournalContext)`. L'écran 25.2 fournit les events (`listSessionEvents`) + les resolvers (roster pour les noms, `useContent` pour sorts/objets/états).
- **⚠️ Index `(sessionId, visibility, createdAt)` NON déployé** — ajouté à `firestore.indexes.json`, requis par `listSessionEvents`. À déployer en 25.2 (`pnpm firebase:deploy:indexes`) AVANT que l'écran ne consomme la query en prod (sinon failed-precondition). S'ajoute aux rules/indexes déjà en attente (plans 23/24).
- **Décision Markdown render reportée à 25.2** (dépendance externe = validation Adrien). 25.1 produit une chaîne Markdown ; son rendu riche n'est pas tranché.
- **Templates limités aux 16 kinds journalisés** — quand un plan ajoutera un logger (level-up plan 18, death, xp-gain, note, treasure-drop…), il devra ajouter la clé i18n `journal.tpl.*` + le template + son test. Le registre `Partial` rend l'absence sûre (null) en attendant.
- Plan 26 exposes the DM's editing authority more prominently.
