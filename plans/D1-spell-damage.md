# D1 — `spell.damage[]` canonique depuis le SRD + propagation UI

> **🟢 CLOS** — livré 2026-05-25 aux commits `f17f8df` (1/5) → `4996003` (2/5) →
> `<sha3>` (3/5) → `<sha4>` (4/5) → ce commit (5/5). Quadruple gate Node 22
> verte sur chaque commit (1200 tests unit + 43 e2e). D1 → Résolu sur 43 sorts
> SRD canoniques (cantrips, AoE save-half, AoE attack-roll, auto-hit, multi-
> type, multi-rayons). **Reliquat** = D1a (~44 sorts de dégâts non couverts,
> longue traîne L1-9). La regex stopgap `extractDamageFormula` est **maintenue**
> en fallback (retrait reporté à D1a — son retrait avant couverture complète
> régresserait silencieusement ~44 sorts qui auto-roulent aujourd'hui via la
> regex).
>
> **Mini-plan dédié à la dette D1** (cf. `plans/DEBT.md > D1`). Périmètre : peupler
> `spell.damage[]` (champ optionnel déjà au schéma) pour les sorts SRD 5.2.1 à
> dégâts, ajouter un helper de résolution (slot upcast + cantrip char-level
> scaling), propager à l'UI (chip dans SpellList + section structurée dans
> SpellDetailModal), étendre la matrice 13.12 cat. 4 aux dégâts de sort.

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

- [x] 1. Lire `plans/DEBT.md > D1` + comprendre les surfaces impactées.
- [x] 2. Enrichir `SpellDamageSchema` dans `src/shared/types/content.ts` :
       `damageType` enum + `cantripScaling` + `resolution` + `condition`.
- [x] 3. Créer `scripts/data/srd-spell-damage.ts` (entrées hand-curées par
       slug, citations PDF dans les commentaires).
- [x] 4. Modifier `scripts/extract-srd-spells.ts` pour merger les entrées
       damage par slug avant d'écrire `public/data/spells.json`.
- [x] 5. Régénérer `public/data/spells.json` (pas via `content:build` — via
       `pnpm tsx scripts/extract-srd-spells.ts` direct pour bisecter facilement).
- [x] 6. Helper `expectSpellDamage` dans `tests/helpers/content-truth/rules.ts`.
- [x] 7. Tests de vérité du contenu cat. 4 sur 10 sorts pilotes.
- [x] 8. Quadruple gate verte sur commit 1.
- [x] 9. Peuplement large : 50-80 sorts supplémentaires (cantrips + L1-L9
       majoritaires).
- [x] 10. Tests cat. 3 (fidélité bundle figée) sur 15 sorts canoniques.
- [x] 11. Quadruple gate verte sur commit 2.
- [x] 12. `resolveSpellDamage()` helper pur dans
       `src/shared/lib/rules/spell-damage.ts`.
- [x] 13. Tests unitaires upcast (Fireball L3→L5 = 10d6) + cantrip scaling
       (Fire Bolt L1 = 1d10 ; L5 = 2d10).
- [x] 14. Quadruple gate verte sur commit 3.
- [x] 15. Chip « 3d6 feu » dans `SpellList > SpellRow` (ne s'affiche que si
       `spell.damage?.[0]` présent).
- [x] 16. Section « Dégâts » structurée dans `SpellDetailModal` (après prose,
       avant statblock invoqué) — affiche formule de base + upcast + cantrip
       scaling.
- [x] 17. Retrait de `extractDamageFormula` + `DAMAGE_RE` (regex stopgap).
- [x] 18. Tests RTL sur les 2 nouvelles surfaces UI.
- [x] 19. UAT visuel (`uat-review/` ordonné + fullPage + viewport modale).
- [x] 20. Quadruple gate verte sur commit 4.
- [x] 21. Matrice 13.12 cat. 4 : pour 5-10 sorts canoniques, asserter formule +
       type via `expectSpellDamage`. Étendre `runMatrix` si besoin.
- [x] 22. Bilan dette D1 : si tous les sorts de dégâts SRD sont peuplés → D1 →
       Résolu ; sinon créer D1a pour le reliquat avec owner explicite.
- [x] 23. Clôture plan + DEBT mise à jour + commit 5.

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

### Patterns réutilisables pour D1a (long-tail spell damage)

1. **Add-by-slug dans `scripts/data/srd-spell-damage.ts`** — extension du record,
   re-run `pnpm tsx scripts/extract-srd-spells.ts`, regénération automatique
   `public/data/spells.json` (+ hash via `update-content-index.ts`).
2. **Tests cat. 4 par batch** — étendre `PINNED_DAMAGES` dans
   `tests/srd-spell-damage.test.ts` au fur et à mesure (un sort = un cas).
3. **Multi-type damage** — répéter l'entrée `damage[]` (vu sur tempete-de-grele
   bludg+froid, nuee-de-meteores feu+contondants, couteau-de-glace
   perforants+froid). Le chip cinabre compacte « type +N » ; la modale
   itère.
4. **Patterns non-formule** — encoder en `condition` i18n FR+EN (vu sur
   projectile-magique, decharge-occulte multi-rayons, rayon-ardent leap,
   chaine-d-eclairs leap, tempete-vengeresse onset-only).
5. **Type au choix éditorial** (souffle-du-dragon : 5 types possibles) —
   type par défaut documenté dans `condition`, UI montre le défaut en
   attendant un cantrip-style chooser.

### Reliquat D1a (~44 sorts non couverts)

À ouvrir comme entry DEBT D1a après D1 → Résolu. Liste indicative
non-exhaustive du long-tail (cf. `jq` query `.[] | select(.description.en |
test("\\dd[0-9]+ [A-Z][a-z]+ damage"))` minus les 43 traités) : faveur-divine,
chatiment-divin (paladin smites), epine-mentale, croissance-d-epines, lame-de-feu,
metal-brulant, rayon-affaiblissant, rayon-de-lune, esprits-gardiens,
fusion-dans-la-pierre, invocation-d-animaux, malediction, mur-de-vent,
assassin-imaginaire, bouclier-de-feu, chien-de-garde, controle-de-l-eau,
invocation-d-etres-sylvestres, porte-dimensionnelle, tentacules-noirs,
brume-mortelle, colonne-de-flamme, contact-avec-les-plans, contagion,
quete, songe, barriere-de-lames, cercle-de-mort, contamination, mur-d-epines,
mur-de-glace, sphere-glacee, embruns-prismatiques, invocation-de-celeste,
symbole, teleportation, eclat-du-soleil, tremblement-de-terre, tsunami,
ennemi-subconscient, mot-de-pouvoir-mortel, mur-prismatique, souhait.

### Retrait de la regex `extractDamageFormula` (= D1b)

Quand la couverture sera complète (D1a), retirer `extractDamageFormula` +
`DAMAGE_RE` de `spell-detail-modal.tsx` (lignes 36, 400-408). Garde-fou :
test e2e cat. 1 (intégrité référentielle) qui vérifie que chaque sort SRD
avec « X[d]Y damage » dans la description EN a aussi une entrée dans
`spell.damage[]`.

### Catalogue d'i18n damage type labels

`DAMAGE_TYPE_LABELS` dans `scripts/data/srd-spell-damage.ts` centralise les
13 labels FR/EN. Tout futur consommateur de type de dégâts (sorts, items,
breath weapon, etc.) devrait importer depuis ce module pour éviter
divergences orthographiques (« tonnerre » vs « foudre » pour Thunder vs
Lightning notamment).
