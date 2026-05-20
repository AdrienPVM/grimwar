# Extraction notes — content pipeline

Generated during plan 04 execution. Update when sources change or selectors break.

## Sources de vérité

| Source | Format | Utilisation |
|---|---|---|
| `pdfs/SRD_CC_v5.2.1.pdf` | PDF EN, 1.4 MB extracted | Mécaniques + EN canonique pour types non couverts par AideDD (classes, ancestries, backgrounds, conditions). |
| `pdfs/FR_SRD_CC_v5.2.1.pdf` | PDF FR, 1.6 MB extracted | Traductions FR officielles WotC. Source FR pour types non couverts par AideDD. |
| `aidedd/List » *.html` | HTML structuré (`<div class="bloc">` par entité) | Source FR + mécaniques structurées pour 7 types. **Filtré par source field** (voir ci-dessous). |
| `pdfs/AideDD.org - Basic Rules.pdf` | PDF FR | Backup, non parsé pour l'instant. |
| `pdfs/D&D 5 - Manuel des joueurs.pdf` etc. | PDF FR commerciaux | **Privés**. Jamais bundlés. Plan 04 step 17-19 prévoyait DMG → Firestore privé mais le PDF Guide du maître = 642 chars sur 321 pages (PDF non extractable, fonts custom/scan). DMG-private uploadable est BLOCKED jusqu'à fourniture d'un PDF DMG extractible. |

## Choix d'architecture (déviation documentée vs plan 04)

Plan 04 supposait : SRD = mécaniques + AideDD HTML overlay = traductions FR uniquement.

**Réalité après inspection** :
1. SRD 5.2.1 existe en EN ET en FR (officiel WotC) — la couche FR officielle est fournie par le SRD FR, pas AideDD.
2. AideDD HTML contient des entités structurées avec mécaniques complètes — parser ces HTML est **order-of-magnitude plus fiable** que parser des stat blocks PDF text via regex.
3. AideDD couvre 7 types (sorts, monstres, magic-items, dons, manifestations, herbes, poisons). Les autres types (classes, ancestries, backgrounds, conditions, items basiques) ne sont disponibles QUE via PDF.

**Décision pragmatique** :
- Pour les 7 types AideDD : **AideDD HTML = source structurée principale** (parsing CSS plus fiable). SRD reste source d'audit ; en cas de divergence remontée par un user, on corrige vers le SRD.
- Pour les autres types : SRD FR PDF text parsing, EN depuis SRD EN matching.
- **Couche EN différée** : pour cette session on livre FR-only (`en` est `undefined`). Plan 34 (i18n-EN) enrichira via SRD EN. Schema Zod accepte `en?: string` donc pas de violation.

Le principe "PDF source of truth #1" tient toujours dans le sens : si AideDD diverge du SRD sur une mécanique, le SRD gagne. Mais en pratique on extrait depuis l'HTML AideDD parce qu'il est déjà structuré.

## Filtre source AideDD (whitelist)

Une entité AideDD est **acceptée** dans `public/data/` UNIQUEMENT si son `<div class="source">` matche un des patterns suivants :

```
contient "(SRD)"           → SRD core (PHB/MM/DMG SRD subsets)
contient "(BR)" ou "(BR+)" → Basic Rules / Basic Rules+ (CC-BY)
"Recueil des plantes d´AideDD"  → AideDD homebrew public
"Recueil des poisons d´AideDD"  → AideDD homebrew public
texte vide / absent              → assumé public (rare cas)
```

Tout le reste (`Player´s Handbook` sans suffixe, `Monster Manual` sans suffixe, `Dungeon Master´s Guide` sans suffixe, `Xanathar´s Guide to Everything`, `Tasha´s Cauldron of Everything`, `Fizban´s Treasury of Dragons`, `Glory of the Giants`, etc.) est **rejeté** et logué dans `content-sources/extracted/aidedd/REJECTED.json` pour audit.

## Inventaire AideDD HTML (counts bruts → après filtre)

