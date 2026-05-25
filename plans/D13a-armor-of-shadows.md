# D13a — Armor of Shadows (Eldritch Invocation Warlock) : passif CA câblé

> **🟢 CLOS** — livré 2026-05-25, branche `fix/D13a-armor-of-shadows`. Quadruple
> gate Node 22 verte (typecheck + lint + 1247 tests unit). Premier pas de la
> séquence D13a-e (Warlock invocations). Pose le pattern data-driven que
> D13b-e reprendront en copier-coller adapté.
>
> **Mini-plan dédié à la sous-dette D13a** (cf. `plans/DEBT.md > D13`).
> Périmètre : Armor of Shadows uniquement. Les 4 autres invocations L1
> (Eldritch Mind, Pact of Blade/Chain/Tome) restent ownerisées séparément
> en D13b/c/d/e.

## Goal

L'Occultiste qui choisit l'invocation `armor-of-shadows` au L1 voit sa CA
calculée comme `13 + modificateur de Dextérité` quand il ne porte pas d'armure
(comportement passif équivalent à Armure du mage *à volonté*, conforme au SRD
5.2.1 CC). Le bouclier reste cumulable (n'est pas une armure au sens SRD).
Aucune action utilisateur, aucun slot consommé.

La modale d'invocation affiche une section structurée « Mécanique » avec le
label canonique et la condition d'application.

Le pattern doit être structuré pour que D13b-e (Eldritch Mind, Pact of Blade/
Chain/Tome) soient l'ajout d'une branche supplémentaire au switch de
résolution, pas une refonte.

## Decisions

### Décision 1 — Schéma : registre `slug → effect` séparé du bundle SRD

Le bundle `invocations.json` reste plat (identité + summary FR/EN, dérivé
du SRD via `scripts/data/srd-invocations.ts`). La mécanique runtime vit dans
un module dédié `src/shared/lib/rules/eldritch-invocations.ts` qui mappe
chaque slug à un effet structuré ou `null` (slug L1 connu sans effet câblé
— cas D13b-e en attendant leur livraison).

Choix parallèle à `scripts/data/srd-spell-damage.ts` (D1) — séparation
identité publique (bundle) ↔ effet runtime (registre interne).

### Décision 2 — Effet `passive-mage-armor` encodé en bonus +3 (pas en override)

Mage Armor SRD 5.2.1 : « *the target's base AC becomes 13 + its Dexterity
modifier* ». Sans armure, `character.ac` est posée par le wizard à
`10 + modDEX`. Mage Armor à volonté = `13 + modDEX` = `character.ac + 3`.

Encoder en **bonus +3** plutôt qu'en **override 13+DEX** :
- Garde la composition additive avec les autres modificateurs (bouclier,
  futurs Pacts, etc.) — pas de problème de précédence à ré-encoder.
- Pas besoin d'extraire le modificateur DEX dans le moteur AC — la base
  désarmée le porte déjà via `character.ac`.

### Décision 3 — `computeDisplayedAc` = seul consommateur des modificateurs

Le pattern « rendre la classe de bug structurellement impossible » est
poursuivi : `computeDisplayedAc` reste le seul endroit qui compose la CA
finale. Il appelle maintenant `computeInvocationAcBonus` (extension du
même pattern que `defenseBonus` de D19/D20). Pas de logique CA ailleurs.

### Décision 4 — Modale enrichie via slot `extra` rétrocompatible

`OrderDetailModal` reçoit un `extra?: ReactNode` optionnel rendu sous la
prose `summary`. Les callers existants (`DivineOrderCard`,
`PrimalOrderCard`) ne le passent pas → no-op pour eux. `InvocationsCard`
passe `<InvocationEffectCard slug={opened.id} />` qui rend l'effet
structuré (uniquement pour les invocations avec effet câblé) ou `null`
sinon.

`InvocationEffectCard` est parallèle à `SpellDamageCard` (D1) — bordure
gold cinabre pour l'identifier comme bloc « mécanique » distinct de la
prose SRD.

### Décision 5 — Terminologie FR

- « Armure du mage » (Mage Armor) : présent dans le bundle SRD FR sous le
  slug `armure-du-mage` — terminologie WotC FR officielle.
- « Modificateur de Dextérité » : forme officielle du bundle SRD FR
  (pas « mod DEX », argot).
- « Manifestation occulte » (Eldritch Invocation) : déjà acté plan 13.9
  commit 4e (Black Book Editions PHB FR / SRD FR officiel).
- « Mécanique » : titre de la section structurée — neutre et utilisé déjà
  en design system français pour les fiches mécaniques.

## Steps

- [x] 1. Registre `src/shared/lib/rules/eldritch-invocations.ts`. Type
      discriminated union `PassiveInvocationEffect` (kind: 'passive-mage-armor'
      pour aujourd'hui, extensible pour D13b-e). Map des 5 slugs L1 SRD avec
      `effect` câblé pour `armor-of-shadows` uniquement (`null` pour les 4
      autres). Helpers `getInvocationEntry`, `getKnownInvocationSlugs`,
      `computeInvocationAcBonus`.
- [x] 2. Tests registre `src/shared/lib/rules/__tests__/eldritch-invocations.test.ts` —
      13 tests : cat. 3 (les 5 slugs L1 connus), effet câblé pour AoS,
      4 autres slugs sans effet, slug inconnu → null, propagation
      multi-classe, déduplication, gate `requiresUnarmored`.
- [x] 3. Extension `computeDisplayedAc` : compose `base + defenseBonus +
      invocationBonus`. Pattern « seul consommateur » respecté.
- [x] 4. Tests intégration `ac.test.ts` (+7 cas D13a) et déjà couverts par
      `ac-from-character.test.ts` côté pipeline complet. Cas rouge-avant-vert
      sur cas 1 (base désarmée +3), cas 3 (shield only +3 cumulé), cas 5 bis
      (multi-classe Warlock × Fighter unarmored).
- [x] 5. Composant `src/features/sheet/modes/essence/invocation-effect-card.tsx`
      parallèle à SpellDamageCard. Rend `null` si pas d'effet câblé. Pour
      `passive-mage-armor` : titre « Mécanique », label « CA = 13 +
      modificateur de Dextérité », condition « Sans armure équipée, bouclier
      cumulable ».
- [x] 6. Tests `invocation-effect-card.test.tsx` — 7 tests : identité du label
      pour AoS, 4 autres slugs L1 → `null`, slug inconnu → `null`.
- [x] 7. Extension `OrderDetailModal` avec slot `extra?: ReactNode`. Caller
      `InvocationsCard` passe `<InvocationEffectCard slug={opened.id} />`.
      Callers existants (DivineOrderCard, PrimalOrderCard) inchangés.
- [x] 8. Tests `invocations-card.test.tsx` étendus avec 5 cas D13a : la
      modale rend « Mécanique » pour AoS, pas pour les 4 autres invocations
      L1 (test négatif « pas de faux signal »).
- [x] 9. i18n FR + EN : 3 nouvelles clés (`mechanicsTitle`,
      `armorOfShadows.label`, `armorOfShadows.condition`). Terminologie WotC
      FR officielle vérifiée contre bundle SRD FR.
- [x] 10. Quadruple gate Node 22 verte : typecheck + lint + 1247 tests unit.

## Anti-régression

- **Modale Order existante** : DivineOrderCard + PrimalOrderCard n'utilisent
  pas le slot `extra` → leurs tests existants restent verts (vérifié dans
  la triple gate).
- **Multi-classe** : un Warlock·armor-of-shadows × Fighter·defense ne cumule
  jamais Defense et AoS sur le même tour — leurs gates sont mutuellement
  exclusives (`hasEquippedBodyArmor === true` pour Defense, `=== false`
  pour AoS). Test explicite dans `ac.test.ts` cas 5 + 5 bis.
- **Slug corrompu** : un seed avec un slug inconnu dans `eldritchInvocations[]`
  ne crash pas la fiche — déjà couvert par l'InvocationsCard existant +
  test explicite dans `eldritch-invocations.test.ts` et `ac.test.ts`.
- **Pattern réutilisable D13b-e** : pour ajouter Eldritch Mind (passif save
  Concentration), il suffira d'ajouter `kind: 'passive-save-advantage'` au
  `PassiveInvocationEffect` union, peupler le registre, et étendre la
  fonction de calcul correspondante (qui n'existe pas encore — D13b la
  posera, parallèle à `computeInvocationAcBonus`).

## Definition of Done

- Schéma + registre : ✓
- Moteur AC composé (computeDisplayedAc + invocationBonus) : ✓
- Tests rouge-avant-vert prouvés : ✓ (3 cas D13a en rouge sur ac.ts pré-fix,
  35 tests verts en post-fix sur le périmètre AC)
- UI section « Mécanique » dans modale invocation : ✓
- Tests UI invocation-effect-card + invocations-card étendus : ✓
- i18n FR + EN canonique + terminologie WotC FR vérifiée : ✓
- Quadruple gate verte : ✓
- DEBT D13 mis à jour (D13a livré, D13b-e tracé) : ✓
- Commit conventional : ✓

## Notes for next plan

- **D13b — Eldritch Mind** : pattern identique. Ajouter `kind: 'passive-save-
  advantage'` au discriminated union, peupler `eldritch-mind` au registre,
  poser `computeInvocationSaveAdvantage` (parallèle à `computeInvocationAcBonus`).
  Consommer côté moteur de Concentration save quand il existera (plan futur
  S2/S3 — pas encore implémenté).
- **D13c — Pact of the Blade** : moteur d'attaque virtuelle. Pose-t-il un
  problème de schéma ? Probable — `pact-of-the-blade` produit une « arme
  virtuelle » avec stats dérivées (Cha pour atk/dmg, type au choix). À
  encoder soit comme entrée virtuelle dans `inventory.items[]`, soit comme
  un computed `attacksList` côté Combat mode. Décision à prendre en D13c.
- **D13d / D13e** — Pact of Chain + Pact of Tome : moteurs plus complexes
  (familier + granting de sorts). À cadrer post-D13b-c.
