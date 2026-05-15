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

## Parsers SRD (à itérer en plans futurs)

Pour ces types, AideDD est insuffisant. Plan 04 livre **stubs validés vides** + warning :

- **Classes** : ~12 entités complexes avec features par niveau, sous-classes, multi-class — parser dédié à écrire en plan séparé.
- **Ancestries (races)** : ~9-10 — disponibles dans SRD FR/EN via headers `## Race`.
- **Backgrounds** : ~13-15 — disponibles dans SRD FR/EN via section "Backgrounds".
- **Conditions** : ~15 — disponibles dans SRD via Appendix A.
- **Rules** : pages de règles générales — corpus large, à scoper.
- **Items basiques** : armes/armures/équipement non-magique — disponibles dans SRD.

Les fichiers `public/data/{type}.json` correspondants sont créés **vides mais valides Zod** (array vide), avec note dans plan 04 sur la dette.

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
