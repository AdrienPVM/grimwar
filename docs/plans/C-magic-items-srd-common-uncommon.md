# Plan C — Magic items SRD Common + Uncommon (tracer-bullet Potions d'abord)

> Statut : EN COURS. Tracer-bullet **Potions** livré en premier.
> Scope complet (estimé 86 items) découpé en N tracer-bullets digestes
> par catégorie SRD.

## Pourquoi un découpage en tracer-bullets

Le chantier C tel que cadré par Adrien attaque ~86 magic items SRD Common +
Uncommon. Tenter de tout livrer en un seul commit/PR est risqué :
- Volume de données hand-curated EN+FR considérable
- Alignement bilingue EN↔FR cassable (corruption de tables, hyphenation)
- Terminologie FR à vérifier item par item (autorité = traduction WotC FR
  officielle, règle « Source d'autorité terminologique FR LOCKED » du
  decision log)
- Le bundle `public/data/magic-items.json` est **grandfathered** AideDD pré-LOCKED
  (cf. decision log 2026-05-17). On remplace **uniquement** les 86 entrées
  Common + Uncommon par du sourcing SRD ; les 165 Rare/Very Rare/Legendary
  restent pass-through identiques (pattern `monsters.json`).

**Stratégie** : un tracer-bullet propre par catégorie SRD, fusionné chacun
indépendamment. Le premier tracer (Potions) valide le pipeline complet
(schéma, extractor, tests cat. 3, gate, PR, merge) avant d'attaquer les
catégories suivantes.

## Ordre des tracer-bullets

1. **C.1 — Potions** (9 entrées) — ✅ mergé PR #28 (`85d8397`)
2. **C.2 — Wondrous wearables** (24 entrées uncommon : bottes/capes/gants/heaumes/chaussons/diadème/bandeau/bracelets/broche/chapeau/regard/yeux/lunettes/robe) — *ce commit*
3. C.3 — Anneaux + amulettes (5 anneaux uncommon SRD + amulettes/colliers/périapt) — ~10 entrées
4. C.4 — Armes magiques (+1, Quarterstaff de lance-mort, Mace of Smiting, etc.) — ~10 entrées
5. C.5 — Armures + boucliers magiques — ~8 entrées
6. C.6 — Wondrous utilitaires + parchemins (sacs/balais/carafe/cartes/poudres/gemmes/pipes/corde/sending stones/wind fan/pearl/bead) — ~15 entrées
7. C.7 — Reliquat (≈5 items dispersés)

Chaque tracer livre :
- `scripts/data/srd-magic-items-<cat>.ts` — hand-curated SRD-sourced
- Ajout à `scripts/extract-srd-magic-items.ts` (builder mutualisé)
- Régénération `public/data/magic-items.json` (préserve les ≥rare)
- Tests cat. 3 pin sur 3-5 items vérifiés contre PDF
- quadruple gate Node 22, PR, CI 5/5, merge, guard vert

## C.1 — Potions (ce commit)

### Inventaire SRD CC v5.2.1

**Common (2)** :
- Potion of Climbing
- Potion of Healing (2d4+2)

**Uncommon (7)** :
- Potion of Animal Friendship
- Potion of Giant Strength (hill) — note: l'entrée parent "Potion of Giant Strength" a `rarity varies`, mais la déclinaison hill est uncommon
- Potion of Growth
- Potion of Healing (greater) — 4d4+4
- Potion of Poison
- Potion of Resistance
- Potion of Water Breathing

**Hors scope C.1** (à traiter en C.7) : Clairvoyance, Diminution, Flying, Gaseous Form, Heroism, Invisibility, Invulnerability, Longevity, Mind Reading, Speed, Vitality, Giant Strength rare+ — tous ≥ Rare, déjà grandfathered.

### Mapping EN ↔ FR officiel (depuis SRD FR CC v5.2.1)

| EN | FR (officiel) | Slug |
|---|---|---|
| Potion of Climbing | Potion d'escalade | `potion-d-escalade` (existe) |
| Potion of Healing | Potion de guérison | `potion-de-guerison` (existe) |
| Potion of Animal Friendship | Potion d'amitié avec les animaux | `potion-d-amitie-avec-les-animaux` |
| Potion of Giant Strength (hill) | Potion de force de géant (collines) | `potion-de-force-de-geant-collines` |
| Potion of Growth | Potion d'agrandissement | `potion-d-agrandissement` |
| Potion of Healing (greater) | Potion de guérison (importante) | `potion-de-guerison-importante` |
| Potion of Poison | Potion toxique | `potion-toxique` |
| Potion of Resistance | Potion de résistance | `potion-de-resistance` |
| Potion of Water Breathing | Potion de respiration aquatique | `potion-de-respiration-aquatique` |

### Schéma cible (existant, `MagicItemSchema`)