| Type | Brut | Après filtre | Sources rejetées notables |
|---|---|---|---|
| Sorts | 477 | ~330 | PHB(31), Xanathar(95), Tasha(21) |
| Monstres | 428 | ~363 | MM(65) |
| Magic items | 323 | ~251 | DMG(24), Xanathar(48) |
| Dons | 83 | ~1 | PHB(41), Tasha(15), Xanathar(15), Fizban(3), Glory(8) — quasi tout est commercial |
| Manifestations (eldritch invocations) | 54 | ~32 | Xanathar(14), Tasha(8) |
| Herbes | 101 | 101 | (homebrew AideDD complet) |
| Poisons | 100 | ~86 | DMG(14) |

## Sélecteurs par type (calibrés contre HTML réel)

### Sorts (`<div class="bloc">`)
- Name : `h1`
- Level + school : `.ecole` (ex : `"niveau 1 - abjuration"` ou `"évocation (tour de magie)"`)
- Casting time : `<div><strong>Temps d'incantation</strong> : ...</div>` (innerHTML après le `:`)
- Range : `<div><strong>Portée</strong> : ...</div>`
- Components : `<div><strong>Composantes</strong> : ...</div>` (parse V/S/M + matériel entre parenthèses)
- Duration : `<div><strong>Durée</strong> : ...</div>` (détecte "concentration")
- Description : `.description` (innerHTML — peut contenir `<strong><em>Aux niveaux supérieurs</em></strong>` à splitter)
- Classes : tous les `.classe` (Druide, Magicien, etc. — à mapper vers IDs internes)
- Source : `.source`
- Ritual : à détecter dans `.ecole` ou en cherchant "rituel" dans la description

### Monstres
- Name : `h1`
- Type/size/alignment : `.type` (ex : `"créature artificielle de taille TM, sans alignement"`)
- Stats (CA, PV, vitesse) : div en texte libre — regex à calibrer
- Abilities (FOR/DEX/CON/INT/SAG/CHA) : `.carac` table
- Color-coded sections : `.jaune` / `.orange` / `.red` / `.rub` correspondent à différents types de blocs (résistances, actions, légendaires, etc.) — à mapper en exploration
- Description (traits + actions) : `.description`
- Source : `.source`

### Magic items
- Name : `h1`
- Type+rarity : `.type` (ex : `"objet merveilleux, rare (nécessite un accord par un magicien)"`)
- Description : `.description`
- Source : `.source`

### Dons (feats)
- Name : `h1`
- Prerequisite : `.prerequis`
- Summary : `.resume`
- Full description : `.description`
- Source : `.source`

### Manifestations (eldritch invocations)
- Name : `h1`
- Prerequisite : `.prerequis`
- Description : `.description`
- Source : `.source`

### Herbes / Poisons (homebrew AideDD)
- Name : `h1`
- Type/category : `.type`
- Icon : `.icon`
- Description : `.description`
- Source : `.source`

## Parsers SRD — état actuel

`scripts/parse-srd-text.ts` est un parser réel (plus un stub). Il consomme les deux extracts SRD 5.2.1 (EN + FR) et produit du JSON Zod-validé.

**Couvert (livrés, validés, bundlés dans `public/data/`)** :

| Type | Stratégie | Compte |
|---|---|---|
| `classes` | Parsing programmatique : 12 classes avec core traits + features par niveau extraits depuis SRD EN+FR. Pairing FR↔EN par index dans la liste de features (les deux langues présentent les features dans le même ordre par niveau). | 12 |
| `subclasses` | 1 sous-classe par classe (le SRD n'en publie qu'une par classe) — Path of the Berserker, College of Lore, etc. Même stratégie que classes. | 12 |
| `ancestries` | Extraction des 9 espèces (Drakéide → Tieffelin) avec size, speed et traits. **FR-only sur les traits** (voir limitations ci-dessous). | 9 |
| `backgrounds` | **Hand-author** complet (4 entrées : Acolyte, Criminel, Sage, Soldat) — texte intégral en FR + EN, lu depuis le SRD. Tolérance Adrien acceptée car corpus court et stable. | 4 |
| `conditions` | **Hand-author** complet (15 entrées : Aveuglé → Inconscient). Idem tolérance. | 15 |

