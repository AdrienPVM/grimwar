# Plan 08 — Sheet Essence mode

## Goal
Essence mode displays the character's abilities (hexagram of 6 stats), saves row, and skills (searchable list). Tap any → rolls the appropriate d20 + modifier.

## Context
Read `prototype/grimwar.html` (Essence section — hexagram layout), `docs/DATA-MODEL.md` (abilities, saves, skills shape).

## Prerequisites
Plans 01-06. Plan 12 (dice engine) ideally done first, but can stub roll function.

## Steps

### Hexagram
- [x] 1. `src/features/sheet/modes/essence/hexagram.tsx`: SVG hexagonal layout (2 anneaux + 2 triangles d'étoile + hex intérieur + sigil central) avec 6 boutons d'aptitudes positionnés sur les sommets aux mêmes pourcentages que le prototype. Centre = bonus de maîtrise dérivé du `totalLevel` (multi-class via `lib/rules/multiclass.ts`).
- [x] 2. Chaque sommet affiche : nom court d'aptitude (Intel./Sagesse/…), modificateur ±N en gros chiffres, icône `<Icon name="i-for|...">`.
- [x] 3. Tap = jet via `rollWithFlags` (pivot mutualisé essence — applique exhaustion + inspiration auto).
- [x] 4. Long-press = menu inline (Avantage / Normal / Désavantage) ancré sur le sommet pressé.

### Saves row
- [x] 5. `saves-row.tsx`: 6 chips dans une grille 3×2 → 6×1 (responsive). Maîtrise = bordure gold + pastille gold en haut à droite.
- [x] 6. Tap = jet de sauvegarde (d20 + abilityMod + PB si maîtrise). Long-press = menu d'avantage en modale plein écran centrée (les chips sont trop petits pour ancrer le menu inline comme l'hexagramme).
- [x] 7. **Réutilisé** `proficiencyBonus(totalLevel)` du fichier `lib/rules/multiclass.ts` (déjà testé plan 05) plutôt que de créer un doublon `proficiency.ts`. Documenté ici car le plan demandait un nouveau fichier — multiclass.ts est l'unique source.

