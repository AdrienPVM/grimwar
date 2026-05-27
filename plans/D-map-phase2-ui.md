# Plan D — Mode carte phase 2 : UI complet + services Firestore

> Statut : EN COURS. Tracer-bullet **D.1 (services/maps.ts)** livré en premier.
> Suite chantier D phase 1 (PR #22 — schémas + `useMap` read-only listener + rules
> Firestore, data-layer-only) ; phase 2 connecte le prototype `/map-proto`
> (localStorage) à Firestore via une session live `campaigns/{cid}/maps/{mid}`.

## Pourquoi un découpage en tracer-bullets

Le chantier D phase 2 a 3 surfaces hétérogènes :

1. **Service Firestore (write-side)** — pur data, isolable, testable en mock.
2. **UI création/édition carte côté MJ** — formulaires, validation, navigation.
3. **Connexion live du prototype `/map-proto`** au service + temps réel via le
   listener `useMap` posé en phase 1.

Tenter de tout livrer en un seul commit/PR est risqué (surface mixte, tests
unitaires + UI + e2e, validation visuelle). Stratégie : un tracer-bullet par
surface, fusionné chacun indépendamment. Le premier valide le pipeline
contractuel Firestore (chemins, payloads, timestamps) avant d'attaquer l'UI.

## Décisions héritées (chantier D phase 1 — `src/shared/types/map.ts`)

- Storage Firebase **pas dans ce chantier** — image référencée par URL externe
  ou blob URL en mémoire (`MapMeta.imageUrl`).
- Tokens en sous-collection `campaigns/{cid}/maps/{mid}/tokens/{tid}` pour
  borner le coût des writes individuels.
- `fogPolygons[]`, `lightSources[]`, `aoeTemplates[]` inline sur `MapMeta`
  (peu fréquents, granularité tokens inutile).
- Last-write-wins via `updatedAt: serverTimestamp()` ; chaque write force
  aussi `updatedBy: uid`.
- `schemaVersion: 1` sur `MapMeta` (parité avec `Character.schemaVersion`).

## Ordre des tracer-bullets

1. **D.1 — Services Firestore write-side** (`src/shared/lib/services/maps.ts`
   + tests unitaires mockés Firestore) — *ce commit*.
2. **D.2 — `useMaps` listener liste cartes par campagne** (parité avec
   `useMap` single-doc) — préalable à toute UI MJ qui liste les cartes.
3. **D.3 — UI MJ : création + édition d'une carte** (formulaire, validation
   Zod, intégration `createMap` / `updateMap` / `deleteMap`).
4. **D.4 — Connexion `/map-proto` à Firestore live** — route paramétrée
   `/campaigns/:cid/maps/:mid`, listener `useMap` actif, mouvements de
   tokens persistent via `updateToken`. Le mode local `localStorage` reste
   monté sur `/map-proto/local` pour la démo offline.
5. **D.5 — Persistance fog of war + lumière + AoE** — câblage des helpers
   `addFogPolygon` / `addLightSource` / `addAoeTemplate` aux interactions UI
   existantes du prototype.
6. **D.6 — e2e parcours MJ** (création carte → ajout token → déplacement →
   placement AoE → toggle fog), spec dédiée `tests/e2e/map-phase2-uat.spec.ts`.

Chaque tracer livre :
- Code + tests unitaires propres
- Quadruple gate Node 22 verte (`pnpm typecheck && pnpm test && pnpm lint`
  + `pnpm test:e2e` à partir de D.3 quand l'UI est touchée)
- PR draft → CI 5/5 verte → merge-commit → protected-paths-guard vert
- Rapport intermédiaire après merge

## D.1 — Services Firestore write-side (ce commit)

### Périmètre

`src/shared/lib/services/maps.ts` :
- `createMap(campaignId, mapId, input, uid)` — pose `schemaVersion: 1` +
  `createdAt`/`updatedAt: serverTimestamp()` + `updatedBy: uid`.
- `updateMap(campaignId, mapId, patch, uid)` — `updateDoc` partiel
  (préserve `schemaVersion` + `createdAt`, met à jour timestamps).
- `deleteMap(campaignId, mapId)` — `deleteDoc`.
- `createToken(campaignId, mapId, input, uid)` — `addDoc` sur
  sous-collection, retourne l'ID Firestore.
- `updateToken(campaignId, mapId, tokenId, patch, uid)` — typique pour
  déplacement de token (`position: {x, y}`).
- `deleteToken(campaignId, mapId, tokenId)`.
- `addFogPolygon` / `removeFogPolygon` — réécrivent `fogPolygons[]` inline
  via `updateMap`.
- `addLightSource` / `removeLightSource` — idem `lightSources[]`.
- `addAoeTemplate` / `removeAoeTemplate` — idem `aoeTemplates[]`.

### Tests

`src/shared/lib/services/__tests__/maps.test.ts` :
- Mock complet `firebase/firestore` + `@/shared/lib/firebase.getDb`.
- 12 tests qui vérifient pour chaque fonction : chemin Firestore correct,
  appel SDK approprié (`setDoc`/`updateDoc`/`addDoc`/`deleteDoc`),
  payload contient `updatedAt: serverTimestamp()` + `updatedBy: uid`,
  et pour `createMap` : `schemaVersion: 1` + `createdAt`.

Les **rules d'autorisation** (DM-only writes sur `campaigns/{cid}/maps/`)
sont déjà couvertes par `tests/firestore-rules.test.ts` posé en phase 1
contre l'émulateur. Ici on garantit la **signature contractuelle** du
service (chemins + champs systématiques), pas la sécurité.

### Quadruple gate (D.1)

- typecheck ✓
- lint ✓
- test:fast 1294/1294 ✓
- test:matrix 142/142 ✓
- e2e : non requis (data-layer pur, aucune UI touchée — règle CLAUDE.md
  « e2e seulement sur routes / screens / wizard / dice / Sheet »)

### Hors scope D.1 (à D.2+)

- Listener liste de cartes par campagne (`useMaps`)
- Toute UI MJ (formulaires création/édition)
- Migration prototype `/map-proto` localStorage → Firestore live
- Persistance des interactions fog/light/AoE (les helpers existent, mais
  pas encore consommés par l'UI)

## Notes for next plan

- Le service `maps.ts` est testé contre des mocks. Une fois l'UI câblée
  (D.3+), `tests/e2e/map-phase2-uat.spec.ts` devra valider end-to-end
  contre l'émulateur Firebase (path D.6).
- Les rules Firestore phase 1 acceptent déjà tous les writes du service.
  Aucun changement de `firestore.rules` requis pour D.1.
- Les **PROTOTYPE markers** dans `src/features/map-proto/` (état
  localStorage commenté `// PROTOTYPE — pending Adrien arbitration`)
  restent en place jusqu'au tracer D.4 qui les remplacera par la
  connexion live.
