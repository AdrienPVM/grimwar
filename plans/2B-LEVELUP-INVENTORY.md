# JALON 2B — Inventaire pré-code level-up L2→L20

**Status** : pré-code (2B.1)
**Date** : 2026-05-29
**Owner** : MVP V1 — JALON 2B

> Cet inventaire trace l'état actuel du code et de la donnée qui supportent
> la création L1 (wizard) et identifie ce qui doit être ajouté pour piloter
> un level-up L2→L20 strict SRD 5.2.1 sur les 12 classes du bundle.

---

## 1. Surface actuelle (état pré-2B)

### 1.1 Création L1 — couvert par le wizard

`src/features/wizard/` couvre la création complète d'un perso L1 :

- 8 étapes (Identity → Ancestry → Class → Background → Abilities → Skills → Spells → Equipment → Recap)
- Sous-choix de classe L1 portés par `characterClassEntrySchema` (FightingStyle, DivineOrder, PrimalOrder, weaponMasteries[], expertiseSkills[], eldritchInvocations[], wizardSpellbookL1[], pactTomeCantrips[], pactTomeRituals[], pactBladeWeapon)
- Sous-choix d'ancestrie L1 (`ancestrySubChoicesSchema`)
- Submit final par `submit-from-wizard.ts` qui construit un `Character` complet (HP max die, slots = 0, classResources = {}, featureUsage = {}, …)

**Note importante** : `submit-from-wizard.ts:167` contient déjà le commentaire `subclassId: null, // sous-classe choisie au level-up (plan 18)`. Le schéma `subclassId: slug.nullable()` est donc déjà tolérant. Le « plan 18 » mentionné est la sémantique historique du JALON 2B actuel.

### 1.2 Helpers de règles déjà SRD-complets

`src/shared/lib/rules/multiclass.ts` couvre déjà l'arithmétique L1-L20 :

| Helper | Couverture | Notes |
|---|---|---|
| `proficiencyBonus(totalLevel)` | L1-L20 | +2 (L1-4) → +6 (L17-20) |
| `casterLevel(classes)` | L1-L20 | Full / half / third / pact corrects |
| `spellSlotsForCasterLevel(level)` | L1-L20 | `SLOT_TABLE` SRD complet, 9 niveaux de sort |
| `maxHp({classes, primaryClassId, conMod})` | L1-L20 | L1 = max die du primary, levels suivants = moyenne arrondie haute |
| `totalLevel(classes)` | — | Somme des niveaux par classe |

**Conséquence** : la couche math est PRÊTE. L'application d'un level-up n'a pas à recalculer ces tables — elle appelle ces helpers et écrit le résultat dans `character.spellSlots` / `character.ac` / `character.hp.max` / etc.

### 1.3 Données SRD déjà encodées

| Bundle | Couverture L2-L20 | Détail |
|---|---|---|
| `public/data/classes.json` | **Partielle** | 12 classes × 9-22 features chacune, distribuées sur les levels 1-20. Voir tableau § 2.1 ci-dessous pour les gaps. |
| `public/data/subclasses.json` | **Présente** | 12 subclasses (1 par classe — SRD ship une « exemplary subclass » par classe). Features encodées aux levels SRD canoniques (typiquement L3/6/10/14, avec variantes par sous-classe). |
| `public/data/spells.json` | **Présente** | Tous niveaux de sort 0-9 couverts. Pas de changement nécessaire pour 2B. |
| `public/data/feats.json` | **Présente** | 17 feats SRD 2024 incluant les 4 fighting-styles + les feats accessibles à L1+. ASI/feat choosers consommeront cette liste. |
| `public/data/invocations.json` | **Présente** | 28 invocations Warlock avec `prerequisiteWarlockLevel` — déjà gated par niveau, exploitable directement par un L2+ chooser. |

---

## 2. Gaps à combler côté DATA

### 2.1 Features de classe — ASI/Feat manquants

ASI universel SRD 2024 : tout perso pose une Ability Score Improvement (ou un Feat) **aux niveaux 4, 8, 12, 16, 19**. Le Guerrier en pose 2 supplémentaires (6, 14) et le Rôdeur 1 supplémentaire (10).

