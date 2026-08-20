# JALON 2A — Inventaire pré-refactor « agnostique-de-source »

**Status** : ✅ JALON 2A complet (2A.1 → 2A.6).
**Owner** : MVP V1 — JALON 2A.
**Dates** : audit 2026-05-29 (2A.1) → doc post-refactor 2026-05-29 (2A.6).

> Cet inventaire est le pré-requis du refactor 2A. Il documente l'état initial
> du chargement de contenu SRD dans `src/`, identifie les call sites à migrer,
> trace le plan de refactor en sous-tracer-bullets PR, et expose **l'état
> post-refactor + le pattern d'usage** pour les sprints suivants (en
> particulier JALON 3 — custom content campagne).

---

## 0. État final (2A.6 — post-refactor)

### 0.1 Ce qui est livré

| Sous-jalon | PR | Livrable |
|---|---|---|
| 2A.1 | #56 | Audit (ce document, première version) |
| 2A.2 | #57 | `CampaignContentContext` + `CampaignContentProvider` + `useCampaignContent` |
| 2A.3 | #58 | `resolveContentMulti(type, id, { campaignId, userId })` + `useContentResolver` |
| 2A.4 | #59 | `use-inventory-derived` consomme `useCampaignContent` + `loadCampaignContent` (campaign-scope items résolus) |
| 2A.5 | #60 | `weaponMasteryEligibility` data-driven (schéma + bundle + helper dispatch) |
| 2A.6 | (ce PR) | Doc post-refactor |

### 0.2 Ce qui N'est PAS livré (volontairement)

Trois call sites restent en `'public'` hardcodé. **C'est légitime**, pas une dette :

1. `src/features/wizard/submit-from-wizard.ts` lignes 262/272 :
   `addItemToInventory(..., 'public', ...)`. Le starting equipment d'un perso
   neuf vient TOUJOURS du SRD — il n'existe pas (en V1) de scénario où un MJ
   définirait du starting equipment custom. À ré-évaluer si JALON 3 ouvre la
   personnalisation du wizard côté MJ.
2. `src/features/sheet/modes/avoir/custom-item-form.tsx` ligne 126 :
   `addItemToInventory(..., 'user', ..., user.uid)`. Le formulaire VIENT
   d'écrire en user scope, le scope est connu localement.
3. `src/features/sheet/modes/avoir/add-item-modal.tsx` ligne 74 : la modale
   browse ne montre QUE du contenu public en V1. L'extension à user/campaign
   est JALON 3 (feature, pas refactor).

### 0.3 Pattern d'usage (cheat-sheet pour JALON 3+)

**Cas 1 — Composant qui résout 1 contenu par id (e.g. modal détail) :**

```tsx
import { useContentResolver } from '@/shared/hooks/use-content-resolver';

function ItemDetail({ itemId }: { itemId: string }) {
  const resolve = useContentResolver();
  useEffect(() => {
    void resolve('items', itemId).then((resolved) => {
      if (!resolved) return; // 404 — pas dans public ni user ni campaign
      // resolved.source ∈ {'campaign', 'user', 'public'} — utile pour badge UI
      // resolved.entity = l'item lui-même
    });
  }, [itemId, resolve]);
  // …
}
```

**Cas 2 — Composant qui itère sur l'inventaire d'un perso (avec scope stocké
sur chaque entrée) :**

```tsx
import { useCampaignContent } from '@/shared/lib/campaign-content-context';
import { loadCampaignContent } from '@/shared/lib/content-loader';

function CharacterInventory({ character }) {
  const { campaignId } = useCampaignContent();
  // Bulk-load des 3 scopes nécessaires (1 fetch par scope, pas N par item)
  // puis dispatch sync sur item.contentScope. Cf. use-inventory-derived.ts
  // pour l'implémentation de référence.
}
```

**Cas 3 — Frontière route à monter le Provider (JALON 4) :**

```tsx
// src/features/campaigns/campaign-route.tsx (futur)
<CampaignContentProvider campaignId={routeParams.cid}>
  <Outlet />
</CampaignContentProvider>
```

Hors campagne (library, /character/:id sans campagne, settings),
**aucun Provider** est monté. `campaignId === null`, le merge custom reste
inerte, comportement public-seul — identique à pré-2A.

### 0.4 Hook pour JALON 3 (custom content campagne)

Pour activer le custom content campagne (= MJ ajoute un item/sort/feat dans
sa campagne via une UI dédiée), il faut :

1. **Écriture** : poser une UI (DM uniquement, vérifié côté `firestore.rules`)
   qui écrit dans `campaigns/{cid}/customContent/{type}/{id}`. Côté Firestore,
   les rules sont DÉJÀ scopées correctement (cf. `firestore.rules`).
