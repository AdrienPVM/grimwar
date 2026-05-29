# JALON 2A — Inventaire pré-refactor « agnostique-de-source »

**Status** : audit pré-code (2A.1)
**Date** : 2026-05-29
**Owner** : MVP V1 — JALON 2A

> Cet inventaire est le pré-requis du refactor 2A. Il documente l'état actuel
> du chargement de contenu SRD dans `src/`, identifie les call sites à migrer,
> et trace le plan de refactor en sous-tracer-bullets PR.

---

## 1. État de l'architecture

### 1.1 Couche déjà agnostique

`src/shared/lib/content-loader.ts` supporte **déjà** 3 scopes :

- `public` — bundles `public/data/<type>.json` cachés 7j en Dexie, invalidation par `contentHash` (cf. D7 résolue)
- `user` — `users/{uid}/customContent/{type}/*` Firestore, cache 1h
- `campaign` — `campaigns/{cid}/customContent/{type}/*` Firestore, cache 1h

Trois fonctions exposées :

- `loadPublicContent(type)` — public seul
- `loadUserContent(type, userId)` — user seul
- `loadCampaignContent(type, campaignId)` — campaign seul
- `resolveContent(type, id, { scope, scopeId })` — lookup un id précis dans un scope

**Le problème** : la couche est agnostique côté loader, mais **aucun call site applicatif ne consomme les scopes `user`/`campaign`**. Toute la couche UI passe par `useContent(type)` qui appelle `loadPublicContent` en dur.

### 1.2 Hot spot du refactor

- **65 call sites `useContent()`** (cf. § 3.1)
- **2 call sites `resolveContent()`** (inventory)
- **0 hardcoding via `as const` / union type fermé** en code prod
- **1 switch hardcodé par classId** (`weapon-mastery.ts`)

L'absence de listes hardcodées en prod est une **bonne nouvelle structurelle** : le refactor n'a pas à casser des unions de types ou des constantes, juste à étendre le canal d'injection de scope.

---

## 2. Décisions de design

### 2.1 Pattern d'injection : React Context, pas paramètre

**Option A** : étendre la signature `useContent(type, scope?, scopeId?)`. Inconvénient : 65 call sites à toucher, et chaque chooser/step devrait connaître le campaignId courant — couplage fort.

**Option B** : React Context `CampaignContentContext` qui fournit le campaignId courant. `useContent` lit ce contexte en interne. Si `campaignId` présent, le hook charge en parallèle public + campaign et merge ; sinon public seul.

**Décision : Option B**. Justification :
- Zéro modification de signature pour les 65 call sites
- Le contexte vit à la frontière route (`/character/:id` ou `/campaign/:id/...`) — un seul provider à monter
- Le merge SRD + custom est encapsulé dans le hook, invisible côté UI
- Compatible avec le mode « création hors campagne » (pas de context = scope public seul)

### 2.2 Stratégie de merge SRD + custom

Pour cette PR (2A), le merge **n'est PAS implémenté** côté UI — c'est le hook posé en JALON 3. Pour 2A on garantit que :

- L'API `useContent` accepte un campaignId optionnel via Context (rétro-compat : `useContent(type)` actuel reste identique)
- En l'absence de campaignId (= toujours, en V1 jalon 2), le comportement est strictement identique à aujourd'hui — zéro régression
- Le hook expose une discriminant `source: 'srd' | 'custom'` sur chaque entrée pour distinguer à terme dans l'UI (badge « custom » optionnel)
- Le merge concret (réelle fusion des listes) est livré en JALON 3 quand le système `customContent[campaignId]` existe en Firestore

### 2.3 Politique de conflits d'ID (préparé pour JALON 3)

Quand custom et SRD partagent un même `id` (cas : MJ override `wizard`) :
- **Custom wins** pour les listes — la version custom remplace la version SRD
- Le metadata `source: 'custom'` est exposé pour permettre un badge UI
- Les tests d'intégrité référentielle doivent supporter ce cas (à câbler en JALON 3)