État actuel du bundle (cf. `jq '.[] | {id, levels: [.features[].level] | unique}'`) :

| Classe | ASI déclarés | ASI manquants (SRD 2024) |
|---|---|---|
| Barbarian | 4 | **8, 12, 16, 19** |
| Bard | 4 | **8, 12, 16, 19** |
| Cleric | 4 | **8, 12, 16, 19** |
| Druid | 4 | **8, 12, 16, 19** |
| Fighter | 4 | **6, 8, 12, 14, 16, 19** |
| Monk | 4 | **8, 12, 16, 19** |
| Paladin | 4 | **8, 12, 16, 19** |
| Ranger | 4 | **8, 10, 12, 16, 19** |
| Rogue | 4 | **8, 10, 12, 16, 19** |
| Sorcerer | 4 | **8, 12, 16, 19** |
| Warlock | 4 | **8, 12, 16, 19** |
| Wizard | 4 | **8, 12, 16, 19** |

**Action 2B.2** : peupler `classes.json` avec les entrées ASI manquantes. Format identique aux entrées L4 existantes (`{ level, name: { fr: "Amélioration de caractéristique", en: "Ability Score Improvement" }, description: …}`).

### 2.2 Features de classe — sous-classe chooser

Pour les 10 classes dont le sub-choice L1 est « domain proxy » ou différé (toutes sauf cleric/druid qui ont leur sub-choice à L1 via `divineOrders` / `primalOrders`), la sous-classe se choisit à **L3**. Le bundle l'indique déjà : chaque classe a une entrée `level: 3` nommée « Sous-classe de X » (cf. fighter L3 « Sous-classe de Guerrier »).

**État** : la donnée est là. Reste à brancher un chooser au level-up qui lit `subclasses.json` filtré par `classId` et écrit dans `character.classes[i].subclassId`.

### 2.3 Resources de classe — progressions par niveau (Rage, Bardic Inspiration, Channel Divinity, Ki, Lay on Hands, etc.)

`character.classResources: Record<string, { current, max, restoresOn }>` existe (schéma OK) mais **aucune table de progression par niveau n'est encodée**. Les valeurs SRD canoniques :

| Resource | Classe | Progression L1-L20 |
|---|---|---|
| `rage` | Barbarian | 2/3/3/3/4/4/4/4/4/4/4/4/4/4/4/4/4/4/4/Unlimited |
| `rage-damage` | Barbarian | +2/+2/+2/+2/+2/+2/+2/+2/+3/+3/+3/+3/+3/+3/+3/+4/+4/+4/+4/+4 |
| `bardic-inspiration` | Bard | PB×/long rest (use Charisma mod uses by L1, swap to PB at L5) |
| `bardic-inspiration-die` | Bard | d6 → d8 (L5) → d10 (L10) → d12 (L15) |
| `channel-divinity` | Cleric | 1× (L1) → 2× (L2) → 3× (L6, swap) |
| `wild-shape` | Druid | 2× short rest |
| `second-wind` | Fighter | 2× (L1) → 3× (L5) → 4× (L10) |
| `action-surge` | Fighter | 1× (L2) → 2× (L17) |
| `martial-arts-die` | Monk | d6 → d8 (L5) → d10 (L11) → d12 (L17) |
| `focus-points` | Monk | level × 1 (ki = focus points en SRD 2024) |
| `lay-on-hands` | Paladin | level × 5 hp pool |
| `channel-oath` | Paladin | 2× short rest (L3+) |
| `sneak-attack-dice` | Rogue | (level+1)/2 d6 (L1=1d6, L3=2d6, L5=3d6, …, L19=10d6) |
| `sorcery-points` | Sorcerer | level (L2+) |
| `pact-magic-slots` | Warlock | 1 (L1) → 2 (L2) → 2 (L11) → 4 (L17) |
| `pact-magic-slot-level` | Warlock | L1 → 2 (L3) → 3 (L5) → 4 (L7) → 5 (L9) |
| `mystic-arcanum` | Warlock | 1 (L11) → 2 (L13) → 3 (L15) → 4 (L17) |
| `arcane-recovery` | Wizard | 1× long rest, slots = ceil(level/2) |