2. **Invalidation** : à chaque création/édition côté MJ, appeler
   `invalidateCampaignContent(type, campaignId)` pour flusher le cache Dexie 1h.
3. **Lecture** : le `CampaignContentProvider` à la frontière route fournit
   `campaignId` ; `useContentResolver` et le pattern bulk-load (cas 2 ci-dessus)
   font le reste. **Zéro modification de signature côté call sites
   `useContent(type)` existants** — c'était le critère architectural.
4. **UI badge** : `resolved.source === 'campaign'` permet d'afficher un badge
   « custom » sur les entrées issues du custom content.

### 0.5 Politique de conflits d'ID

Quand `campaignId` + `userId` sont posés ET que `custom` et `srd` partagent
un même `id` (cas typique : MJ override un sort SRD), `resolveContentMulti`
retourne la version `campaign` en premier (priorité **campaign > user > public**).

Cette politique est **câblée et testée en 2A.3**
(`src/shared/lib/__tests__/resolve-content-multi.test.ts`). Les tests
d'intégrité référentielle continueront à passer tant que le custom ne
réfère pas vers du custom inexistant.

---

## 1. État de l'architecture (pré-refactor — pour mémoire)

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

**Le problème (pré-2A)** : la couche est agnostique côté loader, mais **aucun call site applicatif ne consomme les scopes `user`/`campaign`**. Toute la couche UI passait par `useContent(type)` qui appelait `loadPublicContent` en dur. Les inventaires `campaign`-scopés résolvaient à `content: null`. Les éligibilités Weapon Mastery hardcodaient les classIds SRD.

### 1.2 Hot spot du refactor

- **65 call sites `useContent()`** (cf. § 3.1) — aucun migré (signature inchangée, le Provider fait passer le contexte).
- **2 call sites `resolveContent()`** (inventory) — déjà scope-aware via `item.contentScope` ; pas de migration nécessaire.
- **0 hardcoding via `as const` / union type fermé** en code prod.
- **1 switch hardcodé par classId** (`weapon-mastery.ts`) — **migré en 2A.5** (data-driven via `weaponMasteryEligibility`).

L'absence de listes hardcodées en prod était une **bonne nouvelle structurelle** : le refactor n'a pas eu à casser des unions de types ou des constantes, juste à étendre le canal d'injection de scope.

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

### 2.2 Stratégie de merge SRD + custom (livré 2A.3+)

`resolveContentMulti(type, id, { campaignId, userId })` consulte les 3 scopes
dans l'ordre **campaign > user > public** et retourne la première résolution
trouvée, accompagnée de son `source: 'campaign' | 'user' | 'public'`.

Le hook `useContentResolver()` injecte automatiquement le `campaignId` du
Context et le `userId` du store d'auth — les call sites consomment juste
`resolve('items', id)`.

### 2.3 Politique de conflits d'ID

Quand custom et SRD partagent un même `id` (cas : MJ override `wizard`) :
- **Custom wins** pour les listes — la version custom remplace la version SRD
- Le metadata `source: 'custom'` est exposé pour permettre un badge UI
- Les tests d'intégrité référentielle doivent supporter ce cas (à câbler en JALON 3)

Cette politique est documentée ici et **câblée + testée en 2A.3**.

---

## 3. Inventaire des call sites (résultat audit)

### 3.1 `useContent()` — 65 occurrences (signature inchangée post-2A)

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

| Fichier | Ligne | Type | Contexte | État post-2A |
|---|---|---|---|---|
| `shared/lib/content-loader.ts` | 354, 395 | divers | Implémentation interne (`resolveContent` + `searchContent`) | inchangé (impl) |
| `shared/lib/inventory.ts` | 76, 79 | `items` + `magic-items` | Résolution stricte pre-write scope public | inchangé (perf optim légitime) |
| `features/debug/debug-content.tsx` | 70 | générique | Outil debug — bypass volontaire | inchangé |
| `shared/hooks/use-content.ts` | 26 | générique | Implémentation interne du hook | inchangé |

### 3.3 `resolveContent()` — 2 call sites

| Fichier | Ligne | Appel actuel | État post-2A |
|---|---|---|---|
| `shared/lib/inventory.ts` | 50 | `resolveContent('items', itemId, { scope: item.contentScope, scopeId: item.contentSource })` | inchangé (déjà scope-aware via `item.contentScope`) |
| `shared/lib/inventory.ts` | 55 | `resolveContent('magic-items', itemId, { ... })` | inchangé (idem) |

**Note** : l'audit initial 2A.1 indiquait `{ scope: 'public' }` pour ces deux lignes. Lecture en profondeur du module : faux positif — le scope vient de `item.contentScope` (le stockage durable porte sa propre scope). Aucune migration nécessaire au niveau `inventory.ts` ; la migration 2A.4 a porté sur le HOOK consommateur (`use-inventory-derived.ts`) pour activer la résolution campaign-scope sous Provider.

