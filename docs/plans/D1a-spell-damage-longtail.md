# D1a — `spell.damage[]` long-tail : 55 sorts SRD restants

> **✅ LIVRÉ 2026-05-25** sur la branche `fix/D1a-spell-damage-longtail`,
> 6 commits bisectables + DEBT D1a → Résolu. **Couverture finale** : 96/339
> sorts SRD avec `damage[]` canonique (50 nouvelles entrées en D1a + 35
> baseline pré-D1 + ~11 baseline déjà présents et non-redéfinis) + 13 sorts
> explicitement exclus avec raison documentée. Test bidirectionnel enforced.
> PR + merge à la suite de ce commit.

## Goal

Au terme du plan :

1. **Tous les sorts SRD 5.2.1 qui infligent des dégâts ont une entrée
   `damage[]` dans `public/data/spells.json`**, hand-curée depuis le SRD CC
   (citations dans les commits, source `content-sources/extracted/raw/SRD_CC_v5.2.1.txt`).
2. La regex `extractDamageFormula` (stopgap D1b) est **retirée** si la
   couverture le permet ; sinon D1b reste ouvert avec note explicite.
3. La matrice cat. 4 (`tests/srd-spell-damage.test.ts`) couvre par pin les
   sorts représentatifs de chaque pattern nouveau (riders, type-au-choix
   multi-types, passifs/terrain, atypiques).
4. Test bidirectionnel : tout slug listé dans `SRD_SPELL_DAMAGE` a une
   entrée dans `spells.json`, et inversement tout sort à formule de dégâts
   détectable est soit dans `SRD_SPELL_DAMAGE`, soit dans la liste explicite
   d'exclusions documentée (heals + bonus + durées + table rolls).

## Inventaire initial

Audit `node` du 2026-05-25 contre `public/data/spells.json` + état actuel
de `SRD_SPELL_DAMAGE` :