**Action 2B.2** : étendre le schéma `ClassSchema` (content.ts) avec un champ `classResourceProgression?: Record<resourceId, { /* tableau ordonné L1..L20 */ }>`. Format à figer par décision (deux options : array de 20 entrées, ou record `Record<number, value>` clairsemé). Décision : **array de 20 entrées** (compact pour serialize, indexable par `[level-1]`, force la complétude au validateur).

### 2.4 Spell progression — known/prepared/cantrips counts

`character.knownSpells: Record<string, string[]>` et `character.preparedSpells: Record<string, string[]>` existent. La **logique** de combien de sorts on connaît à un niveau donné dépend de la classe :

| Classe | Cantrips | Spells known/prepared |
|---|---|---|
| Bard | 2 → 3 (L4) → 4 (L10) | known : 4 → +N per level (cf. SRD table) |
| Cleric | 3 → 4 (L4) → 5 (L10) | prepared = wis-mod + level (min 1) |
| Druid | 2 → 3 (L4) → 4 (L10) | prepared = wis-mod + level (min 1) |
| Sorcerer | 4 → 5 (L4) → 6 (L10) | known : 2 → +N per level |
| Warlock | 2 → 3 (L4) → 4 (L10) | known : 2 → +N per level (pact magic) |
| Wizard | 3 → 4 (L4) → 5 (L10) | prepared = int-mod + level (grimoire = 6 + 2/level) |
| Paladin | 0 | prepared = (cha-mod + level/2) (à partir de L2) |
| Ranger | 0 (SRD 2024 : aucun cantrip) | known : 2 → +N (à partir de L2) |
| Fighter | 0 | 0 (sauf sous-classes Eldritch Knight) |
| Rogue | 0 | 0 (sauf sous-classes Arcane Trickster) |
| Monk | 0 | 0 |
| Barbarian | 0 | 0 |

**Action 2B.2** : ajouter au `ClassSchema` un champ `spellProgression?: { cantripsKnown: number[20], spellsKnownOrPrepared: number[20] | 'ability-mod-plus-level' | 'ability-mod-plus-half-level' }`. Les classes non-incantatrices laissent le champ vide.

### 2.5 Multi-classing prerequisites (différé V1 jalon 2)

SRD 2024 — Multi-class prerequisites : par exemple Wizard requires INT ≥ 13, Fighter requires STR ≥ 13 OR DEX ≥ 13. Le `MVP-V1-SPEC.md` route le multi-class en **JALON 2D** (après 2B level-up mono-classe + 2C HP/restoration). **Hors scope 2B.** Les prerequisites seront ajoutés au `ClassSchema` au moment de 2D.

---

## 3. Gaps à combler côté CODE

### 3.1 Aucun code level-up existe

`grep -rln "level.*up\|levelUp\|LevelUp" src/` retourne seulement 2 commentaires (« sous-classe choisie au level-up (plan 18) » dans submit-from-wizard.ts, et un commentaire dans spell-slots.ts). **Aucun chemin code n'existe pour incrémenter le niveau d'un perso.**

### 3.2 Architecture cible — composants à créer

| Composant | Localisation | Rôle |
|---|---|---|
| `LevelUpButton` | `src/features/sheet/...` | Bouton « Monter de niveau » visible sur la fiche quand `totalLevel < 20`. Ouvre la modale. |
| `LevelUpModal` | `src/features/levelup/` (nouveau folder) | Wizard de 1-N étapes selon les choix au nouveau niveau : ASI/Feat, sous-classe (L3), feature usage refresh, slot upgrade, spells learned. |
| `useLevelUp` | `src/features/levelup/use-level-up.ts` | Hook orchestrant le state du wizard de level-up + la Zustand action finale. |
| `applyLevelUp` | `src/shared/lib/level-up/apply-level-up.ts` | Fonction pure qui prend `(character, classId, choices) → Character`. Pure pour testabilité — pas d'IO. Le composant Zustand fait le `setDoc`. |
| `levelUpChoices` | `src/shared/lib/level-up/level-up-choices.ts` | Fonction pure qui prend `(character, classId) → { needsAsi: boolean, needsSubclass: boolean, learnsSpells: SpellSlot[], gainsResources: …}` — l'introspection détermine les étapes de la modale. |

