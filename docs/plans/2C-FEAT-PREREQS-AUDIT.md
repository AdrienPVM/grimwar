# JALON 2C — Feat prerequisites Zod-hard (audit)

**Statut** : ✅ **CLOS 2026-05-30** — les 4 sous-PR sont livrées et mergées sur `main`.
**Date audit** : 2026-05-30.
**Périmètre** : `public/data/feats.json` (17 feats SRD 5.2.1 bundlés au repo).

## Livraison

| PR | Commit | Statut |
|---|---|---|
| 2C-feat-1 (audit) | `4859db7` | ✅ livré |
| 2C-feat-2 (schéma Zod + peuplement `prerequisites[]` + pin SRD) | `3cc61d3` (merge PR #80) | ✅ livré |
| 2C-feat-3 (`computeFeatAvailability` + 16 tests TDD) | `35e8075` (squash PR #81) | ✅ livré |
| 2C-feat-4 (UI grisage `FeatPicker` + tooltip + 4 tests) | `f9c00e7` (squash PR #82) | ✅ livré |
| 2C-feat-5 (matrix pin Wizard L4 / Fighter L4 sur Lutteur) | _(cette PR)_ | en cours |

## Objectif

Le bundle SRD actuel porte chaque feat avec un champ `prerequisite: { fr, en }` qui est de la **doc en chaîne**, non interprétable par l'app. À la modale de level-up, le `FeatPicker` (`level-up-modal.tsx`) propose tous les feats indistinctement — un joueur peut sélectionner un feat dont les prérequis ne sont pas remplis, et l'UI le laisse confirmer.

**Objectif 2C-feat** : durcir cette frontière en stockant les prérequis sous une forme structurée (Zod-validée) + en grisant les feats non-éligibles dans le picker, avec tooltip qui explique le verrou.

## Schéma proposé

```ts
// public/data/feats.json — chaque feat gagne un champ optionnel `prerequisites[]`
type FeatPrerequisite =
  | { kind: 'character-level'; minimum: number }              // Level 4+
  | { kind: 'ability-score'; ability: AbilityCode; minimum: number } // Force 13+
  | { kind: 'class-feature'; featureNameEn: string }          // Fighting Style class feature
  | { kind: 'spellcasting' };                                 // savoir lancer 1+ sort

// Sémantique : multiple entrées = AND (tout doit être vrai).
// Pas de OR dans le SRD 5.2.1 ship — si le besoin émerge on étend l'union.
```

Le champ texte `prerequisite` reste pour l'**affichage utilisateur** (le fichier FR officiel SRD est la source de vérité du libellé visible). Le nouveau champ `prerequisites[]` est la **règle exécutable**.

## Audit feat par feat (17 entrées)

Source : `public/data/feats.json`, validé contre SRD 5.2.1 FR (`content-sources/extracted/raw/FR_SRD_CC_v5.2.1.txt`).

### Origin feats — sans prérequis (4)

Granted at character creation L1. Aucun prereq à enforcer.

| ID | Nom FR | `prerequisites[]` proposé |
|---|---|---|
| `alert` | Vigilant | `[]` |
| `magic-initiate` | Initié à la magie | `[]` |
| `savage-attacker` | Sauvagerie martiale | `[]` |
| `skilled` | Doué | `[]` |

### General feats (2)

Niveau 4+ minimum. `ability-score-improvement` est le défaut (toujours dispo si on a un slot ASI). `lutteur` ajoute une stat min.

| ID | Nom FR | Texte SRD | `prerequisites[]` proposé |
|---|---|---|---|
| `ability-score-improvement` | Amélioration de caractéristique | « Niveau 4+ » | `[{kind:'character-level', minimum:4}]` |
| `lutteur` | Lutteur | « Niveau 4+, Force 13+ » | `[{kind:'character-level', minimum:4}, {kind:'ability-score', ability:'for', minimum:13}]` |

### Fighting-style feats (4)

Granted by `Fighter L1 Fighting Style`, `Paladin L2 Fighting Style`, etc. **Non sélectionnables au level-up général** : ce sont des features de classe sélectionnées via le sous-choix Fighting Style. Le picker ASI/feat L4+ doit donc **les filtrer hors-liste** quand `category === 'fighting-style'`.

| ID | Nom FR | Statut |
|---|---|---|
| `archery` | Archerie | Hors-picker ASI (sous-choix de classe) |
| `defense` | Défense | Hors-picker ASI |
| `great-weapon-fighting` | Armes à deux mains | Hors-picker ASI |
| `two-weapon-fighting` | Combat à deux armes | Hors-picker ASI |

Pas de `prerequisites[]` structuré nécessaire — le filtre par catégorie suffit. Le texte FR reste pour l'affichage dans la fiche (style de combat actif).

### Epic-boon feats (7)

Granted at L19. Le filtre `category === 'epic-boon'` au L19 est déjà en place (commit 2C.3 = 8c32f70 « Epic Boon L19 → filtre feats epic-boon »). Reste à ajouter le `prerequisites[]` structuré pour cohérence + le cas-limite `boon-of-spell-recall` qui requiert spellcasting.

| ID | Nom FR | Texte SRD | `prerequisites[]` proposé |
|---|---|---|---|
| `boon-of-combat-prowess` | Don du talent au combat | « Niveau 19+ » | `[{kind:'character-level', minimum:19}]` |
| `boon-of-dimensional-travel` | Don du voyage dimensionnel | « Niveau 19+ » | `[{kind:'character-level', minimum:19}]` |
| `boon-of-fate` | Don du destin | « Niveau 19+ » | `[{kind:'character-level', minimum:19}]` |
| `boon-of-irresistible-offense` | Don de l'offensive irrésistible | « Niveau 19+ » | `[{kind:'character-level', minimum:19}]` |
| `boon-of-spell-recall` | Don du rappel de sort | « Niveau 19+ + savoir lancer 1+ sort » | `[{kind:'character-level', minimum:19}, {kind:'spellcasting'}]` |
| `boon-of-the-night-spirit` | Don de l'esprit nocturne | « Niveau 19+ » | `[{kind:'character-level', minimum:19}]` |
| `boon-of-truesight` | Don de vision véritable | « Niveau 19+ » | `[{kind:'character-level', minimum:19}]` |

## Découpage PR (4 livraisons restantes)

| PR | Périmètre | Path protégé ? |
|---|---|---|
| **2C-feat-2** | Peuplement `prerequisites[]` sur `public/data/feats.json` + extension Zod schema côté `scripts/data/srd-feats.ts` | **Oui** (`public/data/**`, `scripts/data/srd-*.ts`) → flow PR + merge-commit |
| **2C-feat-3** | `computeFeatAvailability(character, feat) → { available, reason? }` + tests TDD couvrant chaque `kind` de prérequis | Non |
| **2C-feat-4** | Intégration UI `FeatPicker` (level-up-modal) : grisage `disabled` + tooltip, e2e Fighter L4 pour cas Lutteur (FOR 13 vs FOR 12) | Non |
| **2C-feat-5** | Matrix pin level-up — vérifie que `Lutteur` est blocké pour un Wizard L4 (FOR <13), disponible pour un Fighter L4 (FOR 15+) | Non |

## Décisions implicites

1. **Pas de OR dans `prerequisites[]`** — le SRD 5.2.1 ship ne contient pas de cas OR. Si un feat custom (JALON 3) introduit un OR, on étend l'union avec `{ kind: 'one-of'; choices: FeatPrerequisite[] }` à ce moment-là.
2. **`spellcasting` = true si `character.spellcastingAbility` n'est pas vide** — pas besoin d'examiner classes individuellement.
3. **`character-level` = `character.totalLevel`** (pas le niveau de la classe levée).
4. **Affichage du blocage** : tooltip FR rédigé par le hook `useFeatAvailability` (pas dupliqué dans le JSON) — ex « Prérequis non rempli : Force 13+ (actuellement 10) ».
5. **Le texte `prerequisite.fr` reste** au bundle pour la modale détail du feat (lecture seule, libellé officiel SRD). Pas de double maintenance, c'est de la doc.

## Anti-régression

`computeFeatAvailability` doit avoir :
- 1 test par `kind` de prérequis (rouge-avant-vert sur perso à la borne juste en dessous).
- 1 test combinatoire (Lutteur) qui valide AND strict.
- 1 test « zéro prérequis » → toujours `available: true`.
- 1 test « spellcasting » avec Fighter L4 (faux) vs Wizard L4 (vrai).