- **Total sorts SRD à formule `\d+d\d+` détectable** : 124
- **Déjà couverts par D1** : 43 + 6 (batch 1 D1a déjà sur disque, non
  committé à l'ouverture du plan) = **49**
- **Restant à examiner** : 75

Après scrub manuel (lecture des descriptions FR + EN pour identifier les
faux positifs), **les 75 se décomposent comme suit** :

### À modéliser (DMG, ~55 sorts)

#### Batch 1 — Riders sur attaque (formule auto sur hit, pas de résolution propre) [LIVRÉ sur disque]

- `faveur-divine` (1d4 radiant rider)
- `chatiment-divin` (2d8 radiant rider + slot upcast)
- `malefice` (1d6 necrotic rider, déclaration cible)
- `orbe-chromatique` (3d8 attack-roll, type-au-choix 6)
- `arme-spirituelle` (1d8 attack-roll, modifier ajouté)
- `rayon-de-lune` (2d10 saving-throw radiant recurrent)

#### Batch 2 — Riders complémentaires + cas simples (~8 sorts)

- `marque-du-chasseur` (1d6 force rider sur hit, concentration)
- `malediction` (1d8 necrotic rider conditionnel)
- `agrandissement-rapetissement` (1d4 unarmed rider, variant Enlarge)
- `chatiment-de-revelation` (2d6 radiant rider sur smite touche)
- `modification-d-apparence` (1d6 unarmed rider, growth variant)
- `invocation-d-elementaires-mineurs` (2d8 rider aura)
- `croissance-d-epines` (2d4 piercing terrain, par 5 ft)
- `frappe-piegeuse` (1d6 piercing tick start of turn restrained)

#### Batch 3 — Saving-throw AoE classiques (~20 sorts)

- `assassin-imaginaire` (4d10 psychic)
- `barriere-de-lames` (6d10 force)
- `brume-mortelle` (5d8 poison terrain)
- `cercle-de-mort` (8d8 necrotic)
- `contagion` (11d8 necrotic + condition)
- `contamination` (14d6 necrotic + HP max reduction)
- `controle-de-l-eau` (2d8 bludgeoning sub-effect)
- `eclat-du-soleil` (12d6 radiant + blindness)
- `ennemi-subconscient` (10d10 psychic + frightened)
- `epine-mentale` (3d8 psychic)
- `invocation-d-animaux` (3d10 slashing aura)
- `invocation-d-etres-sylvestres` (5d8 force)
- `metal-brulant` (2d8 fire object touch)
- `mur-d-epines` (7d8 piercing terrain)
- `mur-de-glace` (10d6 cold traversal/break)
- `mur-de-vent` (4d8 bludgeoning save)
- `sphere-glacee` (10d6 cold)
- `tentacules-noirs` (3d6 bludgeoning + restrained)
- `tsunami` (6d10 bludgeoning concentration AoE)
- `chien-de-garde` (4d8 force save sub-effect)

#### Batch 4 — Attack-roll + modifier-added (~6 sorts)

- `lame-de-feu` (3d6 fire attack-roll + spell modifier)
- `main-arcanique` (5d8 force attack-roll, Clenched Fist)
- `epee-arcanique` (4d12 force attack-roll + spell modifier)
- `invocation-de-fee` (3d12 psychic + modifier, emotion trigger)
- `force-fantasmagorique` (2d8 psychic, action subséquente)
- `songe` (3d6 psychic auto sur réveil)

#### Batch 5 — Type-au-choix multi-types (~7 sorts)

- `eruption-ensorcelee` (1d8 cantrip char-scaling, 8 types)
- `esprits-gardiens` (3d8 radiant OR necrotic, alignment)
- `glyphe-de-garde` (5d8 acid/cold/fire/lightning/thunder choisi)
- `interdiction` (5d10 radiant OR necrotic choisi)
- `invocation-d-elementaire` (8d8 type de l'élémentaire)
- `invocation-de-celeste` (4d12 radiant *ou* 4d12 heal au choix)
- `symbole` (10d10 8 effets selon symbole choisi)

#### Batch 6 — Atypiques / triggers / réactifs (~7 sorts)

- `bouclier-de-feu` (2d8 fire OR cold réactif au cast)
- `boule-de-feu-a-retardement` (12d6 fire + stacking +1d6 par tour caster)
- `desintegration` (10d6 + 40 force, save, threshold disintegrate)
- `doigt-de-mort` (7d8 + 30 necrotic save)
- `embruns-prismatiques` (1d8 attack-roll, table d20 → effect par couleur)
- `fusion-dans-la-pierre` (6d6 force auto si pierre détruite)
- `mur-prismatique` (12d6 fire per layer rouge, 6 couches)
- `porte-dimensionnelle` (4d6 force auto si overcapacity)
- `quete` (5d10 psychic charm trigger)
- `mot-de-pouvoir-mortel` (12d12 psychic conditionnel hp threshold)
- `contact-avec-les-plans` (6d6 psychic save auto post-spell)
- `toile-d-araignee` (2d4 fire réactif éphémère)
- `colonne-de-flamme` (5d6 fire + 5d6 radiant dual-type)
- `rayon-affaiblissant` (debuff -1d8 sur dégâts ennemis, pas un dégât en
  soi — encodage spécial avec `condition` debuff narratif, sans dommage
  propre... à arbitrer côté inventaire / NON modélisé en `damage[]`)
- `souhait` (1d10 necrotic per spell level, auto-injury post-wish)

### À exclure (heals + bonus + durées + table rolls, ~20 sorts)

Documentés dans une liste explicite côté tests pour fermer la boucle
bidirectionnelle. **Ne sont PAS des dégâts** :

- Heals (HP restaurés ou HP max) : `soins`, `soins-de-groupe`,
  `mot-de-guerison`, `mot-de-guerison-de-groupe`, `priere-de-guerison`,
  `simulacre-de-vie`, `regeneration`, `festin-des-heros`.
- Bonus aux jets : `benediction` (1d4 add), `imprecation` (-1d4 debuff),
  `assistance` (1d4 add), `resistance` (1d4 réduction).
- Durées / délais : `arret-du-temps` (1d4+1 tours), `controle-du-climat`
  (1d4×10 min), `tremblement-de-terre` (1d6 fissures).
- Table rolls comportement / résultat : `confusion` (1d10 table
  comportement), `clignotement` (1d6 téléport), `reincarnation` (1d10
  espèce), `teleportation` (1d100 outcome).

## Décisions

### Décision 1 — Pattern « rider » modélisé sans `resolution`

Un sort comme `faveur-divine` ou `malefice` ne lance PAS son propre jet de
résolution : le jet est celui de l'arme/sort déclencheur. Le rider porte une
formule fixe et une `condition` qui décrit le trigger.

Encodage : `damage[0].resolution = undefined`, `damage[0].condition.fr` cite
le déclencheur. Tests pinned par un `PINNED_RIDERS` séparé qui vérifie
explicitement l'absence de `resolution`.

### Décision 2 — Multi-types « type-au-choix » : type éditorial par défaut

Pour les sorts dont le type est choisi à l'incantation (orbe chromatique,
glyphe de garde, éruption ensorcelée, etc.), on fige un **type éditorial
par défaut** dans `damage[0].type` (le plus emblématique du sort) et on
documente la liste complète dans `damage[0].condition`. L'UI lit ce type
par défaut pour le chip ; le moteur de cast (futur) lira l'override
joueur.

Le pattern est identique à `souffle-du-dragon` (déjà figé dans D1) et à
`orbe-chromatique` (batch 1).

### Décision 3 — Dégâts qui dépendent du modificateur d'incantation

Sorts comme `arme-spirituelle`, `epee-arcanique`, `lame-de-feu`,
`invocation-de-fee` ajoutent au dé un modificateur d'attribut **dérivé du
caster** (non encodable statiquement).

Encodage : `damage[0].formula` = formule sans le modifier. Le modifier
ajouté est documenté en `condition.fr`. Le moteur `resolveSpellDamage`
ne tente PAS de le résoudre — c'est au caller (futur `handleCast` côté
fiche) d'ajouter le `castingMod` au total final. À ce stade D1a, c'est
informatif/UI uniquement.