### 3.3 Frontière conceptuelle stricte

- **`apply-level-up.ts`** : déterministe, pur, **AUCUNE IO**. Reçoit le perso et l'objet « choix », retourne le perso muté. Testable en isolation. Pas de Firestore, pas de Dexie.
- **`useLevelUp` hook + `LevelUpModal`** : interactif, lit le contenu (via `useContentResolver` / `useContent`), oriente l'utilisateur, agrège les choix.
- **Zustand action / `applyLevelUpAction`** : appelle `apply-level-up.ts` puis persiste via Firestore (`trackPendingWrite(setDoc(...))` — réutilise le pattern offline-safe livré en JALON 1D.3).

### 3.4 Pattern d'agrégation des choix

Le `LevelUpModal` collectionne les choix dans un objet typé `LevelUpDraft` puis appelle `apply-level-up` une seule fois au confirm :

```ts
interface LevelUpDraft {
  classId: string;
  newClassLevel: number;          // ex. 2 si on passe de L1 → L2 sur cette classe
  hpRoll: 'average' | { rolled: number }; // Average HP par défaut, option Roll pour le futur
  asi?:
    | { kind: 'asi'; abilityIncreases: { ability: AbilityCode; bonus: 1 | 2 }[] }
    | { kind: 'feat'; featId: string };
  subclassId?: string;            // requis si newClassLevel === 3 (sauf cleric/druid L1)
  newSpellsKnown?: string[];      // pour Bard/Sorcerer/Warlock (known caster)
  newCantrips?: string[];         // si la classe gagne un cantrip à ce level
  newInvocations?: string[];      // Warlock L2/5/7/9/12/15/18
  asiOrFeatChoice?: 'asi' | 'feat'; // seulement aux levels d'ASI
}
```

### 3.5 Validation Zod

Chaque étape de la modale produit un fragment de `LevelUpDraft` validé par un `LevelUpDraftSchema` partiel. Au confirm final, le draft complet est validé par `LevelUpDraftSchema.parse(...)` (jet hard) — sinon, on remonte une erreur formattée et on ne mute pas le perso.

---

## 4. Découpage 2B en tracer-bullets PR

### 2B.1 — Cet inventaire (doc-only)

Livre ce document. PR direct main (paths plans/ non protégés).
**Branche** : `feat/2B-1-levelup-inventory`.

### 2B.2 — Compléter `classes.json` (data SRD)

- Ajouter ASI/Feat features manquants (cf. § 2.1) pour les 12 classes
- Ajouter `classResourceProgression` (cf. § 2.3)
- Ajouter `spellProgression` (cf. § 2.4)
- Étendre `ClassSchema` (content.ts) pour valider les nouveaux champs
- Tests de fidélité bundle (catégorie 3 du « test-vérité du contenu ») sur 15 entrées de référence figées contre le SRD
- Path protégé `public/data/classes.json` + `scripts/data/srd-classes-l1.ts` → **PR avec merge-commit, pas squash**

### 2B.3 — `apply-level-up.ts` + tests purs

- Fonction pure `applyLevelUp(character, classId, draft) → Character`
- Couvre : HP increment (avg ou rolled), slot recompute (via `spellSlotsForCasterLevel`), feature addition, class resource refresh, ASI ou feat application
- Tests TDD : 1 test par classe SRD × 1 transition (L1→L2 et L3→L4 = ASI pour couvrir le cas Feat) + tests de cas-limites (max-level → no-op, multi-class L1+L1)
- **Pur, hors UI** — peut être livré sans IndexedDB ni Firestore

### 2B.4 — `levelUpChoices.ts` + `LevelUpModal` UI

- Fonction pure d'introspection : « pour cette classe à ce nouveau niveau, quelles étapes la modale doit-elle afficher ? »
- Composant `LevelUpModal` avec FAB sur fiche, wizard 1-N étapes piloté par `levelUpChoices`
- Consommation `useContent('classes' | 'subclasses' | 'feats' | 'spells' | 'invocations')` standard
- e2e Playwright : Fighter L1 → L2 → L3 (sous-classe Champion), Wizard L1 → L4 (ASI), Rogue L1 → L3 (Thief)

