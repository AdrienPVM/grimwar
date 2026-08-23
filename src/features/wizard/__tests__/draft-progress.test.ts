import { describe, expect, it } from 'vitest';

import { EMPTY_DRAFT, type WizardDraft } from '@/shared/lib/slices/wizard-slice';

import { describeDraftProgress } from '../draft-progress';

function mkDraft(overrides: Partial<WizardDraft> = {}): WizardDraft {
  return { ...EMPTY_DRAFT, ...overrides };
}

describe('describeDraftProgress', () => {
  it('ne signale rien sur un brouillon vierge', () => {
    expect(describeDraftProgress(mkDraft(), 'identity')).toBeNull();
  });

  it("ne signale rien quand l'utilisateur a avancé sans rien saisir", () => {
    // Cliquer « Suivant » sur un formulaire vide n'est pas un début de
    // personnage : un bandeau ici serait du bruit pur.
    expect(describeDraftProgress(mkDraft(), 'background')).toBeNull();
  });

  it("signale un brouillon dès qu'un nom est saisi", () => {
    const progress = describeDraftProgress(mkDraft({ name: 'Aëlys' }), 'identity');
    expect(progress).not.toBeNull();
    expect(progress?.characterName).toBe('Aëlys');
  });

  it("ignore un nom composé uniquement d'espaces", () => {
    expect(describeDraftProgress(mkDraft({ name: '   ' }), 'identity')).toBeNull();
  });

  it('signale un brouillon nommé plus tard (classe choisie, nom vide)', () => {
    const progress = describeDraftProgress(
      mkDraft({
        classes: [
          {
            classId: 'wizard',
            level: 1,
            clericDivineOrder: null,
            druidPrimalOrder: null,
            fighterFightingStyle: null,
            weaponMasteries: [],
            expertiseSkills: [],
            eldritchInvocations: [],
            wizardSpellbookL1: [],
          },
        ],
      }),
      'class',
    );
    expect(progress).not.toBeNull();
    // `null` et non `''` : l'appelant substitue « Héros sans nom ».
    expect(progress?.characterName).toBeNull();
  });

  it('signale un brouillon sur la seule ascendance', () => {
    expect(describeDraftProgress(mkDraft({ ancestryId: 'human' }), 'ancestry')).not.toBeNull();
  });

  it('signale un brouillon sur le seul historique', () => {
    expect(describeDraftProgress(mkDraft({ backgroundId: 'sage' }), 'background')).not.toBeNull();
  });

  it("situe l'étape courante dans la séquence des 9 étapes", () => {
    const progress = describeDraftProgress(mkDraft({ name: 'Aëlys' }), 'skills');
    // `skills` est la 6ᵉ des 9 étapes (identity, class, ancestry, abilities,
    // background, skills, equipment, spells, recap).
    expect(progress?.stepIndex).toBe(6);
    expect(progress?.stepCount).toBe(9);
    expect(progress?.stepLabelKey).toBe('wizard.step.skills.title');
  });

  it("retombe sur la première étape quand l'étape persistée est inconnue", () => {
    // Un `localStorage` d'une version antérieure peut porter un identifiant
    // d'étape disparu : on préfère un bandeau cohérent à un rendu cassé.
    const progress = describeDraftProgress(
      mkDraft({ name: 'Aëlys' }),
      'etape-disparue' as never,
    );
    expect(progress?.stepIndex).toBe(1);
    expect(progress?.stepLabelKey).toBe('wizard.step.identity.title');
  });
});
