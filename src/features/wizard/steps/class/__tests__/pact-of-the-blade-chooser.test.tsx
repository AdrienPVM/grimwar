import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { EMPTY_DRAFT, useWizardStore } from '@/shared/lib/slices/wizard-slice';
import { createEmptyClassSubChoices } from '@/shared/types/character';

import { ClassSubChoicesSection } from '../class-sub-choices-section';

/**
 * D13c — PactOfTheBladeChooser tests (CHANTIER B).
 *
 * Couverture cat. 1, 4, 5, 6 :
 *   1. Conditionnel : ne rend rien tant que `pact-of-the-blade` n'est pas
 *      dans `eldritchInvocations`.
 *   2. Filtrage SRD : la grille n'expose QUE des armes
 *      `category === 'weapon'` ET `properties` contient `simple-melee` OU
 *      `martial-melee`. Une dague (simple-melee), une épée longue (martial-
 *      melee) y figurent ; un arc long (martial-ranged) n'y figure PAS.
 *   3. Persistance : cliquer une arme persiste son id dans
 *      `classes[warlock].pactBladeWeapon` (single-value).
 *   4. Single-select : cliquer une seconde arme remplace l'id stocké.
 *
 * Source du contenu : mock minimal — pas de dépendance au bundle réel.
 */

const WARLOCK_FIXTURE = {
  id: 'warlock',
  name: { fr: 'Occultiste', en: 'Warlock' },
  hitDie: 'd8',
  primaryAbility: ['cha'],
  saveProficiencies: ['cha', 'sag'],
  armorProficiencies: [],
  weaponProficiencies: [],
  toolProficiencies: [],
  skillChoices: { count: 2, from: ['Arcana'] },
  weaponMasteryCount: 0,
  spellcasting: { ability: 'cha', progression: 'pact' },
  startingEquipment: { options: [{ items: [], coins: null }] },
  description: { fr: '.', en: '.' },
  features: [],
  source: 'srd-5.2.1',
} as const;

const WEAPONS = [
  {
    id: 'dagger',
    name: { fr: 'Dague', en: 'Dagger' },
    category: 'weapon',
    cost: { qty: 2, unit: 'gp' },
    weight: 1,
    description: null,
    damage: { dice: '1d4', type: 'piercing', typeLabel: { fr: 'perforants', en: 'piercing' } },
    properties: ['simple-melee', 'Finesse', 'Light', 'Thrown'],
    source: 'srd-5.2.1',
  },
  {
    id: 'longsword',
    name: { fr: 'Épée longue', en: 'Longsword' },
    category: 'weapon',
    cost: { qty: 15, unit: 'gp' },
    weight: 3,
    description: null,
    damage: { dice: '1d8', type: 'slashing', typeLabel: { fr: 'tranchants', en: 'slashing' } },
    properties: ['martial-melee', 'Versatile'],
    source: 'srd-5.2.1',
  },
  {
    id: 'rapier',
    name: { fr: 'Rapière', en: 'Rapier' },
    category: 'weapon',
    cost: { qty: 25, unit: 'gp' },
    weight: 2,
    description: null,
    damage: { dice: '1d8', type: 'piercing', typeLabel: { fr: 'perforants', en: 'piercing' } },
    properties: ['martial-melee', 'Finesse'],
    source: 'srd-5.2.1',
  },
  // Ranged — DOIT être exclu (SRD impose corps-à-corps).
  {
    id: 'longbow',
    name: { fr: 'Arc long', en: 'Longbow' },
    category: 'weapon',
    cost: { qty: 50, unit: 'gp' },
    weight: 2,
    description: null,
    damage: { dice: '1d8', type: 'piercing', typeLabel: { fr: 'perforants', en: 'piercing' } },
    properties: ['martial-ranged', 'Heavy', 'Two-Handed'],
    source: 'srd-5.2.1',
  },
  // Bouclier non-weapon — DOIT être exclu.
  {
    id: 'shield',
    name: { fr: 'Bouclier', en: 'Shield' },
    category: 'shield',
    cost: { qty: 10, unit: 'gp' },
    weight: 6,
    description: null,
    properties: [],
    source: 'srd-5.2.1',
  },
] as const;