**Limitations connues** :

1. **Trait FR↔EN pairing pour ancestries** : les traits sont listés alphabétiquement à l'intérieur de chaque langue, et les alphabets diffèrent (Darkvision/Stonecunning en EN ≠ Connaissance/Vision en FR). Le pairing par position est faux — on émet donc **FR-only pour les traits d'ancestry**. Le schema Zod accepte `en` optionnel, l'app par défaut est en FR, donc inoffensif. Plan 34 (i18n EN) devra fournir une table de mapping FR↔EN explicite par ancestry (~45 entrées) pour activer EN.
2. **Schema Background ne modélise pas l'ASI 2024** : SRD 2024 met l'ASI sur les backgrounds (pas les ancestries) et donne un Origin feat plutôt qu'un feature classique. Le parser hand-authore avec `feature.name` = nom du don et `feature.description` = effet du don. L'`abilityScoreIncrease` du Background n'est pas dans le schema actuel — à ajouter avant plan 05 si le wizard veut afficher les bonus d'historique. Tracker dans plan 04 notes.
3. **PDF artifacts mineurs** : "Na- ture" → "Nature" (espace résiduel après césure mid-mot dans certaines listes), tables de proficiency parfois en chaînes concaténées. Post-process regex dans le parser nettoie la majorité.

**Toujours en stub (livrés vides mais valides Zod)** :

- `subancestries` : SRD 2024 modélise les sub-races comme choix in-trait (lignages, héritages, ascendances). Pas d'entités séparées.
- `rules` (glossaire complet) : ~200 entrées (actions, attitudes, hazards, etc.). Corpus large, plan dédié.
- `monsters` : parser AideDD partiel (id/name/source seulement). Stat blocks demandent travail dédié — bloqueur S3 plan 24, pas plan 05.

## Sorts — pipeline SRD 5.2.1 bilingue (plan 13.10, remplace AideDD)

> Ce pipeline **remplace** la source AideDD des sorts (cf. l'entrée « Spells
> source-inconsistency » plus bas, désormais superseded). Les sorts sont
> produits **strictement** depuis les extractions texte SRD 5.2.1, jamais
> depuis AideDD ni les PDF binaires.

Deux scripts, deux rôles distincts :

| Script | Rôle | Fréquence | Lit | Écrit |
|---|---|---|---|---|
| `scripts/bootstrap-srd-spells.ts` | **One-shot** — parse les 2 extractions texte SRD et émet un module TS révisable. | Manuel, rejoué seulement si le `.txt` source change. | `content-sources/extracted/raw/{SRD,FR_SRD}_CC_v5.2.1.txt` | `scripts/data/srd-spells.ts` (module TS canonique, **révisable à la main**) |
| `scripts/extract-srd-spells.ts` | **Récurrent** — transforme le module TS en JSON bundlé. | À chaque besoin de régénérer le bundle. **Idempotent** (deux runs byte-identiques). | `scripts/data/srd-spells.ts` (TS, **pas** le `.txt`) | `public/data/spells.json` (339 sorts, bilingue, `source: srd-5.2.1`) |

**Pourquoi ce découpage** : le `.txt` SRD comporte des corruptions ponctuelles
(interleaving EN/FR, statblocks aplatis, titres lettre-espacée). Le bootstrap
applique 4 heuristiques de détection + des réparations ciblées, puis fige le
résultat dans un module TS **révisable** — toute correction manuelle (cf.
fallbacks ci-dessous) vit là, sous revue de code, et `extract-srd-spells.ts`
la reproduit déterministiquement. On ne re-parse jamais le `.txt` au runtime du
build.

**Fallbacks ciblés (corrections manuelles dans `scripts/data/srd-spells.ts`)** :
- **Reconstruction de scramble** (commit 2) : `Animate Objects` / `Antilife
  Shell` / `Antipathy/Sympathy` étaient interleavés dans le `.txt` — desentre­lacés
  à la main, mécanique tranchée par l'EN, formulation par le FR (règle d'arbitrage
  EN↔FR, cf. CLAUDE.md).