### Décision 4 — Sorts NON modélisables : marqués dans liste d'exclusion

`rayon-affaiblissant` est en zone grise (impose -1d8 sur les jets de
dégâts de la cible, pas un dégât en soi). Décision : **NON modélisé en
`damage[]`**, ajouté à la liste d'exclusion documentée côté tests
(« debuff sur dégâts ennemis »).

Idem pour `confusion` (table de comportement, pas de dégât propre).

### Décision 5 — Retrait regex `extractDamageFormula` (D1b)

À la clôture de D1a, vérifier le grep `extractDamageFormula` dans `src/`.
Si zéro consommateur reste, retirer la fonction + ses tests + marquer
D1b résolu. Sinon, garder D1b ouvert avec note explicite sur les
consommateurs restants.

### Décision 6 — Terminologie FR

Source unique de vérité = bundle SRD FR `public/data/spells.json` (champ
`name.fr`) + glossaire `FR_SRD_CC_v5.2.1.pdf`. Aucun terme inventé. Les
labels de dégâts (`feu`, `force`, `radiants`, etc.) reprennent les pluriels
déjà figés par D1 commit 1-2 (`typeLabel.fr`).

## Découpage en commits

- **Commit 1** ✅ déjà sur disque (à committer) : Batch 1 — 6 sorts riders
  + attack-roll + saving-throw (vu plus haut).
- **Commit 2** : Batch 2 — 8 riders complémentaires + cas simples.
- **Commit 3** : Batch 3 — 20 saving-throw AoE classiques.
- **Commit 4** : Batch 4 — 6 attack-roll / modifier-added / cas spéciaux.
- **Commit 5** : Batch 5 — 7 type-au-choix multi-types.
- **Commit 6** : Batch 6 — atypiques / triggers / réactifs (~10 sorts) +
  liste d'exclusion documentée.
- **Commit 7** : Clôture — bilan couverture (objectif ≥ 95 % des sorts à
  dégâts SRD), arbitrage retrait regex `extractDamageFormula` (D1b),
  DEBT D1a → Résolu (et D1b → Résolu si retrait), `## Notes for next plan`.

