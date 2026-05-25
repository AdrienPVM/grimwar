# D1 — `spell.damage[]` canonique depuis le SRD + propagation UI

> **Mini-plan dédié à la dette D1** (cf. `plans/DEBT.md > D1`). Périmètre : peupler
> `spell.damage[]` (champ optionnel déjà au schéma) pour les sorts SRD 5.2.1 à
> dégâts, ajouter un helper de résolution (slot upcast + cantrip char-level
> scaling), retirer le stopgap regex en faveur de la donnée canonique, propager
> à l'UI (chip dans SpellList + section structurée dans SpellDetailModal), étendre
> la matrice 13.12 cat. 4 aux dégâts de sort.
>
> **Statut** : en cours.

## Goal

Le bundle `public/data/spells.json` doit porter, pour chaque sort SRD 5.2.1 à
dégâts, un tableau `damage[]` structuré avec :
- `formula` (« 8d6 »)
- `type` (canonical SRD : `fire` / `cold` / `lightning` / `acid` / `poison` /
  `necrotic` / `radiant` / `force` / `thunder` / `psychic` / `bludgeoning` /
  `piercing` / `slashing`)
- `atHigherLevels?: { perLevel: '+1d6' }` — scaling par niveau d'emplacement
- `cantripScaling?: { '5': '2d10', '11': '3d10', '17': '4d10' }` — scaling par
  niveau de personnage pour les cantrips
- `resolution?: 'saving-throw' | 'attack-roll'` — mode de résolution
- `condition?: I18n` — condition particulière (ex. Magic Missile : « N projectiles
  de 1d4+1 ») pour les patterns non encodables en formule simple

Le helper `resolveSpellDamage(spell, slotLevel, casterLevel)` calcule la formule
roulable finale pour un cast donné.

L'UI affiche un chip « 3d6 feu » dans la liste des sorts connus + une section
« Dégâts » structurée dans la modale détail (en complément de la prose, pas en
remplacement).

## Périmètre / Découpage en commits

- **Commit 1** : Schéma enrichi (`damageType` enum + `cantripScaling`) + nouveau
  module séparé `scripts/data/srd-spell-damage.ts` (entrées hand-curées par
  slug) + merge logic dans `extract-srd-spells.ts` + 10 sorts pilotes (cantrips
  + Magic Missile + Fireball) + helper tests cat. 4
  `expectSpellDamage(slug, formula, type)`.
- **Commit 2** : Peuplement large — 50-80 sorts de dégâts supplémentaires
  (citations PDF dans le commit, pas le code), tests d'identité du contenu
  élargis.
- **Commit 3** : `resolveSpellDamage()` helper pur + tests unitaires sur
  upcast + cantrip scaling.
- **Commit 4** : UI propagation — chip dans SpellList + section structurée
  dans SpellDetailModal + tests RTL ; retrait de `extractDamageFormula` (regex
  stopgap) au profit du canonique exclusivement.
- **Commit 5** : Matrice 13.12 cat. 4 étendue aux dégâts de sort + clôture
  plan (DEBT D1 → Résolu ou D1a si reliquat).

## Étapes

- [ ] 1. Lire `plans/DEBT.md > D1` + comprendre les surfaces impactées.
- [ ] 2. Enrichir `SpellDamageSchema` dans `src/shared/types/content.ts` :
       `damageType` enum + `cantripScaling` + `resolution` + `condition`.
- [ ] 3. Créer `scripts/data/srd-spell-damage.ts` (entrées hand-curées par
       slug, citations PDF dans les commentaires).
- [ ] 4. Modifier `scripts/extract-srd-spells.ts` pour merger les entrées
       damage par slug avant d'écrire `public/data/spells.json`.
- [ ] 5. Régénérer `public/data/spells.json` (pas via `content:build` — via
       `pnpm tsx scripts/extract-srd-spells.ts` direct pour bisecter facilement).
- [ ] 6. Helper `expectSpellDamage` dans `tests/helpers/content-truth/rules.ts`.
- [ ] 7. Tests de vérité du contenu cat. 4 sur 10 sorts pilotes.
- [ ] 8. Quadruple gate verte sur commit 1.
- [ ] 9. Peuplement large : 50-80 sorts supplémentaires (cantrips + L1-L9
       majoritaires).
- [ ] 10. Tests cat. 3 (fidélité bundle figée) sur 15 sorts canoniques.
- [ ] 11. Quadruple gate verte sur commit 2.
- [ ] 12. `resolveSpellDamage()` helper pur dans
       `src/shared/lib/rules/spell-damage.ts`.
- [ ] 13. Tests unitaires upcast (Fireball L3→L5 = 10d6) + cantrip scaling
       (Fire Bolt L1 = 1d10 ; L5 = 2d10).
- [ ] 14. Quadruple gate verte sur commit 3.
- [ ] 15. Chip « 3d6 feu » dans `SpellList > SpellRow` (ne s'affiche que si
       `spell.damage?.[0]` présent).
- [ ] 16. Section « Dégâts » structurée dans `SpellDetailModal` (après prose,
       avant statblock invoqué) — affiche formule de base + upcast + cantrip
       scaling.
- [ ] 17. Retrait de `extractDamageFormula` + `DAMAGE_RE` (regex stopgap).
- [ ] 18. Tests RTL sur les 2 nouvelles surfaces UI.
- [ ] 19. UAT visuel (`uat-review/` ordonné + fullPage + viewport modale).
- [ ] 20. Quadruple gate verte sur commit 4.
- [ ] 21. Matrice 13.12 cat. 4 : pour 5-10 sorts canoniques, asserter formule +
       type via `expectSpellDamage`. Étendre `runMatrix` si besoin.
- [ ] 22. Bilan dette D1 : si tous les sorts de dégâts SRD sont peuplés → D1 →
       Résolu ; sinon créer D1a pour le reliquat avec owner explicite.
- [ ] 23. Clôture plan + DEBT mise à jour + commit 5.

## Critères de Done

- `public/data/spells.json` porte `damage[]` pour ≥80 sorts SRD à dégâts (~95 %
  du périmètre cat. 4 raisonnable).
- `extractDamageFormula` retirée du codebase (regex stopgap éliminée).
- `SpellList` affiche le chip dégâts ; `SpellDetailModal` affiche la section
  structurée.
- Tests cat. 4 « dégâts de sort » dans la matrice 13.12.
- Quadruple gate verte sur chaque commit.
- PR mergée avec 4/4 jobs CI verts + `protected-paths-guard` vert.
- DEBT.md mis à jour : D1 → Résolu (ou D1a créé pour reliquat).

## Notes for next plan

(à remplir à la clôture)
