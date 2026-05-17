import { describe, it, expect } from 'vitest';

import { EMPTY_DRAFT, type WizardDraft } from '@/shared/lib/slices/wizard-slice';
import { EMPTY_ANCESTRY_SUB_CHOICES } from '@/shared/types/character';
import type { ClassEntity } from '@/shared/types/content';

import { isAncestryValid } from '../wizard-validation';
import { getMissingAncestrySubChoiceKeys } from '../steps/ancestry/use-ancestry-sub-choices';

/**
 * Tests rouge-puis-vert pour la garde « sous-choix d'ascendance requis »
 * (plan 13.8 step 26-27).
 *
 * Avant le wiring commit 2/3, `isAncestryValid` retournait juste
 * `Boolean(draft.ancestryId)` → ces assertions échouaient. Après wiring
 * via `isAncestrySubChoicesCompleted`, elles passent.
 */

function draftFor(
  ancestryId: WizardDraft['ancestryId'],
  patch: Partial<WizardDraft['ancestrySubChoices']> = {},
): WizardDraft {
  return {
    ...EMPTY_DRAFT,
    ancestryId,
    ancestrySubChoices: { ...EMPTY_ANCESTRY_SUB_CHOICES, ...patch },
  };
}

const NO_CLASSES: ClassEntity[] = [];

describe('isAncestryValid — bloque l\'avance tant qu\'un sous-choix requis reste null', () => {
  it('Drakéide sans dragonAncestry → INVALIDE (rouge avant wiring 13.8)', () => {
    const draft = draftFor('dragonborn');
    expect(isAncestryValid({ draft, classes: NO_CLASSES })).toBe(false);
  });

  it('Drakéide avec dragonAncestry = red → valide', () => {
    const draft = draftFor('dragonborn', { dragonAncestry: 'red' });
    expect(isAncestryValid({ draft, classes: NO_CLASSES })).toBe(true);
  });

  it('Tieffelin avec héritage seul → INVALIDE (manque caract. + taille)', () => {
    const draft = draftFor('tiefling', { tieflingLegacy: 'infernal' });
    expect(isAncestryValid({ draft, classes: NO_CLASSES })).toBe(false);
  });

  it('Tieffelin complet → valide', () => {
    const draft = draftFor('tiefling', {
      tieflingLegacy: 'infernal',
      ancestryCastingAbility: 'cha',
      ancestrySize: 'medium',
    });
    expect(isAncestryValid({ draft, classes: NO_CLASSES })).toBe(true);
  });

  it('Elfe avec lignage + caract. mais pas de skill → INVALIDE', () => {
    const draft = draftFor('elf', {
      elfLineage: 'drow',
      ancestryCastingAbility: 'int',
    });
    expect(isAncestryValid({ draft, classes: NO_CLASSES })).toBe(false);
  });

  it('Elfe complet (lignage + caract. + skill) → valide', () => {
    const draft = draftFor('elf', {
      elfLineage: 'drow',
      ancestryCastingAbility: 'int',
      ancestryExtraSkill: 'perception',
    });
    expect(isAncestryValid({ draft, classes: NO_CLASSES })).toBe(true);
  });

  it('Goliath sans goliathAncestry → INVALIDE', () => {
    const draft = draftFor('goliath');
    expect(isAncestryValid({ draft, classes: NO_CLASSES })).toBe(false);
  });

  it('Goliath avec goliathAncestry = storm → valide', () => {
    const draft = draftFor('goliath', { goliathAncestry: 'storm' });
    expect(isAncestryValid({ draft, classes: NO_CLASSES })).toBe(true);
  });

  it('Humain sans taille ni skill → INVALIDE', () => {
    const draft = draftFor('human');
    expect(isAncestryValid({ draft, classes: NO_CLASSES })).toBe(false);
  });

  it('Humain complet (taille + skill) → valide', () => {
    const draft = draftFor('human', {
      ancestrySize: 'medium',
      ancestryExtraSkill: 'athletics',
    });
    expect(isAncestryValid({ draft, classes: NO_CLASSES })).toBe(true);
  });

  it('Gnome sans lignage → INVALIDE', () => {
    const draft = draftFor('gnome');
    expect(isAncestryValid({ draft, classes: NO_CLASSES })).toBe(false);
  });

  it('Gnome complet → valide', () => {
    const draft = draftFor('gnome', {
      gnomeLineage: 'forest',
      ancestryCastingAbility: 'sag',
    });
    expect(isAncestryValid({ draft, classes: NO_CLASSES })).toBe(true);
  });

  it.each(['dwarf', 'halfling', 'orc'])(
    'ancestrySimple (%s) → valide sans sous-choix (aucun requis SRD)',
    (id) => {
      const draft = draftFor(id);
      expect(isAncestryValid({ draft, classes: NO_CLASSES })).toBe(true);
    },
  );

  it('ancestryId null → INVALIDE (pas encore choisi)', () => {
    const draft = draftFor(null);
    expect(isAncestryValid({ draft, classes: NO_CLASSES })).toBe(false);
  });
});

describe('getMissingAncestrySubChoiceKeys — réponses contractuelles', () => {
  it('Drakéide sans rien → ["dragonAncestry"]', () => {
    expect(
      getMissingAncestrySubChoiceKeys('dragonborn', EMPTY_ANCESTRY_SUB_CHOICES),
    ).toEqual(['dragonAncestry']);
  });

  it('Tieffelin avec héritage seul → manque ancestryCastingAbility + ancestrySize', () => {
    expect(
      getMissingAncestrySubChoiceKeys('tiefling', {
        ...EMPTY_ANCESTRY_SUB_CHOICES,
        tieflingLegacy: 'infernal',
      }),
    ).toEqual(['ancestryCastingAbility', 'ancestrySize']);
  });

  it('Nain → []', () => {
    expect(
      getMissingAncestrySubChoiceKeys('dwarf', EMPTY_ANCESTRY_SUB_CHOICES),
    ).toEqual([]);
  });

  it('null → []', () => {
    expect(
      getMissingAncestrySubChoiceKeys(null, EMPTY_ANCESTRY_SUB_CHOICES),
    ).toEqual([]);
  });
});