### Skills list
- [x] 8. `skills-list.tsx`: registre des 18 skills dans `lib/rules/skills.ts` (+ 13 unit tests pour ids uniques, distribution par aptitude SRD, modifier composition). Search input filtrant sur le nom localisé ou l'id.
- [x] 9. Chaque ligne : indicateur de maîtrise, nom complet (FR), chip aptitude (3 lettres), modificateur calculé.
- [x] 10. Indicateur de maîtrise : cercle vide (0), cercle plein gold (1 = maîtrise), losange plein gold rotaté 45° (2 = expertise).
- [x] 11. Tap = jet via `rollWithFlags` (avec label localisé). Pas de long-press menu côté skills (plan ne le demande pas pour ce cas — l'avantage est typiquement narratif côté skills, pas mécanique).

### Inspiration toggle
- [x] 12. `essence-header.tsx`: chip Inspiration (variant `inspiration` = gradient gold) en haut de l'écran Essence. Tap = bascule `character.inspiration`. Quand allumée, `rollWithFlags` consomme automatiquement au premier d20 (advantage + bascule false). Le toast d'allumage indique "Prochain d20 avec avantage" pour expliquer le mécanisme.

### Exhaustion display
- [x] 13. `essence-header.tsx` : bandeau crimson conditionnel (`exhaustion > 0`) avec icône skull + texte "Épuisement · niveau N · −2N sur tous les jets de d20". La pénalité elle-même est appliquée mécaniquement par `rollWithFlags` (`effectiveMod = baseMod - 2 * exhaustion`) — pas de duplication entre UI et logique.

### Tests
- [x] 14. **Déjà couvert** par `lib/rules/__tests__/abilities.test.ts` (plan 05) — la formule `Math.floor((score - 10) / 2)` est testée pour 1, 6, 8, 10-11, 12, 14, 20.
- [x] 15. Unit: skill modifier composition (13 tests dans `skills.test.ts`) + helper `rollWithFlags` (5 tests : pénalité exhaustion, override inspiration, consommation, advantage explicite respecté quand pas d'inspiration).
- [-] 16. **DEFERRED** : e2e Playwright reporté avec la dette e2e cumulée (plans 05/06/07). Playwright n'est pas wired ; voir `## Notes for next plan` pour la liste consolidée et la proposition de plan dédié.

### Final
- [x] 17. `pnpm typecheck && pnpm test && pnpm lint` — 73 tests verts (+18 vs plan 07), lint propre, typecheck strict propre. `pnpm build` propre (2.39s).
- [x] 18. Commit: `feat(sheet): essence mode (plan 08)`

## Definition of Done
- [x] Hexagram renders, all 6 abilities show correct modifiers
- [x] Skill list filterable, all rolls work
- [x] Inspiration toggle consumes on next roll
- [x] Exhaustion penalty applied

## Notes for next plan

### Pivot des d20 — `rollWithFlags`
Surface stable : `rollWithFlags({ character, baseMod, label, advantage?, consumeInspiration? })` dans `src/features/sheet/modes/essence/roll-with-flags.ts`. Trois responsabilités centralisées :
1. Pénalité d'épuisement (5e 2024 : −2 × niveau d'exhaustion sur les d20).
2. Consommation d'inspiration : si `character.inspiration === true`, force `advantage` et appelle `consumeInspiration()` (qui patch Firestore `inspiration: false`).
3. Toast `roll` / `crit` / `fumble` selon nat 1/20, avec sub-line `1d20+N → r1 / r2 + N`.

**Plan 09 (Magie), plan 11 (radial FAB) doivent passer par ce pivot** — pas de nouveaux call sites de `rollD20()` direct hors Combat (Combat pré-existe au pivot, sera migré quand plan 22 ajoutera le logging, pour éviter une migration sans valeur). Si Magie a besoin d'un cas particulier (DD du sort, save vs sort), étendre `rollWithFlags` plutôt que dupliquer.

### Dette e2e consolidée
Suite à ta remarque sur plan 25 ≠ wiring : aucun plan actuel ne possède le wiring Playwright. État de la dette à fin plan 08 :

| Plan | Step | Feature à couvrir e2e |
|---|---|---|
| 05 | 24 | Wizard manuel — Lyralei créée en < 2min |
| 06 | 17 | `/character/{id}` — hero card + status strip + switch modes |
| 07 | 16 | Combat — HP, death saves, conditions, slots, attaques |
| 08 | 16 | Essence — tap petal/save/skill → toast, inspiration consommée, exhaustion appliquée |
| 11 | 21 | Radial FAB — tap, voir menu, fire action (déjà annoncé inline) |

**Proposition pour Adrien (en attente de validation) :**

- **Option A (préférée)** : insérer un nouveau plan **13.5 "Playwright wiring + e2e dette S1"** entre plan 13 (PWA deploy) et plan 14 (campaigns model). Charge : configurer `playwright.config.ts`, écrire les helpers shared (login anonyme, créer Lyralei en seed, navigate `/character/:id`), puis ré-ouvrir et couvrir les steps deferred listés ci-dessus. Pré-requis sain avant d'entrer en S2 multi-joueurs (où les flows e2e auront vraiment besoin d'être verts).
- **Option B** : prérequis explicite à plan 40 (production-deploy). Plus tard, mais la dette grossit chaque plan visuel (09 Magie, 10 Avoir, 20 Âme, 11 FAB → minimum +4 entrées avant plan 40).

Tant que cette décision n'est pas prise, **j'ajoute systématiquement chaque step `e2e:` à cette table dans la note de fin de plan**, pour que rien ne soit perdu. Aucun nouveau plan n'est créé sans accord.

### Inspiration : un seul booléen
Le schema `character.inspiration: boolean` reflète le SRD 2024 (you have it or you don't, pas de stack). Plan 21 (DM dashboard) pourra ajouter un bouton "Accorder inspiration" côté MJ qui passe par le même setter — pas de schema change requis. L'event-logger (plan 22) interceptera la transition `false → true` pour logger qui l'a donnée et pourquoi.

### Exhaustion : pénalité côté `rollWithFlags`
La pénalité d'exhaustion (−2N) est appliquée mécaniquement aux d20 d'Essence. Combat (HP mega-card / death saves) ne la consomme PAS encore — l'exhaustion n'affecte pas les jets de mort dans le SRD 2024, mais l'AC et les saves de combat oui. Quand plan 09 ajoutera les save spell DCs et plan 12 unifiera le moteur, vérifier que toutes les attaques + saves cogitent l'exhaustion via `rollWithFlags` (ou que `rollD20` du moteur custom plan 12 absorbe la pénalité au lieu de la dupliquer côté call site).

### Compétences : registre stable
`src/shared/lib/rules/skills.ts` exporte `SKILLS` (18 entrées immuables) + `getSkill(id)` + `skillModifier(...)`. Le wizard manuel (plan 05) utilise son propre `SKILLS_FR_TO_KEY` inline (mapping nom-FR → kebab-case-key) pour décoder les `class.skillChoices.from[]` qui sont en anglais. Plan 17 (wizard level-up + class features) devrait dédupliquer en consommant `SKILLS` au lieu du map local — laissé pour ce plan-là, pas de refactor préventif ici.
