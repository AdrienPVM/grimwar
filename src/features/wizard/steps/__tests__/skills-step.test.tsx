import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useWizardStore } from '@/shared/lib/slices/wizard-slice';
import { EMPTY_ANCESTRY_SUB_CHOICES } from '@/shared/types/character';

import { SkillsStep } from '../skills-step';

/**
 * Anti-régression du bug UAT 13.8 « Humain Compétent non reflété » +
 * bug latent « background Acolyte non rendu côté wizard skills ».
 *
 * Le step Compétences DOIT agréger 3 sources :
 *   1. Skills accordées par le background (déjà gérées avant 13.8 — on
 *      ajoute la garde test pour qu'un futur refactor ne les casse pas).
 *   2. Skill accordée par le sous-choix d'ascendance (`ancestryExtraSkill`
 *      — Humain « Compétent » ou Elfe « Sens Aiguisés »). Avant le fix,
 *      cette source était IGNORÉE par le wizard.
 *   3. Picks de classe — le pool affichable retire les skills déjà
 *      accordées par background/ancestry, mais le `count` exigé par
 *      `primaryClass.skillChoices.count` reste inchangé (SRD impose que
 *      le joueur dépense ses picks sur des skills encore disponibles).
 *
 * Rouge avant vert : ces tests doivent être rouges sur le code pré-fix
 * de `skills-step.tsx` (qui ne lit que background + class et n'inspecte
 * pas `draft.ancestrySubChoices.ancestryExtraSkill`). Le 3e test (count
 * Magicien préservé) prouve qu'on ne réduit JAMAIS le count quand le
 * pool est réduit par un doublon.
 */

const WIZARD_FIXTURE = {
  id: 'wizard',
  name: { fr: 'Magicien', en: 'Wizard' },
  hitDie: 'd6',
  primaryAbility: ['int'],
  saveProficiencies: ['int', 'sag'],
  armorProficiencies: [],
  weaponProficiencies: [],
  toolProficiencies: [],
  // Pool Magicien SRD 2024 — Arcanes/Histoire/Perspicacité/Investigation/Médecine/Nature/Religion.
  // On cible explicitement « Arcana » pour pouvoir exercer le doublon Humain+Magicien
  // sur cette skill spécifique. La string brute « In- sight » reproduit le bruit
  // d'extraction PDF traité par `resolveSkillIds`.
  skillChoices: {
    count: 2,
    from: ['Arcana', 'History', 'In- sight', 'Investigation', 'Medicine', 'Nature', 'Religion'],
  },
  spellcasting: { ability: 'int', progression: 'full' },
  startingEquipment: { options: [{ items: [], coins: null }] },
  description: { fr: '.', en: '.' },
  features: [],
  source: 'srd-5.2.1',
} as const;

const ACOLYTE_FIXTURE = {
  id: 'acolyte',
  name: { fr: 'Acolyte', en: 'Acolyte' },
  description: { fr: '.', en: '.' },
  skillProficiencies: ['Insight', 'Religion'],
  toolProficiencies: [],
  languages: 0,
  equipment: [],
  startingCoins: null,
  feature: { name: { fr: '.', en: '.' }, description: { fr: '.', en: '.' } },
  source: 'srd-5.2.1',
} as const;

vi.mock('@/shared/hooks/use-content', () => ({
  useContent: (type: string) => {
    if (type === 'classes') return { data: [WIZARD_FIXTURE], loading: false, error: null };
    if (type === 'backgrounds') return { data: [ACOLYTE_FIXTURE], loading: false, error: null };
    return { data: [], loading: false, error: null };
  },
}));

interface DraftSetup {
  primaryClassId?: string;
  backgroundId?: string;
  ancestryExtraSkill?: string | null;
  pickedSkills?: string[];
}

