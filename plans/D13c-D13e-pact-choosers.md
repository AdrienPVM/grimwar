# D13c-D13e Pact choosers — Wizard L1

CHANTIER B du marathon nuit 3. Référence : dette `D13` (DEBT.md) > followups
`D13c-followup-chooser` (arme de pacte) + `D13e-followup-grant` (sorts du
Codex).

## Décision de scope (confirmée Adrien)

- **Pact of the Blade** : chooser au wizard L1 pour pré-bonder une arme corps-
  à-corps simple OU martiale (SRD 5.2.1).
- **Pact of the Tome** : chooser au wizard L1 pour 3 sorts mineurs + 2 sorts du
  1ᵉʳ niveau Rituel — de n'importe quelle classe (SRD 5.2.1).
- **Pact of the Chain** : pas de chooser de forme. Le SRD 5.2.1 stipule que le
  choix de forme se fait au moment où la feature est utilisée — on conserve
  cette convention. (D13d-followup-chooser reste différé sans propriétaire.)
- **Câblage d'attaque** côté Combat mode (`attacks-list`) : différé à D24
  (encounters). Hors scope ici.
- **Câblage `knownSpells['warlock-tome']`** côté Magie mode : différé à un
  mini-plan ultérieur. Hors scope ici — la sélection est persistée sur la
  fiche `characterClasses[i]`, l'affichage en mode Magie viendra plus tard.

Conséquence : aujourd'hui les choix sont sauvegardés sur la fiche mais ne
modifient ni les attaques en Combat ni les sorts préparés en Magie. Ils sont
exposés via la modale d'invocation (`<InvocationEffectCard>`) en formulation
« vous avez choisi X » plutôt que « choisissez X avec votre MJ ».

## Plan d'exécution

### Commit 1 — Infrastructure conditionnelle des sub-choices

- [ ] `src/shared/types/character.ts` : `characterClassEntrySchema` ajout
  `pactBladeWeapon: slug.nullable().optional()`. Justification commentée :
  la sélection est OPTIONNELLE même quand l'invocation est prise (le wizard
  l'impose, mais la fiche peut perdre la sentinelle après une migration
  V2→V3) ; nullable + optional pour rétrocompat.
- [ ] `src/shared/lib/slices/wizard-slice.ts` : `WizardClassEntry` ajout
  `pactBladeWeapon: string | null` + `pactTomeCantrips: string[]` +
  `pactTomeRituals: string[]` ; `ClassSubChoiceKey` étendu de 3 valeurs ;
  défaut d'init dans `createWizardClassEntry`.
- [ ] `src/features/wizard/steps/class/use-class-sub-choices.ts` :
    - 3 nouvelles clés `pactBladeWeapon`, `pactTomeCantrips`, `pactTomeRituals`.
    - Constantes `PACT_OF_THE_TOME_CANTRIPS_COUNT_L1 = 3`,
      `PACT_OF_THE_TOME_RITUALS_COUNT_L1 = 2`.
    - `getClassSubChoiceKeys(classId)` reste statique pour la base ; nouvelle
      fonction `getConditionalSubChoiceKeys(entry)` retourne les clés
      additionnelles selon `eldritchInvocations` choisies.
    - `getMissingClassSubChoiceKeys(entry)` consomme l'union des deux.
    - `getRequiredCount` et `isSubChoiceMet` étendus.
    - `CLASS_STEP_SUB_CHOICE_KEYS` inclut les 3 nouvelles clés.
- [ ] `src/features/wizard/submit-from-wizard.ts` : recopie les 3 champs vers
  `characterClasses[i]`. Les 2 tome étant déjà dans le schema, juste ajouter
  le champ pactBladeWeapon.
- [ ] `src/features/sheet/upgrade-character-v1-to-v2.ts` : pas touché si pas
  pertinent (schéma optionnel).
- [ ] Tests unit `use-class-sub-choices.test.ts` mis à jour : couvrir les
  combos conditionnels (Warlock sans Blade ni Tome → 1 clé Eldritch ;
  Warlock + Blade → 2 clés ; Warlock + Tome → 3 clés ; Warlock + Blade + Tome
  → 4 clés, mais Tome n'est pas dispo si Blade est pris en single-pick — sauf
  multi-class futur).
- [ ] Quadruple gate Node 22 verte.

### Commit 2 — Pact of the Tome chooser UI + tests

- [ ] `src/features/wizard/steps/class/pact-of-the-tome-chooser.tsx` :
    - Source : `spells.json` filtré `level === 0` pour cantrips, `level === 1`
      AND `ritual === true` pour rituels.
    - Pas de filtre par classe (SRD : « any class »).
    - Sélection 3 cantrips + 2 rituels avec compteurs séparés.
    - Modale détail par sort (réutilise `<DetailModal>`).
- [ ] `class-sub-choices-section.tsx` : rend le chooser si
  `entry.eldritchInvocations.includes('pact-of-the-tome')`.
- [ ] `i18n.ts` : nouvelles clés `wizard.subchoice.pactOfTheTome.*`.
- [ ] Tests cat. 4 (cohérence wizard → fiche) : Warlock + Tome avec 3 cantrips
  + 2 rituels → fiche reçoit les slugs corrects.
- [ ] Tests cat. 6 (cas-limite) : Warlock prend pact-of-the-tome puis le
  désélectionne → les choix Tome sont préservés (mais ignorés à la validation
  car le chooser disparaît).
- [ ] Spec e2e `class-warlock-pact-tome-chooser.spec.ts` : seed Warlock,
  sélectionne Tome, sélectionne 3 cantrips + 2 rituels, vérifie persistance.
- [ ] Quadruple gate Node 22 verte.

### Commit 3 — Pact of the Blade chooser UI + tests + UAT

- [ ] `src/features/wizard/steps/class/pact-of-the-blade-chooser.tsx` :
    - Source : `items.json` filtré `type === 'weapon'`, `weaponCategory in
      { 'simple-melee', 'martial-melee' }`. Trié alphabétique FR.
    - Sélection single-value (radio).
    - Modale détail par arme (poids, propriétés, dégâts).
- [ ] `class-sub-choices-section.tsx` : rend le chooser si
  `entry.eldritchInvocations.includes('pact-of-the-blade')`.
- [ ] `i18n.ts` : nouvelles clés `wizard.subchoice.pactOfTheBlade.*`.
- [ ] Tests cat. 4 (cohérence wizard → fiche) : Warlock + Blade avec arme X
  → fiche reçoit `pactBladeWeapon: 'X'`.
- [ ] Tests cat. 1 (intégrité référentielle) : étendre
  `content-referential-integrity.test.ts` pour vérifier que
  `characterClasses[i].pactBladeWeapon` réfère un slug existant dans
  `items.json` quand il n'est pas null.
- [ ] Spec e2e : étendre la spec Tome ou ajouter une spec Blade.
- [ ] UAT screenshots dans `uat-review/` : 3-4 captures fullPage + viewport
  (chooser Blade, chooser Tome, modale d'invocation rendant le choix).
- [ ] DEBT.md : `D13c-followup-chooser` + `D13e-followup-grant` (volet chooser)
  basculés en `## Résolu` avec SHA. Volet « câblage Combat/Magie » reste
  ouvert sous `D13c-followup-attacks-list` + nouveau `D13e-followup-grant-
  display`.
- [ ] Quadruple gate Node 22 verte.

## Critère de done

- 5/5 CI verts sur PR.
- Merge commit + protected-paths-guard vert sur push:main.
- DEBT.md mis à jour, branche supprimée.

## Notes for next plan

À écrire à la fin.