### 3.4 Hardcoding résiduel (état post-2A.5)

| Fichier | Pattern initial | Action 2A | État |
|---|---|---|---|
| `shared/lib/rules/weapon-mastery.ts:35-57` (PRÉ-2A.5) | `switch (classId)` 6 cas | **Déplacé en data** : champ `weaponMasteryEligibility` ajouté au schéma `ClassEntity` + populated par `scripts/extract-srd-classes.ts` ; helper dispatch sur l'enum, plus aucune connaissance des classIds SRD côté code. | ✅ 2A.5 |
| Aucune autre constante `as const` en code prod | — | — | — |

---

## 4. Découpage en tracer-bullets PR — récap final

### 2A.1 — Audit (PR #56, doc-only) ✅

Livre la première version de ce document.

### 2A.2 — Infrastructure CampaignContentContext (PR #57) ✅

- `src/shared/lib/campaign-content-context.tsx` — Context React + Provider + hook
- Behavior par défaut (sans Provider) = `campaignId: null`
- Zéro modification d'API existante

### 2A.3 — resolveContentMulti + useContentResolver (PR #58) ✅

- `src/shared/lib/resolve-content-multi.ts` — primitive multi-scope
- `src/shared/hooks/use-content-resolver.ts` — hook qui injecte `campaignId` + `userId`
- Politique `campaign > user > public` testée

### 2A.4 — Migration use-inventory-derived (PR #59) ✅

- `use-inventory-derived.ts` consomme `useCampaignContent` + `loadCampaignContent`
- Items campaign-scope résolus quand Provider monté (avant : `content: null`)
- Inerte tant que JALON 4 n'a pas monté le Provider → zéro régression V1
- 4 nouveaux tests (hors Provider / sous Provider / garde `hasCampaignItems` / `campaignId: null`)

### 2A.5 — weapon-mastery switch → data-driven (PR #60) ✅

- Schéma `ClassEntity` : `weaponMasteryEligibility?: 'all-proficient' | 'rogue-finesse-light'`
- `superRefine` impose `count > 0 ⇔ eligibility présent`
- `scripts/data/srd-classes-l1.ts` : map déclarative pour les 12 classes SRD
- `scripts/extract-srd-classes.ts` enrichit `public/data/classes.json`
- `weapon-mastery.ts` dispatch sur l'enum, plus aucun classId
- `weapon-mastery-chooser.tsx` + runner matrice mis à jour
- 5 nouveaux tests sur le helper + 1 invariant bundle

### 2A.6 — Documentation post-refactor (CE PR, doc-only) ✅

Complète ce document avec l'état post-refactor et le pattern d'usage pour
JALON 3+.

---

## 5. Critère de complétion JALON 2A global — atteint

- ✅ Tous les sites de hardcoding identifiés à l'audit sont migrés (ou actés comme non-migrables avec justification — cf. § 0.2)
- ✅ Tests existants restent verts (zéro régression côté UI)
- ✅ Nouveaux tests unitaires verts (+9 tests sur 2A.4 + 2A.5)
- ✅ La structure permet à JALON 3 d'ajouter `customContent[campaignId]` sans toucher au reste du code (vérifié : la migration 2A.4 utilise déjà ce pattern, et le hook `useContentResolver` est prêt à être consommé par n'importe quel composant)
- ✅ État final documenté dans ce fichier

---

## 6. Décisions UX non couvertes par MVP-V1-SPEC.md

Aucune en 2A — c'est du pur refactor architectural sans surface utilisateur visible. Toute décision d'override (badge custom dans l'UI, alerte de conflit d'ID) est repoussée au JALON 3 et sera documentée dans `MVP-V1-DECISIONS-PRISES.md` à ce moment-là.

---

## 7. Risques identifiés — bilan

| Risque initial | Mitigation appliquée | État |
|---|---|---|
| Régression silencieuse sur les 65 call sites `useContent()` | Tests existants restent verts sans modification — gate principal | ✅ vérifié |
| Surface du refactor 2A.5 (weapon-mastery → data) touche `classes.json` (path protégé) | PR #60 dédiée avec flow merge-commit, `protected-paths-guard` vert | ✅ vérifié |
| Context React non monté à la frontière route (oubli quand on intégrera campagnes) | Documenté en § 0.3 et § 4 (JALON 4) | ⏳ JALON 4 |
| Conflits d'ID custom vs SRD | Politique « campaign > user > public » câblée + testée en 2A.3 | ✅ câblé, ⏳ exposition UI = JALON 3 |