Cette politique est documentée ici mais non câblée en 2A — elle borne le scope du JALON 3.

---

## 3. Inventaire des call sites (résultat audit)

### 3.1 `useContent()` — 65 occurrences

**Wizard steps** (10 call sites principaux) :

| Fichier | Type chargé | Étape wizard |
|---|---|---|
| `wizard/steps/ancestry-step.tsx:21` | `ancestries` | Étape ascendance |
| `wizard/steps/class-step.tsx:38` | `classes` | Étape classe |
| `wizard/steps/background-step.tsx:21` | `backgrounds` | Étape historique |
| `wizard/steps/abilities-step.tsx:40` | `classes` | Étape caractéristiques |
| `wizard/steps/skills-step.tsx:44-45` | `classes` + `backgrounds` | Étape compétences |
| `wizard/steps/spells-step.tsx:39-40` | `classes` + `spells` | Étape sorts |
| `wizard/steps/equipment-step.tsx:24-26` | `classes` + `backgrounds` + `items` | Étape équipement |
| `wizard/steps/recap-step.tsx:41-45` | `classes` + `ancestries` + `backgrounds` + `items` + `spells` | Récap final |
| `wizard/wizard-screen.tsx:60` | `classes` | Shell wizard (validation) |

**Wizard sub-choosers** (21 choosers spécialisés) :

| Catégorie | Fichiers | Total |
|---|---|---|
| Ancestry sub-choosers | `dragon-ancestry-chooser`, `elf-lineage-chooser`, `gnome-lineage-chooser`, `goliath-ancestry-chooser`, `tiefling-legacy-chooser`, `ancestry-extra-skill-chooser`, `ancestry-size-chooser`, `ancestry-casting-ability-chooser`, `extra-languages-chooser`, `use-ancestry-sub-choices.ts` | 11 |
| Class sub-choosers | `rogue-expertise-chooser`, `warlock-invocation-chooser`, `pact-of-the-blade-chooser`, `pact-of-the-tome-chooser`, `druid-primal-order-chooser`, `cleric-divine-order-chooser`, `wizard-spellbook-chooser`, `fighter-fighting-style-chooser`, `weapon-mastery-chooser` | 10 |

**Library + Sheet** (4 call sites) :

| Fichier | Type chargé | Usage |
|---|---|---|
| `library/character-card.tsx:25-26` | `classes` + `ancestries` | Badges sur card de personnage |
| `sheet/hero/hero-card.tsx:25-26` | `classes` + `ancestries` | Header de fiche |

### 3.2 `loadPublicContent()` directs (hors tests)

| Fichier | Ligne | Type | Contexte |
|---|---|---|---|
| `shared/lib/content-loader.ts` | 354, 395 | divers | Implémentation interne (`resolveContent` + `searchContent`) |
| `shared/lib/inventory.ts` | 76, 79 | `items` + `magic-items` | Résolution d'objets à l'ajout d'inventaire |
| `features/debug/debug-content.tsx` | 70 | générique | Outil debug — bypass volontaire |
| `shared/hooks/use-content.ts` | 26 | générique | Implémentation interne du hook |

### 3.3 `resolveContent()` — 2 call sites

| Fichier | Ligne | Appel |
|---|---|---|
| `shared/lib/inventory.ts` | 50 | `resolveContent('items', itemId, { scope: 'public' })` |
| `shared/lib/inventory.ts` | 55 | `resolveContent('magic-items', itemId, { scope: 'public' })` |

### 3.4 Hardcoding résiduel

| Fichier | Pattern | Action 2A |
|---|---|---|
| `shared/lib/rules/weapon-mastery.ts:35-57` | `switch(classId)` 6 cas | **Déplacer en data** : ajouter `classes[].weaponMastery` au schéma, supprimer le switch (JALON 2A.5+) |
| Aucune autre constante `as const` en code prod | — | — |

---

## 4. Découpage en tracer-bullets PR

### 2A.1 — Audit (CE PR, doc-only)

