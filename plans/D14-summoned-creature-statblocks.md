# Plan D14 — Profils de créatures invoquées (statblocks) comme type de contenu distinct

> **CLOS 2026-05-25.** D14 résolu (commits `e3e1c3f` + `bd8fc28` + `2408b71` + clôture docs). Nouveau type de contenu `summoned-creatures` (4 statblocks SRD curés à la main, schéma distinct de `MonsterSchema` à cause des formules d'AC/HP qui scalent avec le niveau de slot). Les 4 sorts (`appel-de-destrier` / `animation-des-objets` / `insecte-geant` / `convocation-de-dragon`) pointent leur statblock et ne portent plus aucun marqueur de dette. `SpellDetailModal` rend `SummonedCreatureStatBlockCard` inline. Garde durcie : `DEBT_D14_SPELL_SLUGS` allowlist supprimée — la classe « marqueur de dette qui fuit en prod » est désormais structurellement impossible. Quadruple gate verte à chaque commit. UAT visuel : 8 captures `uat-review/` (4 sorts × pleine page + viewport).
>
> **Mini-plan content+UI.** Résolvait `plans/DEBT.md > D14`. Nouveau type de contenu `summoned-creatures` (schéma Zod + bundle `public/data/summoned-creatures.json` + extracteur SRD-only) + lien `spell.summonedCreatureIds[]` + rendu UI dans `SpellDetailModal`. Retire les 4 marqueurs `[Profil … suivi en dette D14.]` de `srd-spells.ts`. Branche dédiée + PR (paths protégés touchés). 4 commits + clôture docs.

## Contexte

Tracée 2026-05-20 à la livraison du plan 13.10 commit 1 : 4 sorts SRD 5.2.1 référencent un **profil de créature invoquée** que le bundle ne porte pas. L'extraction PDF avait aplati les statblocks en prose illisible (`MODSAVEMODSAVEMODSAVE`, `For 18+4 +4Dex…`) et causé un scramble inter-sorts ; choix de **trim + marqueur user-visible** au commit 1 du plan 13.10. La dette est aujourd'hui résoluble : on extrait proprement les 4 statblocks du PDF SRD (manuel, vérifié page par page), on les bundle comme un **type de contenu distinct** (pas de greffe dans `description`), et on les rend inline sous la description du sort.

Les 4 sorts concernés (slug FR → nom EN du statblock) :

| Slug FR | Sort | Niveau | Statblock | Pages PDF |
|---|---|---|---|---|
| `appel-de-destrier` | Find Steed → Otherworldly Steed | 2 | Monture d'outre-monde | EN 12760-12792 / FR 12058-12099 |
| `animation-des-objets` | Animate Objects → Animated Object | 5 | Objet animé | EN 10402-10420 / FR 11930-11949 |
| `insecte-geant` | Giant Insect → Giant Insect | 4 | Insecte géant (3 formes : mille-pattes, araignée, guêpe) | EN 13252-13282 / FR 16303-16336 |
| `convocation-de-dragon` | Summon Dragon → Draconic Spirit | 5 | Esprit draconique | EN 16545-16574 / FR 13829-13861 |

## Décisions techniques (Claude, autonomie maximale — session « énorme »)

### Schéma de données — type distinct `SummonedCreatureStatBlock`

Réutiliser `MonsterSchema` (`src/shared/types/content.ts:116`) **ne marche pas** : `MonsterSchema` exige `ac: number`, `hp: { avg, formula }`, `cr: number` — toutes des valeurs **fixes** assumées par les monstres SRD. Or les 4 statblocks d'invocation scalent **avec le niveau de slot** (`AC 10 + 1 per spell level`, `HP 5 + 10 per spell level`, etc.) et n'ont pas de FP (`CR None`). Forcer ce modèle exigerait soit (a) un statblock par niveau de slot (× 5-7 par sort = explosion), soit (b) corrompre l'invariant `hp.avg` avec une formule sentinel. Les 2 options trahissent le modèle.

→ Nouveau type `SummonedCreatureStatBlock` distinct, avec :
- `acFormula: I18n` (string libre, ex. `"10 + 1 par niveau du sort"`)
- `hpFormula: I18n` (string libre, ex. `"50 + 10 par niveau au-delà du 5ᵉ"`)
- `speed: I18n` (string libre, ex. `"9 m, nage 9 m, vol 18 m"`)
- `abilities: { for, dex, con, int, sag, cha }` (entiers — invariants par statblock)
- `senses: I18n`, `languages: I18n`, `challenge: I18n`
- `resistances: I18n[]`, `immunities: I18n[]` (optionnels)
- `traits / actions / bonusActions / reactions: NamedDescription[]`

Les variantes (Animated Object × 3 tailles ; Giant Insect × 3 formes ; Otherworldly Steed × 3 types Céleste/Fée/Fiélon) sont encodées **dans les noms d'action** (« Web Bolt (Spider Only) », « Healing Touch (Celestial Only) ») — pas de `variants[]` structuré. C'est le format SRD lui-même : la créature **est unique**, certaines actions sont conditionnelles à un descripteur de forme choisi à l'incantation. Pas la peine de modéliser la sélection : c'est un acte de jeu, pas une donnée. Le `description: I18n` du statblock peut porter le préambule narratif si besoin (« Choisissez à l'incantation… »).

### Relation sort ↔ statblock

`spell.summonedCreatureIds: z.array(slug).default([])` (tableau, pas singleton — un sort futur pourrait référencer plusieurs créatures). Les 4 sorts portent un seul ID chacun. Test d'intégrité référentielle : `tests/content-referential-integrity.test.ts` étendu pour valider que chaque `summonedCreatureIds[i]` résout dans `summoned-creatures.json`.

### Pipeline d'extraction

Pattern existant (cf. `extract-srd-feats.ts`, `extract-srd-invocations.ts`) : la donnée vit dans `scripts/data/srd-summoned-creatures.ts` (TS, hand-curated SRD 5.2.1, citations PDF inline), l'extracteur `scripts/extract-srd-summoned-creatures.ts` la valide + écrit `public/data/summoned-creatures.json` (sortie déterministe, idempotente). L'orchestrateur `scripts/build-public-content.ts` ajoute l'extracteur à `SRD_EXTRACTORS`. L'index `public/data/index.json` gagne la clé `summoned-creatures: 4`.

### Rendu UI

Composant `SummonedCreatureStatBlockCard` (`src/features/sheet/modes/magie/summoned-creature-stat-block-card.tsx`), rendu **inline** sous la description du sort dans `SpellDetailModal` (entre la description et le bloc « À niveau supérieur »). Visuellement : carte distincte avec border accent (gold/amethyst), titre du statblock, métadonnées en grille (CA / PV / vitesse / type), tableau caractéristiques, sections Traits / Actions / Actions Bonus / Réactions. Aucun lien dynamique vers une autre route — le statblock est consultatif, le MJ le joue depuis là. Pas de sélecteur de forme/taille : les actions explicitent « (X uniquement) ».

Pas de sous-modale ni de navigation : la créature invoquée n'a pas de vie propre dans l'app (S1) ; elle vit visuellement dans le contexte du sort qui l'invoque. Si un jour on ajoute un mode « créatures contrôlées » côté MJ (S3+), on lie depuis là vers la même carte composant.

### Tests

- Test d'identité du contenu (cat. 2) sur les 4 statblocks : ouvrir la modale du sort → asserter que le statblock affiché a le `name.fr` attendu + `acFormula.fr` + 1 action canonique.
- Test de fidélité bundle (cat. 3) : 2 statblocks figés (Monture d'outre-monde + Esprit draconique) avec leurs valeurs exactes (For/Dex/.../Cha + acFormula + hpFormula + 1 action) — détecte une dérive du bundle.
- Test d'intégrité référentielle : `spell.summonedCreatureIds` résout.
- Test extracteur : run dryrun produit le bundle attendu, byte-identique.
- Garde anti-marqueur : retirer `DEBT_D14_SPELL_SLUGS` (allowlist devient sans objet), durcir `expectIdentityRender` pour échouer sur **tout** marqueur `[dette D14]` ou `[Profil … D14]` qui fuirait — la classe entière du bug est désormais structurellement impossible (statblock injecté ⇒ pas de marqueur dans `atHigherLevels`).

## Structure des commits

### Commit 1 — Schéma + données curées + bundle + extracteur
- [x] 1. Ajouter `SummonedCreatureStatBlockSchema` + type `SummonedCreatureStatBlock` dans `src/shared/types/content.ts`. Enregistrer dans `ContentTypeSchemas` + `ContentEntityByKey` sous la clé `summoned-creatures`.
- [x] 2. Créer `scripts/data/srd-summoned-creatures.ts` : 4 statblocks hand-curated avec citations PDF inline (lignes EN + FR par statblock).
- [x] 3. Créer `scripts/extract-srd-summoned-creatures.ts` : valide via Zod, écrit `public/data/summoned-creatures.json` (tri déterministe par id, sortie stable `JSON.stringify(.., null, 2) + '\n'`).
- [x] 4. Ajouter l'extracteur à `SRD_EXTRACTORS` dans `scripts/build-public-content.ts`. Mettre à jour `scripts/update-content-index.ts` pour inclure le nouveau bundle dans l'index counts.
- [x] 5. Lancer `pnpm tsx scripts/extract-srd-summoned-creatures.ts` puis `pnpm tsx scripts/update-content-index.ts` ; vérifier `public/data/summoned-creatures.json` (4 entrées) + `public/data/index.json` (clé `summoned-creatures: 4` + nouveau hash).
- [x] 6. Quadruple gate Node 22.

### Commit 2 — Lien sort ↔ statblock + retrait des 4 marqueurs D14
- [x] 7. Ajouter `summonedCreatureIds: z.array(slug).default([])` à `SpellSchema` (`src/shared/types/content.ts`).
- [x] 8. `scripts/data/srd-spells.ts` : retirer les 4 marqueurs `[Profil de la créature invoquée non inclus ici — voir le profil du SRD 5.2.1 ; suivi en dette D14.]` (FR + EN) ; ajouter `summonedCreatureIds: ['<id>']` aux 4 sorts.
- [x] 9. Régénérer `public/data/spells.json` (via `pnpm tsx scripts/extract-srd-spells.ts`).
- [x] 10. Étendre `tests/content-referential-integrity.test.ts` : valider que `spell.summonedCreatureIds[i]` résout dans `summoned-creatures.json`.
- [x] 11. Retirer la garde anti-marqueur D14 (`DEBT_D14_SPELL_SLUGS` dans `tests/helpers/content-truth/identity.ts`) — durcir `expectIdentityRender` pour échouer sur **tout** marqueur `[dette D14]` ou `[Profil … D14]`. Rouge-avant-vert : ce test échoue sur l'état AVANT le retrait des marqueurs, vert APRÈS.
- [x] 12. Quadruple gate Node 22.

### Commit 3 — Rendu UI dans SpellDetailModal
- [x] 13. Créer `src/features/sheet/modes/magie/summoned-creature-stat-block-card.tsx` : composant pur, props `statBlock: SummonedCreatureStatBlock`, rendu carte (header titre/type/alignement, grille métadonnées CA/PV/vitesse/sens/langues/FP, table abilities, listes traits/actions/bonus/réactions).
- [x] 14. `src/features/sheet/modes/magie/spell-detail-modal.tsx` : si `spell.summonedCreatureIds.length > 0`, charger les statblocks via `loadPublicContent('summoned-creatures')`, rendre `<SummonedCreatureStatBlockCard />` sous la description, avant `À niveau supérieur`. Utiliser `useMemo` pour résolution + handle proprement le case empty (statblock manquant = warning silencieux, pas de crash).
- [x] 15. Tests RTL : `tests/.../spell-detail-modal-summoned.test.tsx` — ouvre la modale d'Appel de destrier, asserte présence du titre « Monture d'outre-monde » + `CA 10 + 1 par niveau du sort` + action « Coup d'outre-monde » ; idem 1 test pour Animation des objets (vérifier le préambule + format scale par taille).
- [x] 16. Test cat. 3 fidélité bundle (figé) : 2 statblocks complets dans `tests/wizard-matrix/expectations/summoned-creatures.fixture.ts` (Monture d'outre-monde + Esprit draconique).
- [x] 17. Quadruple gate Node 22.
- [x] 18. UAT navigateur Adrien : 4 captures pleine page (une par sort) dans `uat-review/`.

### Commit 4 — Clôture docs (D14 résolu)
- [x] 19. `plans/DEBT.md > D14` : bascule en `## Résolu` avec hash du commit 3 ; mettre à jour la `## D14` historique avec la mention « résolue par plan D14 ».
- [x] 20. Banner CLOS en tête du présent plan + `## Notes for next plan`.
- [x] 21. Quadruple gate Node 22.

## Décisions de cadrage assumées

- **Pas de variantes structurées** (Animated Object × 3 tailles, Giant Insect × 3 formes, Otherworldly Steed × 3 types) : encodées dans les noms d'action (« (Spider Only) »), pas un champ `variants[]`. Justification : le SRD lui-même ne sépare pas, c'est un descripteur conditionnel choisi à l'incantation, pas une entité distincte.
- **Pas de cast automatique** : la modale rend le statblock pour consultation, le MJ joue depuis là. Pas de bouton « lancer attaque de la créature » — c'est `D14` qui complète `D1` (`spell.damage[]`) côté sort, pas un moteur de combat de créature invoquée (relèverait d'un futur plan S3+ « créatures contrôlées »).
- **Pass-through orchestrateur (`build-public-content.ts`)** : le nouveau bundle est généré par sous-process `tsx` comme les autres extracteurs SRD ; pas de pass-through (c'est purement SRD-sourcé).
- **Garde anti-marqueur durcie** : remplace `DEBT_D14_SPELL_SLUGS` allowlist. La classe entière (« un marqueur de dette fuit en prod ») devient structurellement impossible. Lignée du refactor `SpellList: string|null → ReadonlyMap` du plan 13.14b.
- **Naming des IDs** : `monture-d-outre-monde`, `objet-anime`, `insecte-geant-invoque` (suffixe `-invoque` pour disambiguer d'un éventuel monstre du même nom), `esprit-draconique`. Kebab-case FR, cohérent avec les autres bundles.
- **Terminologie FR** : noms et phrasés repris **verbatim** du PDF FR SRD (lignes citées dans `scripts/data/srd-summoned-creatures.ts`). Aucune invention.

## Definition of Done

- [x] `public/data/summoned-creatures.json` existe (4 entrées) ; `public/data/index.json` inclut la clé + le nouveau `contentHash`.
- [x] Les 4 sorts (`appel-de-destrier`, `animation-des-objets`, `insecte-geant`, `convocation-de-dragon`) ne portent plus aucun marqueur `[Profil … D14]` ni `[dette D14]` (grep zéro).
- [x] Les 4 sorts portent `summonedCreatureIds: [<slug>]` résolvable dans le bundle.
- [x] `SpellDetailModal` rend le statblock inline sous la description pour ces 4 sorts.
- [x] `tests/content-referential-integrity.test.ts` vert ; `tests/helpers/content-truth/identity.ts` n'expose plus `DEBT_D14_SPELL_SLUGS` ; nouveau test de fidélité bundle vert ; tests RTL verts.
- [x] Quadruple gate Node 22 sur chaque commit (`pnpm typecheck && pnpm test && pnpm lint && pnpm test:e2e`).
- [x] UAT Adrien validé sur 4 captures `uat-review/`.
- [x] PR mergée via merge-commit ; CI 4 jobs verts ; `protected-paths-guard` vert sur main post-merge.
- [x] `plans/DEBT.md > D14` en `## Résolu` avec hash du commit.

## Notes for next plan

- **Pattern « contenu distinct sans entité de jeu autonome »** acté ici : `summoned-creatures` est un type de contenu CONSULTATIF (le statblock vit dans la modale du sort qui l'invoque, pas comme une route ou un objet contrôlable). Réutilisable pour : familiers du Pacte de la chaîne (D13), créatures invoquées par d'autres sorts futurs, NPC d'aventure. Le coût (schéma + bundle + extracteur + carte UI) est modéré et le bénéfice double : (a) zéro greffe de prose illisible dans `description`, (b) un seul endroit à modifier pour rafraîchir un statblock vs N descriptions.
- **Encodage des variantes par nom d'action** acté : « (Spider Only) » dans `actions[i].name` est le pattern SRD lui-même — pas la peine de modéliser un `variants[]` structuré tant qu'aucun moteur de combat ne veut sélectionner la variante. Si plus tard on câble « le MJ choisit la forme de l'insecte invoqué », un champ `variantTag?: string` sur `namedDescription` suffira sans refonte.
- **Garde « marqueurs de dette » structurellement impossible** : la suppression de `DEBT_D14_SPELL_SLUGS` est le 3ᵉ exemple (après refactor `SpellList: string|null → ReadonlyMap` du 13.14b et split `character.ac` invariant + `computeDisplayedAc` dérivé du 13.14b) du principe « refactor types pour rendre la classe de bug structurellement impossible ». À reprendre par défaut sur les prochaines dettes éditoriales (D15 espaces parasites, D16 audit D.3 — toute famille de bug attrapée une fois doit être attrapée deux fois par le type, pas par une allowlist).
- **Le piège double-overflow de `DetailModal`** est documenté dans la spec UAT : `max-h-[90vh]` racine + `flex-1 overflow-y-auto` interne. Toute spec UAT future qui veut capturer le **contenu** complet d'une modale (vs son ressenti d'overlay) doit neutraliser les DEUX. Le helper de capture (`tests/e2e/helpers/screenshot.ts`) gagnerait une option `unfurlModal: true` à standardiser.
- **L'orchestrateur `build-public-content.ts` accueille naturellement un nouveau type SRD-only** : ajouter l'extracteur à `SRD_EXTRACTORS` + le type à `update-content-index.ts > TYPES` suffit. Pattern reproductible quand on ajoutera d'autres bundles SRD curés à la main (monsters cleanup, magic-items cleanup — pass-through grandfathered actuels).