## Étapes

- [x] 1. Inventaire honnête contre `spells.json` (75 candidates → 55 DMG +
  20 exclusions).
- [x] 2. Plan rédigé.
- [x] 3. Commit 1 — Batch 1 (6 sorts) + plan + DEBT. (SHA `2df8f62`)
- [x] 4. Commit 2 — Batch 2 (8 sorts riders complémentaires). (SHA `d652ba1`)
- [x] 5. Commit 3 — Batch 3 (20 saving-throw classiques). (SHA `56c8371`)
- [x] 6. Commit 4 — Batch 4 (9 attack-roll + cas spéciaux ; absorbe en
  partie le batch 6 du plan initial — Disintegrate, Finger of Death,
  Spirit Guardians, Delayed Blast Fireball, Flame Strike, Arcane Sword,
  Arcane Hand, Flame Blade, Fire Shield). (SHA `95e78ad`)
- [x] 7. Commit 5 — Batch 5 (7 type-au-choix : Sorcerous Burst, Phantasmal
  Force, Glyph of Warding, Conjure Elemental, Conjure Fey, Conjure Celestial,
  Prismatic Spray). (SHA `6eabb91`)
- [x] 8. Commit 6 — Batch 6 (clôture : 3 derniers sorts primaires
  Forbiddance/Symbol/Prismatic Wall + liste d'exclusion + test bidirectionnel
  + DEBT + plan). (SHA à insérer post-commit)
