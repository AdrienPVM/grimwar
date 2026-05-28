# D13e-followup-grant-display — Rendu des sorts grantés par le Pacte du grimoire en mode Magie

## Contexte

Le chooser **Pacte du grimoire** (Warlock L1 invocation `pact-of-the-tome`) a été
livré CHANTIER B nuit 3 (commits `f6d21ac` + `e62e27e`) : la fiche persiste
désormais `classes[warlock].pactTomeCantrips: string[]` (3 sorts mineurs) et
`classes[warlock].pactTomeRituals: string[]` (2 sorts L1 rituels), choisis dans
n'importe quelle classe au wizard L1.

**Ces 5 sorts sont aujourd'hui invisibles côté fiche.** Le mode Magie ne les
rend nulle part — ni dans `SpellList` (qui n'itère que `knownSpells[classId]` +
`preparedSpells[classId]` + `knownSpells.ancestry`), ni dans `SpellDetailModal`
(jamais ouvert pour un sort non listé). Le caveat italique de la modale
`<InvocationEffectCard>` (mode Essence) le signale : « l'intégration au moteur
de sorts est différée à un plan ultérieur ».

Ce plan est ce plan ultérieur.

## Décision SRD : source canonique

Per SRD FR 5.2.1 page 142 (« Pacte du grimoire ») :

> Tant que le grimoire est sur vous, les sorts choisis sont **préparés et
> fonctionnent pour vous comme des sorts d'Occultiste**.

Implications pour le rendu :

1. Les 5 sorts sont **toujours préparés** (cantrips et rituels confondus) tant
   que l'invocation est active.
2. Ils **fonctionnent comme des sorts d'Occultiste** côté mécanique : ability =
   Cha (déjà la stat warlock), focaliseur d'incantation = le grimoire.
3. Pour les rituels, la mention SRD est plus subtile : « can cast those spells
   as Rituals » (EN) → la spec dit qu'ils sont rituels-cast-only — mais l'ajout
   « les sorts choisis sont préparés » dans le FR donne le même résultat
   pratique : ils sont préparés, donc lançables, et leur tag `ritual: true` les
   rend éligibles au cast rituel.

Pour l'instant, **l'intégration mécanique slot/cast** reste différée. Le scope
de ce plan = **affichage** des 5 sorts dans la liste de sorts du mode Magie,
avec une source distincte « Pacte du grimoire » pour ne pas être confondue avec
les sorts de classe.

## Décision terminologique FR

Source : `content-sources/extracted/raw/FR_SRD_CC_v5.2.1.txt` ligne 7540-7560
+ `public/data/invocations.json > pact-of-the-tome.name.fr`.

- **« Pacte du grimoire »** = nom de l'invocation (clef visible dans la fiche
  côté Essence + chooser au wizard).
- **« Codex des Ombres »** = nom du livre invoqué qui contient les sorts.
- **« Sort mineur »** = WotC FR pour cantrip (déjà gravé `CLAUDE.md`).
- **« Rituel »** = WotC FR pour ritual.

**Label de chip retenu** : `« Pacte du grimoire »`. Cohérent avec le label
ancestry (« Héritage Infernal » = nom du sous-choix, pas « Empreinte d'Asmodée »
ou autre fluff). Le chooser au wizard porte ce nom, le label sur la fiche le
porte aussi. Pas de divergence wizard ↔ fiche.

## Surface impactée

Fichiers nouveaux :

- `src/features/sheet/modes/magie/pact-tome-source-label.ts`
  + helper pur qui résout les entries Pacte du grimoire depuis
  `character.classes[i].pactTomeCantrips/pactTomeRituals`.

- `src/features/sheet/modes/magie/__tests__/pact-tome-source-label.test.ts`
  + tests unitaires du helper (cat. 2/4/5/6).

Fichiers modifiés :

- `src/features/sheet/modes/magie-mode.tsx`
  + branche le résolveur + passe la map `pactTomeSourceLabels` à `SpellList` +
  `pactTomeSource` à `SpellDetailModal` quand le sort actif vient du Pacte.