```ts
{
  id: slug,
  name: { fr, en? },
  category: 'gear', // potions = gear
  rarity: 'common' | 'uncommon',
  attunement: false,
  magicDescription: { fr, en? },
  description: null, // pas de mundane physical desc séparée pour les potions
  source: 'srd-5.2.1',
}
```

### Livrables C.1

- [x] Plan rédigé (ce fichier)
- [ ] `scripts/data/srd-magic-items-potions.ts` — 9 entrées hand-curated
- [ ] `scripts/extract-srd-magic-items.ts` — builder (préserve les non-touchés)
- [ ] `public/data/magic-items.json` régénéré (9 entrées remplacées/ajoutées,
      ≥rare préservés byte-identique)
- [ ] `scripts/__tests__/srd-magic-items-potions.test.ts` — cat. 3 pin sur 4 potions vérifiées contre PDF
- [ ] Tests existants verts (`content-referential-integrity`, `srd-counters`, etc.)
- [ ] quadruple gate Node 22 : `pnpm typecheck && pnpm test && pnpm lint && pnpm test:e2e`
- [ ] PR draft `feat/C-magic-items-srd-common-uncommon`
- [ ] CI 5/5 vert
- [ ] Merge merge-commit
- [ ] Guard vert push:main
- [ ] DEBT.md mis à jour (D-grandfathered-magic-items partiel)

## Politique de contenu (rappel)

- **Source unique** : `content-sources/extracted/raw/SRD_CC_v5.2.1.txt` (EN) +
  `FR_SRD_CC_v5.2.1.txt` (FR). Aucune lecture AideDD.
- Arbitrage en cas de corruption d'une extraction : EN tranche pour la mécanique,
  FR tranche pour la formulation (cf. règle « Arbitrage EN↔FR sur corruption »
  du CLAUDE.md).
- Terminologie FR : uniquement la traduction officielle WotC FR depuis le PDF
  SRD FR CC v5.2.1 (et non pas l'intuition ni Baldur's Gate).

## C.2 — Wondrous wearables (ce commit)

### Livrables

- [x] `scripts/data/srd-magic-items-wondrous.ts` — 24 entrées hand-curated
  (0 common + 24 uncommon).
- [x] `scripts/extract-srd-magic-items.ts` étendu pour merger le nouveau module
  (garde-fou anti-double-slug entre modules SRD).
- [x] `public/data/magic-items.json` régénéré : 253 entrées total (251 → 253
  car 23 wondrous existants remplacés + 1 nouveau slug `gants-de-chapardeur`).
- [x] `public/data/index.json` régénéré (counts + contentHash).
- [x] `scripts/__tests__/srd-magic-items-wondrous.test.ts` — cat. 3 pin sur
  6 items vérifiés contre PDF (Bracelets d'archer, Cape de protection, Lunettes
  du nyctalope, Lentilles de netteté, Gantelets d'ogre, Gants de chapardeur).

### Drifts AideDD↔SRD corrigés (transparence valeur produit)

1. **`lunettes-de-nuit` → "Lunettes du nyctalope"** (officiel WotC FR — drift
   terminologique de la baseline AideDD).
2. **`yeux-grossissants` → "Lentilles de netteté"** (officiel WotC FR — drift
   terminologique idem).
3. **`robe-de-camelot` → "Robe du camelot"** (officiel WotC FR — article défini
   « du » vs « de »).
4. **`bottes-elfiques`** : `attunement` → `false` (SRD 5.2.1 officiel ne requiert
   PAS attunement pour les Boots of Elvenkind ; AideDD baseline incohérent).
5. **`heaume-de-comprehension-des-langues`** : `attunement` → `false` (SRD ne
   requiert PAS attunement).
6. **`lunettes-de-nuit`** : `attunement` → `false` (SRD ne requiert PAS).
7. **`yeux-de-lynx`, `yeux-grossissants`** : `attunement` → `false` (SRD idem).
8. **`gants-de-chapardeur`** : ENTRÉE AJOUTÉE (absent du bundle baseline AideDD
   alors qu'il est SRD-officiel — Gloves of Thievery).

## Notes pour les prochains tracer-bullets (C.3–C.7)

- Le builder `extract-srd-magic-items.ts` doit être conçu pour
  **fusionner plusieurs modules de données** (potions, wondrous, etc.) sans
  régression sur les catégories déjà extraites.
- La stratégie "préserve `description` enrichie de l'existant" du pattern
  feats est ici **différente** : les items grandfathered ont une `magicDescription`
  AideDD-paraphrasée. Sur un item remplacé par sourcing SRD, on **remplace**
  intégralement `magicDescription` (la version SRD prime).
- Les ≥ Rare (165 items) restent intouchés — le builder les liste explicitement
  en pass-through avec un commentaire `// GRANDFATHERED — AideDD pré-LOCKED`.