- [x] 9. Pas de commit 7 séparé — la clôture est intégrée au commit 6. D1b
  arbitré : **maintenu ouvert** (la regex stopgap est encore utile pour les
  243 sorts non-damage du bundle dont `damage[]` n'est pas peuplé).

## Definition of Done

- `pnpm typecheck && pnpm test:fast && pnpm test:matrix && pnpm vitest run tests/srd-spell-damage.test.ts && pnpm lint`
  vert sur chaque commit.
- Couverture **≥ 95 %** des sorts SRD à dégâts (≥ 49 + 50 = 99 sur 124
  audités, le reste documenté en liste d'exclusion explicite).
- Test bidirectionnel vert : tout slug du module ↔ entrée bundle ; tout
  sort à formule détectée ↔ couvert OU exclu documenté.
- DEBT D1a → Résolu, D1b arbitré (résolu ou requalifié).
- PR mergée + protected-paths-guard vert sur push:main.

## Notes for next plan

### Couverture finale (2026-05-25)

- **96/339 sorts SRD** avec `damage[]` canonique (vs 35 baseline pré-D1).
  - 35 baseline pré-D1 (préservés)
  - 11 baseline déjà couverts par `SRD_SPELL_DAMAGE` pré-D1a (Call Lightning,
    Chain Lightning, Vampiric Touch, Ice Storm, Witch Bolt, Wall of Fire,
    Vitriolic Sphere, Cone of Cold, Blight, Sunbeam, Fire Storm — laissés
    tels quels, à enrichir éventuellement plus tard pour aligner leur
    `condition.fr` sur la convention `rayon-de-lune`)
  - 50 nouvelles entrées D1a sur 6 commits bisectables (batch 1: 6, batch 2:
    8, batch 3: 20, batch 4: 9, batch 5: 7, batch 6: 3 ; net +50 — l'écart
    avec la liste plan initiale vient de 3 spells qui étaient déjà baseline
    et n'ont pas été redéfinis : `chaine-d-eclairs`, `appel-de-la-foudre`,
    `caresse-du-vampire`)
- **13 sorts exclus explicitement** via `SRD_SPELL_DAMAGE_EXCLUSIONS` (cf.
  `scripts/data/srd-spell-damage.ts` — pénalités conditionnelles, méta,
  threshold, debuff, heals, bonus, tic réactif éphémère).

### Test bidirectionnel (livré)

`tests/srd-spell-damage.test.ts > D1a — (a)/(b)/(b')` :

- (a) Tout slug `SRD_SPELL_DAMAGE` résout dans le bundle.
- (b) Tout sort à motif « NdM dégâts » détectable est SOIT couvert SOIT
  exclus explicitement (zéro zone grise).
- (b') Aucun slug n'est à la fois couvert ET exclus (cohérence).

Cette gate ferme structurellement la classe « sort à dégâts qui passe
entre les mailles ». Tout nouveau sort SRD à dégâts ajouté au bundle
DOIT être soit couvert dans `SRD_SPELL_DAMAGE` soit ajouté à
`SRD_SPELL_DAMAGE_EXCLUSIONS` avec raison — sinon le test échoue dur.

### Patterns livrés (synthèse pour D1c éventuel)

Au-delà des 6 patterns D1, D1a maîtrise désormais 5 patterns supplémentaires :

1. **Rider sur attaque d'arme** (formule sans `resolution`, condition cite
   le trigger : faveur divine, châtiment divin, malédiction…) — `PINNED_RIDERS`.
2. **Formule mixte « XdY + N »** (Disintegrate 10d6+40, Finger of Death 7d8+30)
   — le schéma `formula: z.string()` accepte la concaténation.
3. **Dégâts cumulatifs concentration** (Delayed Blast Fireball : base + tic
   par tour de concentration) — `formula` = base, condition documente
   l'accumulation + la règle d'upcast spécifique.
4. **Sort à 2 effets distincts** (Arcane Hand : attack-roll Clenched Fist +
   auto Grasping Hand après grapple) — 2 entrées `damage[]` avec
   `resolution` différents.
5. **Dégâts réactifs auto sans save** (Fire Shield, Heat Metal, Forbiddance,
   Phantasmal Force récurrent subjectif) — `resolution: 'auto'`,
   condition explicite « pas de jet réduit les dégâts ».

### Convention `rayon-de-lune` systématisée

Le schéma `SpellDamage` n'expose pas de champ structuré pour la
caractéristique de sauvegarde ni le résultat de la réussite (demi-dégâts
ou aucun dégât). Cette info est portée par le texte `condition.fr` /
`condition.en` et **testée par `BATCH3_SAVE_ABILITIES`** : chaque entrée
à `resolution: 'saving-throw'` ajoutée en D1a porte la caractéristique de
sauvegarde textuellement dans `condition.fr` (« Jet de sauvegarde de
Dextérité ; réussite = demi-dégâts. »). Si un futur D1c enrichit le
schéma avec un champ structuré (`saveAbility`/`saveOutcome`), le texte
restera correct — la garde-fou aussi.

### D1b — statut

**Maintenu ouvert**. La regex stopgap `extractDamageFormula` dans
`src/features/sheet/modes/magie/spell-detail-modal.tsx:412` reste utile :

- 243 sorts du bundle n'ont pas `damage[]` (intentionnel — ils n'infligent
  pas de dégâts, ou sont marqués dans `SRD_SPELL_DAMAGE_EXCLUSIONS`).
- Pour les 243 non-damage, la regex retourne `null` → comportement neutre
  (la modale passe à la branche attack-roll d20). Retirer la regex ne
  changerait RIEN pour ces 243 sorts.
- Pour les 13 exclusions, la regex peut accidentellement matcher un motif
  de dés dans la description (ex. Wish « 1d10 par niveau »). Retirer la
  regex SUPPRIMERAIT ce risque de roll erroné — mais c'est un gain marginal
  pour un sort sur lequel le joueur ne va jamais cliquer « rouler les
  dégâts » (Wish n'a pas de bouton dégâts dans le flow normal).

**Décision** : la regex reste pour défense en profondeur. La résoudre
demanderait soit (a) un audit fin du chemin UI pour s'assurer qu'aucune
modale n'appelle `extractDamageFormula` sur un sort qui ne devrait pas
roller, soit (b) un guard structurel basé sur `SRD_SPELL_DAMAGE_SLUGS ∪
SRD_SPELL_DAMAGE_EXCLUSIONS`. Petit chantier hygiène, pas un blocker.