vi.mock('@/shared/hooks/use-content', () => ({
  useContent: (type: string) => {
    if (type === 'classes')
      return { data: [WARLOCK_FIXTURE], loading: false, error: null };
    if (type === 'items')
      return { data: WEAPONS, loading: false, error: null };
    if (type === 'invocations')
      return {
        data: [
          {
            id: 'pact-of-the-blade',
            name: { fr: 'Pacte de la lame', en: 'Pact of the Blade' },
            summary: { fr: '.', en: '.' },
            prerequisiteWarlockLevel: null,
            prerequisiteOther: null,
            source: 'srd-5.2.1',
          },
        ],
        loading: false,
        error: null,
      };
    return { data: [], loading: false, error: null };
  },
}));

vi.mock('@/shared/lib/content-loader', () => ({
  invalidatePublicContent: vi.fn().mockResolvedValue(undefined),
}));

function seedWarlock(eldritchInvocations: string[] = []): void {
  useWizardStore.setState({
    draft: {
      ...EMPTY_DRAFT,
      primaryClassId: 'warlock',
      classes: [
        {
          ...createEmptyClassSubChoices(),
          classId: 'warlock',
          level: 1,
          eldritchInvocations,
        },
      ],
    },
    currentStep: 'class',
    visitedSteps: ['identity', 'class'],
  });
}

beforeEach(() => {
  useWizardStore.getState().reset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('<PactOfTheBladeChooser> (D13c)', () => {
  it("cat. 1 — ne rend pas le chooser si pact-of-the-blade n'est pas dans les invocations", () => {
    seedWarlock(['armor-of-shadows']);
    render(<ClassSubChoicesSection />);
    expect(screen.queryByTestId('pact-of-the-blade-chooser')).toBeNull();
  });

  it('cat. 1 — rend le chooser quand pact-of-the-blade est sélectionné', () => {
    seedWarlock(['pact-of-the-blade']);
    render(<ClassSubChoicesSection />);
    expect(screen.getByTestId('pact-of-the-blade-chooser')).toBeInTheDocument();
  });

  it("cat. 6 — n'expose QUE les armes corps-à-corps simples ou de guerre (pas d'arc, pas de bouclier)", () => {
    seedWarlock(['pact-of-the-blade']);
    render(<ClassSubChoicesSection />);
    // Présents
    expect(screen.getByRole('radio', { name: /Dague/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Épée longue/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Rapière/ })).toBeInTheDocument();
    // Absents
    expect(screen.queryByRole('radio', { name: /Arc long/ })).toBeNull();
    expect(screen.queryByRole('radio', { name: /Bouclier/ })).toBeNull();
  });

  it("cat. 4 — cliquer une arme persiste l'id dans pactBladeWeapon (single-value)", async () => {
    seedWarlock(['pact-of-the-blade']);
    const user = userEvent.setup();
    render(<ClassSubChoicesSection />);

    await user.click(screen.getByRole('radio', { name: /Épée longue/ }));

    const warlock = useWizardStore
      .getState()
      .draft.classes.find((c) => c.classId === 'warlock');
    expect(warlock?.pactBladeWeapon).toBe('longsword');
    expect(screen.getByTestId('pact-blade-selection')).toHaveTextContent(
      'Épée longue',
    );
  });

  it("cat. 5 — sélectionner une nouvelle arme remplace l'ancienne (radio strict)", async () => {
    seedWarlock(['pact-of-the-blade']);
    const user = userEvent.setup();
    render(<ClassSubChoicesSection />);

    await user.click(screen.getByRole('radio', { name: /Dague/ }));
    await user.click(screen.getByRole('radio', { name: /Rapière/ }));

    const warlock = useWizardStore
      .getState()
      .draft.classes.find((c) => c.classId === 'warlock');
    expect(warlock?.pactBladeWeapon).toBe('rapier');
  });
});