Livre ce document.
**Diff stat estimé** : 1 file, +XXX lignes (ce fichier).
**Tests** : aucun, doc-only.
**Branche** : `feat/2A-1-agnostic-source-inventory`.

### 2A.2 — Infrastructure ContentProvider (à venir)

- `src/shared/contexts/campaign-content-context.tsx` — Context React
- `useContent(type)` étendu pour lire le campaignId du Context (rétro-compat 100%)
- En l'absence de Context : comportement actuel inchangé
- Le merge custom + public est posé en stub (pour l'instant retourne toujours public seul, même avec un campaignId — c'est le hook pour JALON 3)
- Tests unitaires :
  - `useContent(type)` sans Context = public seul (parité)
  - `useContent(type)` avec Context sans campaignId = public seul (parité)
  - `useContent(type)` avec Context + campaignId stubbé = public seul (puisque le merge est posé en stub) + assertion structurelle que le campaignId est bien lu

**Critère de non-régression** : tous les tests existants restent verts sans modification.

### 2A.3 — Migration inventory (resolveContent)

- `inventory.ts` lit le campaignId du Context si fourni
- `resolveContent(type, id, { scope: 'campaign', scopeId: campaignId })` est passé en parallèle de public
- Si la résolution custom retourne une entrée, elle override public
- Tests : 2 nouveaux tests (resolve d'un item custom override SRD, fallback SRD si custom absent)

### 2A.4 — Migration choosers/steps (gros chantier)

- Aucun changement de signature côté call sites
- Vérifier en passant que les choosers spécialisés (warlock-invocation, pact-of-the-tome, etc.) consomment bien `useContent(type)` et non un import direct du bundle
- Si certains choosers utilisent une logique conditionnelle "si classe X afficher Y" basée sur un hardcoding, normaliser via un champ data (ex. `class.subChoiceKind: 'invocation' | 'fightingStyle' | ...`)

### 2A.5 — Suppression switch weapon-mastery hardcodé

- Ajouter au schéma `Class` un champ `weaponMastery: { allowed: boolean; count?: number }`
- Migrer le bundle `public/data/classes.json` (path protégé → PR dédiée avec ce point comme critère DoD principal)
- Supprimer le switch
- Tests d'intégrité du bundle

### 2A.6 — Documentation post-refactor

- Compléter ce document avec l'état post-refactor (call sites migrés, hooks finals)
- Mettre à jour `docs/ARCHITECTURE.md` avec le pattern Context + merge

---

## 5. Critère de complétion JALON 2A global

- Tous les sites de hardcoding identifiés à l'audit sont migrés vers le ContentProvider (ou actés comme non-migrables avec justification)
- Tests existants passent (zéro régression côté UI)
- Nouveaux tests unitaires ContentProvider verts
- La structure permet à JALON 3 d'ajouter `customContent[campaignId]` sans toucher au reste du code
- État final documenté dans ce fichier

---

## 6. Décisions UX non couvertes par MVP-V1-SPEC.md

Aucune en 2A.1 — c'est du pur refactor architectural sans surface utilisateur visible. Toute décision d'override (badge custom dans l'UI, alerte de conflit d'ID) est repoussée au JALON 3 et sera documentée dans `MVP-V1-DECISIONS-PRISES.md` à ce moment-là.

---

## 7. Risques identifiés

| Risque | Mitigation |
|---|---|
| Régression silencieuse sur les 65 call sites `useContent()` | Tests existants doivent rester verts sans modification — c'est le gate principal |
| Surface du refactor 2A.5 (weapon-mastery → data) touche `classes.json` (path protégé) | PR dédiée pour 2A.5, séparée de 2A.4 |
| Context React non monté à la frontière route (oubli quand on intégrera campagnes) | Documenter explicitement dans 2A.2 le wiring attendu côté JALON 4 (campagnes) |
| Conflits d'ID custom vs SRD | Politique « custom wins » documentée en § 2.3, à câbler en JALON 3 avec tests dédiés |