### 2B.5 — Wire-up Zustand + persistance Firestore — **LIVRÉ** (PR #73, commit `151e21f`)

- Pas de slice Zustand intermédiaire — pattern « hook bridge » à la place : `useLevelUp(character)` (src/features/level-up/use-level-up.ts) compose `applyLevelUp` (pure, validée Zod) + `useUpdateCharacter` (qui réutilise déjà `trackPendingWrite`)
- Patch partiel envoyé à Firestore (seuls les 10 champs mutés : totalLevel, classes, abilities, hp, hitDice, spellSlots, classResources, knownSpells, preparedSpells, spellcastingAbility) — préserve `createdAt`/`schemaVersion`, économise la bande passante
- `LevelUpButton` : state UI submitting + error gérée localement ; modale grisée pendant l'écriture (`isSubmitting`), erreur Firestore rendue `role="alert"` dans le footer (`submitError`) — retry possible sans fermeture
- Tests unit : 4 boutons + 9 modale + 2 hook (15 total) ; quadruple gate verte (typecheck + 1576 unit + 151 matrix + lint) + emulator CI vert
- Reste pour 2B.6 : e2e Playwright Fighter L1→L3 + Wizard L1→L4 + Rogue L1→L3 + extension matrice wizard

### 2B.6 — Doc post-livraison + checklist couverture

- Mettre à jour ce fichier avec l'état post-2B.2-5
- Étendre la matrice de tests `tests/wizard-matrix/*` avec les nouveaux cas level-up
- Vérifier qu'aucune régression sur les tests existants (UI L1 + sheet + tests SRD)

---

## 5. Critères de complétion JALON 2B

- [ ] Tous les ASI/Feat manquants encodés dans `classes.json` (12 classes × 5-7 levels chacune)
- [ ] `classResourceProgression` complet pour les classes à resources
- [ ] `spellProgression` complet pour les classes incantatrices
- [ ] `applyLevelUp` couvre les 12 classes L1→L20 (au moins 1 test par classe par niveau-clé)
- [ ] `LevelUpModal` opérationnel sur la fiche, e2e vert pour Fighter/Wizard/Rogue (échantillon martial/full caster/skill)
- [ ] Tests référentiels : aucune référence cassée (`tests/content-referential-integrity.test.ts` vert)
- [ ] Pas de régression sur les tests existants (typecheck + lint + unit + matrix + emulator)
- [ ] Multi-class L2+ explicitement déclaré hors scope 2B (cf. JALON 2D)

---

## 6. Décisions UX non couvertes par MVP-V1-SPEC.md

### 6.1 HP au level-up : average vs rolled

**Décision** : **par défaut = average** (HP moyen arrondi haut, exactement ce que fait déjà `maxHp`). Bouton « Lancer le dé » optionnel dans la modale qui pré-remplit le dé via le moteur dés digital ou ouvre la modale physique-roll selon `users/{uid}.settings.diceMode`. La sentinelle reste `average` si l'utilisateur valide sans lancer.

Justification : le mode par défaut SRD 2024 PHB recommande « take average HP rounded up », et toute la base de stats actuelle (`maxHp` helper) l'applique déjà. La valeur rolled est une option, pas un défaut.

### 6.2 ASI ou Feat : choix forcé à chaque niveau d'ASI

**Décision** : à chaque ASI level (4/8/12/16/19), la modale présente un choix radio « ASI (2 points à répartir : +2/+0 ou +1/+1 entre 2 stats) » OU « Feat (parmi `category: 'general'` filtrés par prerequisites) ». Pas de défaut — l'utilisateur doit cocher l'un ou l'autre. Affichage des prérequis du feat clairement gated.

### 6.3 Spell preparation refresh au level-up

**Décision** : si la classe est preparation-based (Cleric, Druid, Paladin, Wizard), le passage à un nouveau niveau réinitialise la liste préparée à `[]`. Une bannière dans la modale prévient « Tu prépares tes sorts au prochain repos long ». Pas de redirection automatique vers le picker.

Justification : SRD 5e a toujours considéré que la préparation se fait au repos long, indépendamment du level-up. Forcer un picker fragiliserait le flow level-up.

