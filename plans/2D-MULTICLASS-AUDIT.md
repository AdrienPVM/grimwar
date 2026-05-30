# JALON 2D — Multiclassing (audit + découpage PR)

> **Statut** : ✅ JALON 2D LIVRÉ (clôture 2026-05-31). 2D.1 audit (PR direct main) → 2D.2 data SRD 2024 (PR #84) → 2D.3 rules + applyLevelUp add-class (PR #85) → 2D.4a data layer L1 sub-choices (PR #86) → 2D.4b reducer/builder add-class (PR #87) → 2D.4c UI complète (PR #88) → 2D.5 matrix pins + clôture (PR #89, ce commit). UAT navigateur Adrien restera à valider sensoriellement le picker + sub-choosers avant clôture absolue.
> **Périmètre V1** : SRD 2024 multiclassing — prérequis par classe, ajout d'une nouvelle classe via level-up, sous-ensemble de proficiencies, table de spell slots unifiée. Cf. décision LOCKED `CLAUDE.md > Multi-classing` et SPEC `plans/MVP-V1-SPEC.md > Levelling V1`.
> **Auditeur** : Claude session du 2026-05-30. État de référence : `main` à `36ca29e` (post JALON 2C-feat-5).

---

## Pourquoi ce doc

Le brief initial (`prompt` de la session) estimait JALON 2D à ~1 semaine / 5 sous-PR avec un **refactor du schéma `Character` pour supporter `classLevels[]`**. L'audit révèle que **ce refactor est déjà fait depuis le S1** : le schéma `Character` porte `classes[]` (max 4 entrées), `totalLevel` dénormalisé, `primaryClassId`. La table SRD de slots unifiés + le calcul HP multi-class existent déjà. La dette réelle est plus étroite : **règles d'éligibilité, path "ajouter une classe" dans `applyLevelUp`/UI, proficiencies subset SRD, tests**.

Ce doc remet la base à jour avant d'attaquer.

---

## Ce qui existe (à NE PAS refaire)

### Schéma `Character` — multi-class natif
- `src/shared/types/character.ts:244` — `classes: z.array(characterClassEntrySchema).min(1).max(4)`
- `src/shared/types/character.ts:245` — `totalLevel: z.number().int().min(1).max(20)`
- `src/shared/types/character.ts:246` — `primaryClassId: slug` (référence la classe qui donne le HP max au L1)
- `CharacterClassEntry` porte tous les sous-choix par-classe (subclass, fightingStyle, weaponMasteries, expertiseSkills, eldritchInvocations, wizardSpellbookL1, pactTome*, pactBladeWeapon).
- Migration V1→V2 idempotente : `src/features/sheet/upgrade-character-v1-to-v2.ts` — déjà appelée lazy à l'ouverture de fiche, préserve la structure multi-class par classe.

### Règles SRD multi-class — `src/shared/lib/rules/multiclass.ts`
- `proficiencyBonus(totalLevel)` — table SRD.
- `totalLevel(classes)` — somme des niveaux.
- `casterLevel(classes)` — calcul du **niveau d'incantateur unifié** (full → +N, half → +floor(N/2), third → +floor(N/3), pact exclu).
- `spellSlotsForCasterLevel(level)` — table SRD complète niveaux 1-20.
- `maxHp({ classes, primaryClassId, conMod })` — primary class reçoit le dé max au L1, les autres niveaux (et toute classe secondaire) reçoivent l'avg arrondi haut + CON mod.

### `applyLevelUp` — gère le LEVEL UP d'une classe existante
- `src/shared/lib/level-up/apply-level-up.ts:74` — `applyLevelUp({ character, draft, classDefinitions })`.
- Recomputation multi-class native : `casterEntries` itère sur **toutes** les classes du perso pour recalculer les emplacements unifiés (lignes 132-156).
- Plafond SRD 20 strict (ligne 82).
- HP : prend le `targetDef.hitDie` de la classe levée + CON mod (avg ou rolled).
- Test multi-class existant : `apply-level-up.test.ts:1059` couvre le cap L20 (Fighter 19 + Wizard 1 → tentative L21 refusée).

### `levelUpDraftSchema` — port d'un level-up
- `src/shared/lib/level-up/level-up-types.ts:95` — `newClassLevel: z.number().int().min(2).max(20)`.
- **Limitation** : `min(2)` interdit `newClassLevel === 1` — c'est-à-dire **interdit d'AJOUTER une nouvelle classe**. Voir gap #2 ci-dessous.

### UI level-up
- `src/features/level-up/use-level-up.ts` — bridge UI ↔ Firestore.
- `src/features/level-up/level-up-modal.tsx` — modale L2→L20 sur la classe actuelle.
- e2e : `tests/e2e/level-up-fighter.spec.ts`, `level-up-wizard.spec.ts`, `level-up-rogue.spec.ts` (livrés 2B.6a/2B.6b).
- matrix pins : `tests/wizard-matrix/level-up-matrix.test.ts` (livré 2B.6c).

---

## Ce qui MANQUE pour JALON 2D

### Gap 1 — Prérequis SRD 2024 par classe (`multiclassPrerequisite`)
Le SRD 2024 (PHB 2024 « Multiclassing ») impose un minimum de score d'aptitude par classe pour multiclasser **dans cette classe**. Table SRD 2024 :

| Classe | Prérequis SRD 2024 |
|---|---|
| Barbare | FOR 13 |
| Barde | CHA 13 |
| Clerc | SAG 13 |
| Druide | SAG 13 |
| Ensorceleur | CHA 13 |
| Guerrier | FOR 13 OU DEX 13 |
| Magicien | INT 13 |
| Moine | DEX 13 ET SAG 13 |
| Occultiste (Warlock) | CHA 13 |
| Paladin | FOR 13 ET CHA 13 |
| Rôdeur | DEX 13 ET SAG 13 |
| Roublard | DEX 13 |

**Source primaire** : `content-sources/extracted/raw/FR_SRD_CC_v5.2.1.txt` (à vérifier au moment du peuplement — politique LOCKED CLAUDE.md).

**Surface impactée** :
- `src/shared/types/content.ts > classSchema` — ajouter `multiclassPrerequisite: MulticlassPrerequisite | null`.
- `scripts/data/srd-classes-l1.ts` — peupler la valeur pour les 12 classes.
- `public/data/classes.json` (path protégé) — re-extraction.

### Gap 2 — Path "ajouter une nouvelle classe" dans `levelUpDraftSchema` + `applyLevelUp`
Actuellement :
- `levelUpDraftSchema.newClassLevel` est `min(2)`. Impossible d'avoir un draft avec `newClassLevel === 1` (= ajout d'une classe).
- `applyLevelUp` ligne 89 : `findIndex` sur classId existant → throw si absent.