- **Conflit d'upcast** `Domination de personne` (commit 2) : progression 6e/7e/8e+
  reconstruite, vérifiée page 138 du PDF FR via les sorts voisins intacts
  (`Domination de bête` / `Domination de monstre`).
- **Marqueur D14** : trims de statblocks parasites signalés inline (cf. `plans/DEBT.md > D14`).
- **Letter-spacing résiduel** : `normalizeSpacedTitle` (cf. `plans/DEBT.md > D15`).

**Migration des persos** : les IDs 2014 (AideDD) → SRD 2024 sont remappés au
load par `src/shared/lib/rules/spell-aliases.ts` (table canonique + `migrateSpellIds`).
`scripts/maps/spell-renames-2014-to-2024.ts` n'est qu'un ré-export pour l'audit.

**Re-run** :
```bash
pnpm tsx scripts/bootstrap-srd-spells.ts   # .txt SRD → scripts/data/srd-spells.ts (one-shot)
pnpm tsx scripts/extract-srd-spells.ts     # scripts/data/srd-spells.ts → public/data/spells.json
pnpm tsx scripts/update-content-index.ts   # recalcule index.json (contentHash)
```
⚠️ **NE PAS** utiliser `pnpm content:build` (interdit, cf. CLAUDE.md + `plans/DEBT.md > D17`).

## Items DB strict (réouverture plan 04 post-MVP-classes)

Le bundle initial de plan 04 a livré classes/subclasses/ancestries/backgrounds/conditions mais **pas items.json**, ce qui bloquait plan 05 (équipement de départ). Réouverture propre + parser dédié `parse-srd-equipment.ts` ajouté.

**Couvert (190 items validés Zod)** :

| Bloc | Compte | Stratégie |
|---|---|---|
| `weapons` | 38 (10 simple melee + 4 simple ranged + 18 martial melee + 6 martial ranged) | Tuple-match strict FR↔EN sur `(damage_dice, damage_type_canonical, mastery_canonical, cost)` au sein de chaque catégorie. Fail-loud sur orphelin/collision. Canonicalisation via dicts fermés `weapon-properties-fr-en.ts` (8 masteries SRD 2024, 9 properties, 3 damage types). |
| `armor` | 12 + 1 shield | Tuple-match `(tier, ac_formula_canonical, str_req, stealth_disadvantage, cost)`. Idem fail-loud. |
| `gear` | 82 du tableau Adventuring Gear | Name map explicite hand-authored `gear-fr-en.ts` — le tuple `(weight, cost)` n'est pas unique (~20% de collisions). Couverture exhaustive : chaque ligne FR↔EN doit avoir un match, fail-loud sinon. |
| `gear` (variants Ammunition) | 5 (Arrows, Bolts, Firearm Bullets, Sling Bullets, Needles) | Name map `AMMUNITION_VARIANTS_MAP`. |
| `gear` (variants Arcane Focus) | 5 (Crystal, Orb, Rod, Staff, Wand) | Name map `ARCANE_FOCUS_VARIANTS_MAP`. |
| `gear` (variants Druidic Focus) | 3 (Mistletoe, Wooden staff, Yew wand) | Name map `DRUIDIC_FOCUS_VARIANTS_MAP`. |
| `gear` (variants Holy Symbol) | 3 (Amulet, Emblem, Reliquary) | Name map `HOLY_SYMBOL_VARIANTS_MAP`. |
| `tools` | 25 (17 Artisan + 8 Other) | Section format key:value (pas table) — name map `tools-fr-en.ts`. |
| `tools` (Gaming Set variants) | 4 (Dice, Dragonchess, Playing cards, Three-dragon ante) | Inline data table (cost+weight) + name map. |
| `tools` (Musical Instrument variants) | 10 (Bagpipes…Viol) | Inline data table + name map. |

**2 items synthétiques** ajoutés à `items.json` car référencés par class startingEquipment mais absents du tableau Adventuring Gear :
- `spellbook` : aptitude de classe Magicien, décrit en prose (3 lb, 100 pages, lisible uniquement par le propriétaire ou via Identification).
- `artisans-tools` : placeholder pour « Outils d'artisan au choix » (Moine SRD). À substituer par un outil spécifique au character creation.

