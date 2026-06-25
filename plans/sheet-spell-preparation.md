# Plan — Préparation des sorts (mode Magie)

> Slice de fidélité fiche (catégorie « affichage + interaction, sans schéma »),
> hors file numérotée — même nature que les cartes HP / Concentration /
> Épuisement déjà livrées. Rules-heavy → mini-plan posé avant code (demande
> d'Adrien).

## Goal

Donner aux **préparateurs de sorts** (Clerc, Druide, Paladin) une UI pour
**choisir / re-préparer** leur liste de sorts préparés depuis la **liste
complète de leur classe**, dans la limite du plafond SRD 2024. Aujourd'hui leur
`preparedSpells[classId]` est vide à la création et **aucune UI ne permet de le
remplir** — un Clerc L1 n'a donc aucun sort de niveau 1 jouable.

## Pourquoi c'est un bug de fidélité réel

- Au wizard, Clerc/Druide reçoivent **0 sort de niveau 1** (quota `LEVEL1_QUOTA`)
  car ils « préparent depuis leur liste de classe » — mais cette préparation
  n'existait nulle part dans l'app. La fiche d'un Clerc L1 est donc cassée côté
  sorts de niveau 1.
- Le champ `preparedSpells[classId]` **existe déjà** dans le schéma
  (`character.ts`) → **aucun changement de schéma**, aucun path protégé.
- Le bundle `spells.json` **tague déjà chaque sort par classe** (`classes: []`,
  ids EN : `cleric` / `druid` / `paladin` …) → le pool de candidats est dérivable.
- Le plafond de préparation **existe déjà** dans `classes.json`
  (`spellProgression.spellsKnownOrPrepared`, colonne « Prepared Spells » du SRD
  2024). Clerc/Druide L1 = 4, Paladin L1 = 2.

## Règles (SRD 5.2.1 / 2024)

- **Préparateurs** (re-préparent à chaque repos long depuis toute la liste de
  classe) : **Clerc, Druide, Paladin, Magicien**. Source : tables de classe SRD
  5.2.1 (colonne « Prepared Spells »).
- **Connaisseurs** (liste fixe, pas de re-préparation) : Barde, Ensorceleur,
  Rôdeur, Occultiste → **pas d'éditeur** (hors scope).
- **Magicien** : préparateur mais depuis son **grimoire** (pas toute la liste).
  Il a déjà sa séparation Grimoire / Préparés (`WizardSpellbookSections`).
  → **Toggle Magicien = follow-up dédié**, hors de ce slice.
- **Sorts mineurs** (cantrips) : toujours disponibles, **ne comptent pas** dans
  le plafond → exclus de l'éditeur (note informative).
- **Pool de candidats** = sorts dont `classes` contient le `classId` ET dont le
  niveau ∈ [1 .. plus haut niveau d'emplacement débloqué].

## Décisions

- **Pas d'événement journal.** La préparation est une **configuration entre
  sessions** (comme le choix des sorts connus à la création), pas une action de
  table. Le diff-logger ne touche pas `preparedSpells` (vérifié) → écriture
  silencieuse, cohérent avec la philosophie de `docs/EVENT-LOG.md`. Si Adrien
  veut un event, ajout additif trivial plus tard.
- **Écriture immédiate au toggle** (pattern des cartes existantes : Épuisement,
  Réserves), pas de bouton « Enregistrer ».
- **Set des préparateurs codé en helper de règles** (`PREPARED_CASTER_CLASS_IDS`)
  avec citation SRD — `classes.json` n'a pas de flag `preparationType` et c'est
  un path protégé ; un constant de règles est l'approche non-protégée correcte.

## Steps

- [x] 1. Helper pur `src/shared/lib/rules/spell-preparation.ts` :
  `PREPARED_CASTER_CLASS_IDS`, `isPreparedCaster`, `preparationCap(classDef, level)`,
  `candidatePreparableSpells(spells, classId, maxLevel)`, `togglePrepared(list, id, cap)`.
  `maxPreparableSpellLevel` retiré du helper (dépendance backwards shared→features) :
  calculé dans le composant via `unlockedSlotLevels` et passé en paramètre.
- [x] 2. Composant `src/features/sheet/modes/magie/preparation-editor.tsx` :
  carte repliable (`grid-rows-[0fr|1fr]`), compteur `X / cap`, liste de candidats
  groupée par niveau, toggle (désactivé au plafond), écriture immédiate via
  `updateCharacter`, `readOnly` masque le bouton Modifier + désactive les lignes.
- [x] 3. Câblage dans `magie-mode.tsx` : un éditeur par classe lanceuse
  `isPreparedCaster && classId !== 'wizard'`.
- [x] 4. Clés i18n (union `TranslationKey` + catalogues fr + en).
- [x] 5. Tests unitaires `spell-preparation.test.ts` — 17 tests, plafonds pinés
  (Clerc/Druide/Magicien L1 = 4, Paladin L1 = 2, Clerc L5 = 9), pool Clerc L1 = 15
  sorts (0 cantrip), L3 = 51, toggle au plafond.
- [x] 6. Tests composant `preparation-editor.test.tsx` — 7 tests (rendu Clerc,
  cap 4, toggle écrit `preparedSpells.cleric`, blocage au plafond, retrait au
  plafond, read-only, null si rien à préparer). « non rendu Ensorceleur/Magicien »
  garanti par `isPreparedCaster`=false (Ensorceleur) + filtre `!== 'wizard'`.
- [x] 7. e2e `tests/e2e/spell-preparation.spec.ts` (seed Clerc → préparer Bénédiction → 1/4).
- [x] 8. UAT captures `uat-review/spell-preparation/` (3, pleine page) générées via
  e2e émulateur (`spell-preparation` + `magie` verts, 2 passed). Validation
  sensorielle Adrien en attente.

## Definition of Done

- `pnpm typecheck && pnpm test && pnpm lint` verts.
- `pnpm test:e2e` (specs touchées) vert ou skip propre sans émulateur.
- Plafonds chiffrés vérifiés UNE fois contre SRD 2024, figés en test.
- UAT navigateur Adrien (ressenti) sur la galerie.

## Notes for next plan

- Toggle de préparation **Magicien** (depuis le grimoire) = follow-up.
- Re-préparation **bornée au repos long** (RAW) = raffinement futur ; pour
  l'instant éditable à tout moment (cohérent avec l'édition libre de la fiche).
- Préparateurs multiclasse : un éditeur par classe, chacun à son propre plafond.