function seedDraft(setup: DraftSetup = {}): void {
  useWizardStore.setState((state) => ({
    ...state,
    draft: {
      ...state.draft,
      primaryClassId: setup.primaryClassId ?? 'wizard',
      classes: [
        {
          classId: setup.primaryClassId ?? 'wizard',
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
      backgroundId: setup.backgroundId ?? null,
      ancestryId: 'human',
      ancestrySubChoices: {
        ...EMPTY_ANCESTRY_SUB_CHOICES,
        ancestryExtraSkill: setup.ancestryExtraSkill ?? null,
      },
      pickedSkills: setup.pickedSkills ?? [],
    },
  }));
}

afterEach(() => {
  useWizardStore.getState().reset();
});

beforeEach(() => {
  useWizardStore.getState().reset();
});

/**
 * Retourne la checkbox accessibilité-friendly pour un nom de skill (FR).
 * `getByRole('checkbox', { name })` cherche dans le label combiné, y compris
 * le tag « via X ». On normalise par regex pour ne pas casser au moindre
 * réordonnancement du label.
 */
function getSkillCheckbox(label: RegExp): HTMLInputElement {
  return screen.getByRole('checkbox', { name: label }) as HTMLInputElement;
}

describe('SkillsStep — agrégation des sources de maîtrise (anti-régression UAT 13.8)', () => {
  it('Acolyte → Perspicacité + Religion cochées + verrouillées avec tag source', () => {
    seedDraft({ backgroundId: 'acolyte' });
    render(<SkillsStep />);

    const insight = getSkillCheckbox(/Perspicacité/i);
    const religion = getSkillCheckbox(/Religion/i);
    expect(insight.checked).toBe(true);
    expect(insight.disabled).toBe(true);
    expect(religion.checked).toBe(true);
    expect(religion.disabled).toBe(true);
  });

  it('Humain Compétent (Arcanes) → Arcanes cochée + verrouillée avec tag d\'ascendance', () => {
    seedDraft({ ancestryExtraSkill: 'arcana' });
    render(<SkillsStep />);

    const arcana = getSkillCheckbox(/Arcanes/i);
    expect(arcana.checked).toBe(true);
    expect(arcana.disabled).toBe(true);
  });

  it('Magicien + Acolyte → count reste 2/2 même si pool a Religion accordée par background (pool réduit, count préservé)', () => {
    // Acolyte accorde Religion ET Perspicacité, qui sont 2 des 7 skills du
    // pool Magicien. Le joueur DOIT pouvoir piquer 2 skills supplémentaires
    // parmi les 5 restantes (Arcanes/Histoire/Investigation/Médecine/Nature).
    seedDraft({
      backgroundId: 'acolyte',
      pickedSkills: ['arcana', 'history'],
    });
    render(<SkillsStep />);

    // Compteur visible : « Compétences à choisir : 2 / 2 ». Le « 2 / 2 »
    // (count de classe) est figé indépendamment des grants externes.
    expect(screen.getByText(/2\s*\/\s*2/)).toBeTruthy();

    // Religion (accordée par background) reste cochée + verrouillée — pas
    // re-piquable, mais ne consomme PAS un pick de classe.
    const religion = getSkillCheckbox(/Religion/i);
    expect(religion.checked).toBe(true);
    expect(religion.disabled).toBe(true);

    // Les 2 picks de classe sont Arcanes + Histoire (=2/2). Comptés
    // séparément des grants background.
    const arcana = getSkillCheckbox(/Arcanes/i);
    const history = getSkillCheckbox(/Histoire/i);
    expect(arcana.checked).toBe(true);
    expect(arcana.disabled).toBe(false);
    expect(history.checked).toBe(true);
    expect(history.disabled).toBe(false);
  });

  it('Humain Compétent (Arcanes) + Magicien : Arcanes verrouillée dans le pool de picks (anti-doublon)', () => {
    // Le joueur a choisi Arcanes en sous-choix d'ascendance Humain. À
    // l'étape Compétences, Arcanes doit apparaître cochée+verrouillée et
    // NE PAS être consommable comme pick de classe Magicien. Le count
    // (=2) reste exigeable sur les 6 autres skills du pool.
    seedDraft({ ancestryExtraSkill: 'arcana' });
    render(<SkillsStep />);

    const arcana = getSkillCheckbox(/Arcanes/i);
    expect(arcana.checked).toBe(true);
    expect(arcana.disabled).toBe(true);

    // Compteur reste « 0 / 2 » au démarrage — la skill Arcanes ne compte
    // PAS dans le `pickedCount` de classe.
    expect(screen.getByText(/0\s*\/\s*2/)).toBeTruthy();
  });
});