### 6.4 Subclass picker à L3 — un seul écran ou un wizard à étapes ?

**Décision** : **un seul écran dans la modale level-up**. La sous-classe est un radio + carte de description (réutilise le pattern `ClassStep` du wizard). Les features de la sous-classe au L3 sont appliquées automatiquement, sans sous-choix supplémentaire (les sous-sous-choix éventuels — ex. Wild Shape forms — restent à L1 du fait de la sous-classe).

Justification : éviter de transformer le level-up en mini-wizard. Si la sous-classe expose des sous-choix (rare en L3 du SRD 5.2.1), ils s'affichent dans la même modale en cards expandables.

### 6.5 Multi-class level-up : sélecteur de classe à monter

**Hors scope 2B** — porté par JALON 2D. La modale 2B suppose `targetClassId === character.primaryClassId` et incrémente la première entrée du tableau `classes[]`. La signature `applyLevelUp(character, classId, draft)` accepte déjà un `classId` paramétré pour ne pas nécessiter de refactor en 2D.

---

## 7. Risques identifiés

| Risque | Mitigation |
|---|---|
| `classes.json` est un path protégé : 2B.2 peut casser le build si un superRefine du schéma rejette les nouveaux champs | Tests sur le bundle DANS la même PR ; merge-commit obligatoire |
| Les progressions de resources sont SRD 2024 (et non 2014) — risque de mémoriser la mauvaise édition | Vérification croisée systématique contre `content-sources/extracted/raw/SRD_CC_v5.2.1.txt` (EN, source primaire) + sample sur PDF FR pour la rédaction |
| Un level-up cassé peut corrompre une fiche utilisateur en prod | `applyLevelUp` est pur — tests TDD lourds avant tout wiring à Firestore. Roll-back côté UI = annulation simple. |
| Le merge avec `useInventoryDerived` (déjà câblé pour la résolution multi-scope) peut surprendre si les classes custom JALON 3 modifient les features | Hors scope 2B (custom content = JALON 3). Le schéma `ClassSchema` reste étendu de façon retrocompatible. |
| 12 classes × ~5 transitions de niveau = 60+ cas à couvrir aux tests | Découpage en lots : 1 PR 2B.3 par 3-4 classes, pour ne pas livrer 60 tests en une seule PR. |

---

## 8. Hors scope 2B (explicite)

- **Multi-classing L2+** → JALON 2D
- **3 méthodes de génération de stats** (Standard Array, Point Buy, Roll 4d6) → JALON 2E
- **Custom content campagne** (classes/sous-classes/feats homebrew) → JALON 3
- **Subclasses additionnelles** (le bundle SRD ne ship qu'1 subclass par classe — l'extension à 3+ subclasses par classe sortira soit du custom content soit d'un sprint d'enrichissement bundle post-V1)
- **3D dice au moment du roll HP** → S5

---

## 9. État final post-2B.6 (clôture JALON 2B)

