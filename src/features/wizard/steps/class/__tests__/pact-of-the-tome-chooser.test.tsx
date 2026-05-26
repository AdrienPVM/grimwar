import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { EMPTY_DRAFT, useWizardStore } from '@/shared/lib/slices/wizard-slice';
import { createEmptyClassSubChoices } from '@/shared/types/character';

import { ClassSubChoicesSection } from '../class-sub-choices-section';

/**
 * D13e — PactOfTheTomeChooser tests (CHANTIER B).
 *
 * Couverture cat. 1, 4, 5, 6 (politique « Vérité du contenu » CLAUDE.md) :
 *   1. Conditionnel : ne rend rien tant que `pact-of-the-tome` n'est pas
 *      dans `eldritchInvocations`.
 *   2. Sections : quand affiché, expose 2 blocs (3 cantrips + 2 rituels L1)
 *      avec compteurs aria-live.
 *   3. Persistance : cocher 3 cantrips persiste exactement 3 IDs dans
 *      `classes[warlock].pactTomeCantrips`. Idem pour 2 rituels.
 *   4. Borne : tenter de cocher un 4ᵉ cantrip ne change pas la sélection.
 *   5. Cohérence wizard → store : l'ordre des clics est préservé dans
 *      `pactTomeCantrips` (FIFO selon `toggleBoundedSelection`).
 *
 * Source du contenu : mock minimal (3 cantrips + 3 rituels L1) — pas de
 * dépendance au bundle réel, pour stabilité du test.
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

const CANTRIPS = [
  {
    id: 'main-du-mage',
    name: { fr: 'Main du mage', en: 'Mage Hand' },
    level: 0,
    school: 'conjuration',
    castingTime: { fr: '1 action', en: '1 action' },
    range: { fr: '9 m', en: '30 ft' },
    components: { v: true, s: true, m: false },
    duration: { fr: '1 minute', en: '1 minute' },
    concentration: false,
    ritual: false,
    description: { fr: 'Une main spectrale.', en: 'A spectral hand.' },
    atHigherLevels: null,
    classes: ['wizard'],
    source: 'srd-5.2.1',
  },
  {
    id: 'trait-de-feu',
    name: { fr: 'Trait de feu', en: 'Fire Bolt' },
    level: 0,
    school: 'evocation',
    castingTime: { fr: '1 action', en: '1 action' },
    range: { fr: '36 m', en: '120 ft' },
    components: { v: true, s: true, m: false },
    duration: { fr: 'Instantanée', en: 'Instantaneous' },
    concentration: false,
    ritual: false,
    description: { fr: 'Un trait de feu.', en: 'A bolt of fire.' },
    atHigherLevels: null,
    classes: ['sorcerer', 'wizard'],
    source: 'srd-5.2.1',
  },
  {
    id: 'prestidigitation',
    name: { fr: 'Prestidigitation', en: 'Prestidigitation' },
    level: 0,
    school: 'transmutation',
    castingTime: { fr: '1 action', en: '1 action' },
    range: { fr: '3 m', en: '10 ft' },
    components: { v: true, s: true, m: false },
    duration: { fr: '1 heure', en: '1 hour' },
    concentration: false,
    ritual: false,
    description: { fr: 'Tour de magie mineur.', en: 'A minor magical trick.' },
    atHigherLevels: null,
    classes: ['bard', 'sorcerer', 'warlock', 'wizard'],
    source: 'srd-5.2.1',
  },
  // Un 4e cantrip pour vérifier la borne.
  {
    id: 'lumiere',
    name: { fr: 'Lumière', en: 'Light' },
    level: 0,
    school: 'evocation',
    castingTime: { fr: '1 action', en: '1 action' },
    range: { fr: 'Contact', en: 'Touch' },
    components: { v: true, s: false, m: true },
    duration: { fr: '1 heure', en: '1 hour' },
    concentration: false,
    ritual: false,
    description: { fr: 'Lumière vive.', en: 'Bright light.' },
    atHigherLevels: null,
    classes: ['bard', 'cleric', 'sorcerer', 'wizard'],
    source: 'srd-5.2.1',
  },
] as const;

const RITUALS = [
  {
    id: 'detection-de-la-magie',
    name: { fr: 'Détection de la magie', en: 'Detect Magic' },
    level: 1,
    school: 'divination',
    castingTime: { fr: '1 action', en: '1 action' },
    range: { fr: 'Personnelle', en: 'Self' },
    components: { v: true, s: true, m: false },
    duration: { fr: '10 minutes', en: '10 minutes' },
    concentration: true,
    ritual: true,
    description: { fr: 'Vous percevez la magie.', en: 'You sense magic.' },
    atHigherLevels: null,
    classes: ['bard', 'cleric', 'druid', 'paladin', 'ranger', 'sorcerer', 'wizard'],
    source: 'srd-5.2.1',
  },
  {
    id: 'comprehension-des-langues',
    name: { fr: 'Compréhension des langues', en: 'Comprehend Languages' },
    level: 1,
    school: 'divination',
    castingTime: { fr: '1 action', en: '1 action' },
    range: { fr: 'Personnelle', en: 'Self' },
    components: { v: true, s: true, m: true },
    duration: { fr: '1 heure', en: '1 hour' },
    concentration: false,
    ritual: true,
    description: { fr: 'Vous comprenez les langues.', en: 'You understand languages.' },
    atHigherLevels: null,
    classes: ['bard', 'sorcerer', 'warlock', 'wizard'],
    source: 'srd-5.2.1',
  },
  {
    id: 'serviteur-invisible',
    name: { fr: 'Serviteur invisible', en: 'Unseen Servant' },
    level: 1,
    school: 'conjuration',
    castingTime: { fr: '1 action', en: '1 action' },
    range: { fr: '18 m', en: '60 ft' },
    components: { v: true, s: true, m: true },
    duration: { fr: '1 heure', en: '1 hour' },
    concentration: false,
    ritual: true,
    description: { fr: 'Un serviteur invisible.', en: 'An invisible servant.' },
    atHigherLevels: null,
    classes: ['bard', 'warlock', 'wizard'],
    source: 'srd-5.2.1',
  },
] as const;

vi.mock('@/shared/hooks/use-content', () => ({
  useContent: (type: string) => {
    if (type === 'classes')
      return { data: [WARLOCK_FIXTURE], loading: false, error: null };
    if (type === 'spells')
      return { data: [...CANTRIPS, ...RITUALS], loading: false, error: null };
    if (type === 'invocations')
      return {
        data: [
          {
            id: 'pact-of-the-tome',
            name: { fr: 'Pacte du grimoire', en: 'Pact of the Tome' },
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

describe('<PactOfTheTomeChooser> (D13e)', () => {
  it('cat. 1 — ne rend pas le chooser si pact-of-the-tome n\'est pas dans les invocations', () => {
    seedWarlock(['armor-of-shadows']);
    render(<ClassSubChoicesSection />);
    expect(screen.queryByTestId('pact-of-the-tome-chooser')).toBeNull();
  });

  it('cat. 1 — rend le chooser et ses 2 sections quand pact-of-the-tome est sélectionné', () => {
    seedWarlock(['pact-of-the-tome']);
    render(<ClassSubChoicesSection />);
    expect(screen.getByTestId('pact-of-the-tome-chooser')).toBeInTheDocument();
    expect(screen.getByText(/Codex des Ombres — sorts mineurs/)).toBeInTheDocument();
    expect(screen.getByText(/Codex des Ombres — rituels du 1ᵉʳ niveau/)).toBeInTheDocument();
    expect(screen.getByTestId('pact-tome-cantrips-counter')).toHaveTextContent('0 / 3');
    expect(screen.getByTestId('pact-tome-rituals-counter')).toHaveTextContent('0 / 2');
  });

  it('cat. 4/5 — cocher 3 cantrips persiste exactement 3 IDs dans pactTomeCantrips', async () => {
    seedWarlock(['pact-of-the-tome']);
    const user = userEvent.setup();
    render(<ClassSubChoicesSection />);

    await user.click(screen.getByRole('checkbox', { name: /^Main du mage$/ }));
    await user.click(screen.getByRole('checkbox', { name: /^Trait de feu$/ }));
    await user.click(screen.getByRole('checkbox', { name: /^Prestidigitation$/ }));

    const warlock = useWizardStore
      .getState()
      .draft.classes.find((c) => c.classId === 'warlock');
    expect(warlock?.pactTomeCantrips).toEqual([
      'main-du-mage',
      'trait-de-feu',
      'prestidigitation',
    ]);
    expect(screen.getByTestId('pact-tome-cantrips-counter')).toHaveTextContent('3 / 3');
  });

  it('cat. 6 — un 4ᵉ cantrip cliqué reste désactivé (borne respectée)', async () => {
    seedWarlock(['pact-of-the-tome']);
    const user = userEvent.setup();
    render(<ClassSubChoicesSection />);

    await user.click(screen.getByRole('checkbox', { name: /^Main du mage$/ }));
    await user.click(screen.getByRole('checkbox', { name: /^Trait de feu$/ }));
    await user.click(screen.getByRole('checkbox', { name: /^Prestidigitation$/ }));

    // Le 4e cantrip est désactivé : son input doit avoir `disabled`.
    const lumiereInput = screen.getByRole('checkbox', { name: /^Lumière$/ }) as HTMLInputElement;
    expect(lumiereInput.disabled).toBe(true);

    const warlock = useWizardStore
      .getState()
      .draft.classes.find((c) => c.classId === 'warlock');
    expect(warlock?.pactTomeCantrips).toHaveLength(3);
  });

  it('cat. 4 — cocher 2 rituels persiste exactement 2 IDs dans pactTomeRituals', async () => {
    seedWarlock(['pact-of-the-tome']);
    const user = userEvent.setup();
    render(<ClassSubChoicesSection />);

    await user.click(screen.getByRole('checkbox', { name: /^Détection de la magie$/ }));
    await user.click(screen.getByRole('checkbox', { name: /^Compréhension des langues$/ }));

    const warlock = useWizardStore
      .getState()
      .draft.classes.find((c) => c.classId === 'warlock');
    expect(warlock?.pactTomeRituals).toEqual([
      'detection-de-la-magie',
      'comprehension-des-langues',
    ]);
    expect(screen.getByTestId('pact-tome-rituals-counter')).toHaveTextContent('2 / 2');
  });
});