- `src/features/sheet/modes/magie/spell-list.tsx`
  + accepte `pactTomeSourceLabels: ReadonlyMap<string, string>` ;
  + injecte ces sortIds dans `knownSet` + `preparedSet` (per SRD : ils sont
    préparés) ;
  + rendu chip amethyst « Pacte du grimoire » (couleur partagée avec ancestry
    parce que c'est aussi une source non-classe ; distinction par label texte).

- `src/features/sheet/modes/magie/spell-detail-modal.tsx`
  + accepte `pactTomeSource: { label: string } | null` ;
  + rendu chip dans header de la même façon que `ancestrySource`.

- `src/shared/lib/i18n.ts`
  + ajout clés FR + EN pour le label « Pacte du grimoire » / « Pact of the
    Tome » (zéro chaîne en dur per règle `t()`).

- `tests/e2e/warlock-pact-tome.spec.ts` (existante après CHANTIER B) — si elle
  existe, étendre pour assert que les 5 sorts sont visibles dans le mode Magie
  d'un perso warlock L1 avec Pacte du grimoire. (À vérifier en cours
  d'exécution.)

- `src/features/sheet/modes/magie/__tests__/spell-list-pact-tome.test.tsx` ou
  étension du fichier existant `spell-list.test.tsx` pour couvrir le cas warlock
  + Pacte du grimoire (chip dédié, sort visible, collisions classe + tome).

## Découpage des commits

Un seul commit, parce que le périmètre est cohérent (rendre 5 sorts grantés) et
les changements forment un tout testable.

1. `feat(D13e-followup-grant-display): rendre les 5 sorts du Pacte du grimoire
   en mode Magie`
   - module `pact-tome-source-label.ts` + tests
   - extension `magie-mode.tsx` (calcul map + passage props)
   - extension `spell-list.tsx` (prop + knownSet + preparedSet + chip)
   - extension `spell-detail-modal.tsx` (prop + chip)
   - i18n FR + EN
   - tests cat. 2/4/5/6 sur `spell-list.test.tsx`
   - extension `magie-mode.test.tsx` pour le cas warlock + Pacte
   - quadruple gate Node 22 verte

## Critères d'acceptation

- Un Warlock L1 avec `pact-of-the-tome` choisi au wizard et `pactTomeCantrips =
  [a, b, c]` + `pactTomeRituals = [d, e]` voit :
  + les 3 sorts mineurs dans le bloc « Sorts mineurs » avec chip « Pacte du
    grimoire » (et PAS le chip « Sorcier ») ;
  + les 2 sorts L1 dans le bloc « Niveau 1 » avec chip « Pacte du grimoire » et
    badge « Rituel » ;
  + le compteur du chip filtre « Tours · N » inclut les 3 cantrips Pacte ;
  + le compteur du chip filtre « Rituels · N » inclut les 2 rituels Pacte ;
  + le compteur du chip filtre « Préparés · N » inclut les 5 sorts (per SRD :
    ils sont préparés tant que le grimoire est sur le perso).
- Le tap sur un sort Pacte ouvre la `SpellDetailModal` avec :
  + le chip « Pacte du grimoire » visible dans l'en-tête ;
  + le texte complet du sort lisible ;
  + le bouton « Lancer » fonctionnel pour les cantrips (ability = Cha de
    warlock, pas de slot) ; pour les rituels L1, comportement identique aux
    autres sorts L1 connus côté warlock (cf. spell-detail-modal logic).
- Aucun changement de comportement pour les sorts non-Pacte (régression nulle).
- Aucun changement de schéma `Character` (les champs `pactTomeCantrips` /
  `pactTomeRituals` existent déjà).
- Quadruple gate Node 22 verte.
- e2e wizard warlock pact tome reste vert.

## Tests rouge-avant-vert

Pour valider que les tests SpellList nouveaux échouent réellement sur le code
non encore patché :

1. Avant tout patch de `spell-list.tsx`, lancer le nouveau test « Warlock
   Pacte du grimoire → 5 sorts rendus avec chips » → doit échouer (la
   `SpellList` ne connaît pas la nouvelle prop, donc les sorts sont absents de
   `knownSet`).
2. Patcher le code minimum pour rendre vert.

## UAT

Dossier `uat-review/` rempli après le merge de la PR avec captures :
- `01-magie-warlock-pacte-grimoire-cantrips.png` — 3 cantrips Pacte avec chip
- `02-magie-warlock-pacte-grimoire-rituels.png` — 2 rituels L1 Pacte avec chip
- `03-magie-warlock-modale-cantrip-pacte.png` — modale d'un cantrip Pacte ouverte
- `04-magie-warlock-modale-rituel-pacte.png` — modale d'un rituel Pacte ouverte
- `05-magie-non-warlock-regression-libre.png` — fiche non-warlock inchangée

## Dépendances externes

Aucune. Tout est sur disque dans le repo.

## Risques

1. **SpellList existante très chargée en logique** — ajouter une 3e source à
   `knownSet`/`sourceMap` peut introduire un cas de régression sur les chips
   ancestry actuels. Mitigation : ajouter une catégorie test dédiée
   « régression : ancestry inchangée si pactTome map vide » + relire
   attentivement le diff de `useMemo` calcul `knownSet`.

2. **Collision possible** entre `knownSpells[warlock]` et `pactTomeCantrips` —
   un joueur pourrait avoir choisi le même cantrip côté classe ET côté Pacte.
   Per SRD c'est interdit (« sorts que vous n'avez pas déjà préparés ») mais
   nos validateurs wizard ne le bloquent peut-être pas. Décision : si
   collision détectée, on affiche les DEUX chips sur la même ligne (warlock +
   Pacte du grimoire), à l'image de la collision class+ancestry déjà gérée.

3. **Test rouge-avant-vert sur le SpellList** : un faux-vert serait un test
   qui asserterait juste « le sort est dans la liste » sans le scoping
   `within(row)`. À l'image des tests ancestry existants, utiliser
   `spellRowByName` pour scoper chaque ligne et vérifier l'IDENTITÉ du chip.