JALON 2B est livré dans son intégralité — 11 sous-PRs mergées entre le
2026-05-29 (PR #67) et le 2026-05-30 (PR #79). Architecture finale stable :

### Couche pure (transformations & validation)

| Module | Rôle | Test |
|---|---|---|
| `src/shared/lib/level-up/level-up-types.ts` | `LevelUpDraft` + Zod schema | `level-up-types.test.ts` |
| `src/shared/lib/level-up/apply-level-up.ts` | `applyLevelUp(character, draft, classDefinitions) → Character` (pure) | `apply-level-up.test.ts` × 12 classes |
| `src/shared/lib/level-up/level-up-choices.ts` | `levelUpChoices(…) → LevelUpStep[]` (introspection) | `level-up-choices.test.ts` |
| `src/shared/lib/level-up/level-up-flow.ts` | reducer du wizard step-par-step + `buildLevelUpDraft` | `level-up-flow.test.ts` |

### Couche UI

| Composant | Rôle |
|---|---|
| `src/features/level-up/use-level-up.ts` | hook bridge `applyLevelUp` + `useUpdateCharacter` (patch partiel Firestore) |
| `src/features/level-up/level-up-modal.tsx` | wizard 1-N étapes — consomme `useContent` pour les pickers SRD |
| `src/features/level-up/level-up-button.tsx` | FAB hero-card + state submitting/error |

### Couverture de tests (post-2B.6)

- **Unitaires (vitest)** : 1599 tests verts, dont 17 dédiés level-up.
- **Matrice level-up (`tests/wizard-matrix/level-up-matrix.test.ts`)** : 4 pins
  Fighter L1→L4 + Wizard L1→L4 + Rogue L1→L3, plus 1 cas-limite « L3 sans
  subclassId → throw ». Vérifie les RÉSULTATS CHIFFRÉS (HP max, abilities,
  subclassId, spell slots SLOT_TABLE, hit dice pool) contre les formules SRD.
- **e2e Playwright** :
  - `tests/e2e/level-up-fighter.spec.ts` — L1→L4 martial complet (HP +
    Champion + ASI FOR + reload persist).
  - `tests/e2e/level-up-wizard.spec.ts` — L1→L4 full caster (HP + sorts +
    cantrips + Évocateur + ASI INT via picker explicite).
  - `tests/e2e/level-up-rogue.spec.ts` — L1→L3 skill (HP + Voleur + survie
    des sous-choix L1 `expertiseSkills` après patch partiel).
- **Garde-fous bundle** : `srd-counters.test.ts` confirme la couverture
  ASI/Feat par classe (12 × 5-7 niveaux d'ASI), `srd-reference-entries.test.ts`
  pinne les features Champion + Évocateur + Voleur à leur level canonique.

### Bénéfice JALON 2A (refactor source-agnostic) déjà actif

`applyLevelUp` et `levelUpChoices` consomment un `classDefinitions: Record<string, ClassEntity>`
construit par `useContent('classes')` → la résolution est multi-scope
(`public/data` + custom content campagne) côté `content-loader.ts`. Une
classe homebrew JALON 3 chargée en `customContent['classes']` apparaîtra
automatiquement dans le LevelUpModal sans modification du moteur — c'est
exactement le bénéfice promis par le refactor 2A.

### Fix collatéral — modale state-reset entre ouvertures

Acté pendant 2B.6a (PR #77) : le `useReducer(levelUpFlowReducer)` à
l'intérieur de `LevelUpModal` ne reset PAS quand `open` repasse de
`false` à `true` (le composant reste monté, juste DetailModal retourne
null). Sans fix, une seconde ouverture héritait du `stepIdx` du
level-up précédent. Fix : `{open && <LevelUpModal />}` côté
`LevelUpButton` — la modale unmount à la fermeture, le reducer
ré-initialise à chaque ouverture.

### Décisions UX intégrées (cf. § 6 + `plans/MVP-V1-DECISIONS-PRISES.md`)

- HP par défaut = **moyenne** SRD. Bouton « Lancer le dé » bypass-able.
- À chaque ASI level : choix radio **ASI** (somme=2, validée par
  superRefine 2C.1) OU **Feat** (catégorie `general` aux L4/8/12/16,
  catégorie `epic-boon` au L19 — détection 2C.2/2C.3).
- Sous-classe choisie à L3, un seul écran (pas de wizard imbriqué).
- Spell preparation : la liste préparée se reset à `[]` au level-up — la
  bannière prévient « repos long pour préparer ».

### Reste à faire en JALON 2 (post-2B)

- **JALON 2C** : durcir les `prerequisites` des feats à structure typée
  (Fighting Style, STR 13+, etc.) — actuellement champ string FR libre
  côté `feats.json`. 2C.1-3 ont durci l'ASI et l'Epic Boon ; 2C.4
  porterait `computeFeatAvailability(character, feat)` + gating UI.
- **JALON 2D** : multiclassing avec slot table multi-class SRD.
- **JALON 2E** : 3 méthodes de génération de stats (point buy /
  4d6 / standard array) au wizard de création.

Tout test de level-up futur (nouvelles classes custom, scenarios
multi-class, etc.) étend `tests/wizard-matrix/level-up-matrix.test.ts`
selon le pattern ci-dessus : `applyChain(start, drafts[])` puis pins
chiffrés contre la formule SRD.