### Class startingEquipment (ajout au ClassSchema)

`ClassSchema.startingEquipment` est un objet `{ options: StartingEquipmentChoice[] }` avec 1+ options.

Chaque `StartingEquipmentChoice` : `{ items: { itemId, qty }[], coins: { qty, unit } | null }`. Validation cross-bundle : chaque `itemId` doit exister dans `items.json` (parser fail-loud sinon).

Le parser scanne la section "Starting Equipment" de chaque classe (12), normalise les artefacts kerning ("110 G P" → "110 GP", "En- tertainer's Pack" → "Entertainer's Pack"), tokenize sur virgules + "and", résout chaque token via `scripts/maps/starting-equipment-name-map.ts` (~50 entrées). Les modificateurs de prose (« of your choice », « chosen for the tool proficiency above ») sont strippés ; les choix « X or Y » résolvent à l'option canonique X (à raffiner dans plan 17 wizard).

Particularité : **Guerrier a 3 options A/B/C** dans le SRD ; le schema accepte `options: StartingEquipmentChoice[]` (min 1) donc supporte ce cas nativement.

### Background equipment (BackgroundSchema mise à jour)

`BackgroundSchema.equipment` passe de `string[]` (free-string) à `StartingEquipmentItemRef[]` (itemId réel). Champ `startingCoins: { qty, unit } | null` ajouté pour séparer les pièces des items. Les 4 backgrounds hand-authorés (Acolyte, Criminel, Sage, Soldat) sont re-mappés vers des itemIds réels — ex : "Holy Symbol" devient `{ itemId: 'holy-symbol', qty: 1 }`, "8 GP" devient `startingCoins: { qty: 8, unit: 'gp' }`.

L'invariant **items DB strict** de CLAUDE.md est maintenant respecté de bout en bout : aucun free-string nulle part dans le pipeline (classes, backgrounds).

### Tracks différés (notes de continuité)

- **Monsters parser partiel** : id/name/source seulement. Pas bloquant pour plan 05. Session dédiée requise avant S3 plan 24 (combat tracker / DM dashboard) — extension de `parseMonster()` dans `parse-aidedd.ts` pour `.red`/`.carac`/`.rub` divs.
- **DMG inextractible** : 642 chars sur 321 pages (fonts custom/scan via pdf-parse). Privé + optionnel — on l'oublie. Si Adrien veut du contenu DMG plus tard, il fournira un PDF texte ou OCR ciblé.
- **Couche EN sur ancestries traits** : différée à plan 34 (i18n-EN), avec maps FR↔EN explicites par ancestry. Plan 34 inscrit cette tâche.
- ~~**Spells source-inconsistency** : 330 sorts viennent d'AideDD HTML…~~ **SUPERSEDED — plan 13.10** : les sorts ne viennent plus d'AideDD. `public/data/spells.json` est régénéré strict SRD 5.2.1 bilingue (339, 100 % `source: srd-5.2.1`) via le pipeline `bootstrap-srd-spells.ts` → `extract-srd-spells.ts` (cf. section « Sorts — pipeline SRD 5.2.1 bilingue » ci-dessus). La source AideDD est retirée du chemin sorts de `build-public-content.ts`.

## Erreurs PDF rencontrées

- `D&D 5 - Guide du maître.pdf` → 642 chars sur 321 pages. PDF non extractible (fonts custom ou scan). DMG-private upload bloqué.
- `D&D 5 - La Malédiction de Strahd.pdf` → 516 chars sur 258 pages. Idem inutilisable.
- Autres modules d'aventure : extractions variables, mais hors scope plan 04 (privés Firestore).

## Re-run

Pour ré-extraire / re-parser :
```bash
pnpm content:extract-pdf      # PDFs → text
pnpm content:parse-aidedd     # AideDD HTML → JSON
pnpm content:parse-srd        # (si écrit) SRD text → JSON
pnpm content:build            # merge → public/data/*.json
```