À faire :
- Étendre `levelUpDraftSchema` : autoriser `newClassLevel === 1` quand `classId` est ABSENT de `character.classes[]`.
- Étendre `applyLevelUp` : si classId absent ET `newClassLevel === 1`, append une nouvelle entrée `CharacterClassEntry` (sentinelles vides via `createEmptyClassSubChoices()`) au lieu de throw.
- Recomputation HP : le nouveau-add gagne `HIT_DIE_AVG[die] + conMod` (pas le dé max — réservé à `primaryClassId`).
- Recomputation hit dice pool : append `{ classId, die, max: 1, current: 1 }` au tableau.
- Garde-fou : refus si `character.classes.length >= 4` (borne du schéma).
- Garde-fou : refus si la classe ajoutée a un `multiclassPrerequisite` non satisfait par les `character.abilities` (cf. gap #1).

### Gap 3 — Helper `computeMulticlassEligibility(character, targetClassId, classDefinitions)`
Helper pur, similaire à `computeFeatAvailability` (livré JALON 2C-feat-3). Retourne :
```ts
type Eligibility =
  | { available: true }
  | { available: false; unmetPrerequisites: FeatPrerequisite[] };
```
Réutilise le `discriminatedUnion` `FeatPrerequisite` (kind `ability-score`) — pas besoin d'un type dédié, le SRD 2024 n'utilise QUE des prérequis de score d'aptitude pour le multiclassing.

À placer dans `src/shared/lib/rules/multiclass-eligibility.ts` (séparé de `multiclass.ts` qui reste pur "slots/HP/PB").

### Gap 4 — Proficiencies subset au multiclassing
SRD 2024 : quand on multiclasse, on ne reçoit qu'un **sous-ensemble** des proficiencies L1 de la classe ajoutée. Exemple Fighter multiclass → **Light armor + Medium armor + Shields + Martial weapons** (PAS les jets de sauvegarde, PAS les compétences au choix). Table SRD complète :

| Classe ajoutée | Proficiencies au multiclass |
|---|---|
| Barbare | Boucliers + armes martiales |
| Barde | 1 instrument de musique au choix + armure légère |
| Clerc | Armure légère + armure intermédiaire + boucliers |
| Druide | (aucune) |
| Ensorceleur | (aucune) |
| Guerrier | Armure légère + armure intermédiaire + boucliers + armes martiales |
| Magicien | (aucune) |
| Moine | (aucune) |
| Occultiste | Armure légère |
| Paladin | Armure légère + armure intermédiaire + boucliers |
| Rôdeur | Armure légère + armure intermédiaire + boucliers + armes martiales |
| Roublard | Armure légère + outils de voleur |

**Surface impactée** :
- `src/shared/types/content.ts > classSchema` — ajouter `multiclassProficiencies: { armor: string[], weapons: string[], tools: string[] }`.
- `scripts/data/srd-classes-l1.ts` — peuplement.
- `public/data/classes.json` (path protégé).
- `applyLevelUp` add-new-class path : appliquer `extraProficiencies` quand nouvelle classe ajoutée.

### Gap 5 — UI `LevelUpModal` path "ajouter une nouvelle classe"
- Étape supplémentaire AU DÉBUT de la modale : « Lever ma classe actuelle » (path actuel) vs « Ajouter une nouvelle classe ».
- Si « ajouter » : liste des classes éligibles (filtrées via `computeMulticlassEligibility`), classes non éligibles grisées avec tooltip raison (réutilise pattern `FeatPicker` livré 2C-feat-4).
- Si une classe est sélectionnée : sub-choosers L1 de cette nouvelle classe (divineOrder/fightingStyle/etc. selon SRD — la sous-classe à proprement parler attend L3 de cette classe).
- HP : forcer `hpRoll.kind === 'rolled'` à `HIT_DIE_AVG[die]` (impossible de tirer le dé max — réservé au L1 de la `primaryClassId`).

### Gap 6 — Tests e2e + matrix pins multi-class
- e2e : Fighter L3 → ajout Wizard L1 → vérifier slots L1 = 1, INT trouvé sur la fiche, hit dice pool = `[{ fighter, max:3 }, { wizard, max:1 }]`.
- e2e : Paladin L2 (CHA 12) → tentative +Bard bloquée car CHA <13.
- matrix pin : 2-3 combos SRD reference (Fighter/Wizard, Paladin/Sorcerer, etc.) avec slots unifiés vérifiés.

---

## Découpage PR final

Compte tenu de l'audit, le périmètre se réduit. **5 PR au lieu des 5 du brief, mais redistribuées** :

| Sous-PR | Statut | Périmètre | Path | Flow |
|---|---|---|---|---|
| **2D.1** | ✅ commit `b3093fb` | Cet audit (doc-only) | `plans/2D-MULTICLASS-AUDIT.md` | direct main (non protégé) |
| **2D.2** | ✅ PR #84 → `386ee79` | Schéma `ClassEntity` étendu (`multiclassPrerequisite` + `multiclassProficiencies`) + peuplement 12 classes via `scripts/data/srd-classes-l1.ts` + re-extraction `public/data/classes.json` + tests cat. 3 pin (3 classes représentatives) | `src/shared/types/content.ts`, `scripts/data/srd-classes-l1.ts`, `public/data/classes.json` (protégé) | **PR merge-commit** (path protégé) |
| **2D.3** | ✅ PR #85 → `5c1fdcc` | Helper `computeMulticlassEligibility` pur + TDD 12 classes + extension `applyLevelUp` add-new-class path + extension `levelUpDraftSchema` + TDD | `src/shared/lib/rules/multiclass-eligibility.ts`, `src/shared/lib/level-up/apply-level-up.ts`, `level-up-types.ts` + tests | PR squash |
| **2D.4a** | ✅ PR #86 → `4026654` | Schéma `addClassSubChoices` sur le level-up draft + relocate `use-class-sub-choices.ts` → `src/shared/lib/rules/class-l1-sub-choices.ts` + helpers add-class (`getAddClassL1SubChoiceKeys`, `getMissingAddClassL1SubChoiceKeys`) + 45 tests pin SRD 2024 | `src/shared/lib/rules/class-l1-sub-choices.ts` (nouveau), `level-up-types.ts`, 9 wizard imports | PR squash |
| **2D.4b** | ✅ PR #87 → `3cb8b78` | Reducer + flow extension : `LevelUpFlowState.mode/addClassTargetId/addClassSubChoices`, actions `set-mode/set-add-class-target/patch-add-class-sub-choices`, branche add-class de `buildLevelUpDraft` (force `hpRoll=average`, omet les vides via `cleanAddClassSubChoices`), `canSubmitFlow` reçoit `classes` pour validation L1 | `src/shared/lib/level-up/level-up-flow.ts`, `level-up-choices.ts`, stubs modal | PR squash |
| **2D.4c** | ✅ PR #88 → `25bdf8e` | UI complète : `LevelUpButton` 2 entrées (Monter / Ajouter une classe), `LevelUpModal.initialMode`, `AddClassPickerStep` (grille 12 classes grisées via `computeMulticlassEligibility`), `AddClassSubChoicesStep` (renderer pivot sur `getAddClassL1SubChoiceKeys` — RadioRow + Weapon/Expertise/Invocation/Spellbook/Pact rows), `useLevelUp` étendu (PATCHED_KEYS + classDefinitions de la classe ajoutée) | `src/features/level-up/*.tsx`, `add-class-steps.tsx` (nouveau) | PR squash |
| **2D.5** | ✅ PR #89 (ce commit) | Matrix pins multi-class (3 tests : Fighter+Wizard slots unifiés, Paladin add Bard bloqué CHA, borne 4 classes) + e2e spec `level-up-multiclass.spec.ts` (2 tests : Fighter L3 → +Wizard L1 succès + persistance Firestore ; Paladin CHA 12 → Bard grisé avec raison `CHA 12/13`) + 2 presets seed (`fighterL3MulticlassReady`, `paladinL1MulticlassBlocked`) + doc clôture 2D. **e2e + UAT navigateur** restent à exécuter hors-CI (Java/JRE requis pour émulateur). | `tests/wizard-matrix/level-up-matrix.test.ts`, `tests/e2e/level-up-multiclass.spec.ts`, `tests/e2e/seed-character.ts`, `plans/2D-MULTICLASS-AUDIT.md` | PR squash |

**Estimation révisée** : 3-4 jours (le gros du chantier — refactor schéma + slots unifiés — était déjà fait au S1). **Tenu sur 1 session intensive du 2026-05-30 → 2026-05-31** (autonomous mode, 6 PR mergés en chaîne tracer-bullet).

---

## Décisions LOCKED par cet audit

1. **`computeMulticlassEligibility` partage le type `FeatPrerequisite`** plutôt que d'inventer un type dédié. Le SRD 2024 multiclassing n'utilise QUE des prérequis `ability-score` ; partager le type évite la duplication helper et le test cat. 3 réutilise les mêmes pins.
2. **HP au multiclass-add ne peut PAS être "rolled" dé max** — réservé strictement à la `primaryClassId` au L1. Pour toute classe ajoutée : forcer `hpRoll = { kind: 'average' }` ou `{ kind: 'rolled', rolled: avg }`. Évite le "splash 1 niveau dans Wizard pour avoir 1d6 max" qui contredit la règle SRD `maxHp({ primaryClassId })`.
3. **Garde-fou borne haute** : `character.classes.length >= 4` → refus dur (cf. schéma `min(1).max(4)`). Décidé désormais aux deux étages (`applyLevelUp` ET UI grisage).
4. **Migration V1 vers multi-class effective : aucun changement** — la migration V1→V2 préserve déjà `classes[]`. Pas de "auto-migration mono-class → multi-class[primary]" requise (jamais eu de schéma mono-class).
5. **Sous-classe d'une classe ajoutée** : pas spéciale. Même règle que pour la classe principale — chooser à `newClassLevel === 3` de CETTE classe, pas au L1 de l'ajout.

---

## Hors scope 2D (différé V1.1 ou V2)

- **Multiclass spell slots non-unifié** (cas hyper rare) : la table `spellSlotsForCasterLevel` est correcte pour tous les cas standards.
- **Pact Magic + slots normaux** : Warlock a SES slots propres (`classResourceProgression > pact-magic-slots`). Pas re-fusionnés avec la table unifiée. Le code actuel l'ignore déjà correctement (`progression: 'pact'` exclu de `casterLevel`).
- **Respec / retrait d'une classe** : MJ-only, hors 2D, sera traité côté JALON 4 (Mode MJ).
- **Recommandations UX "tu devrais multiclasser dans X"** : pas en V1.
