import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { useWizardStore, EMPTY_DRAFT } from '@/shared/lib/slices/wizard-slice';
import { EMPTY_ANCESTRY_SUB_CHOICES } from '@/shared/types/character';

import { AncestrySubChoicesSection } from '../ancestry-sub-choices-section';

/**
 * Tests de wiring (plan 13.8 step 12).
 *
 * Vérifient :
 *  - rien n'est rendu pour Nain / Halfelin / Orc (aucun sous-choix imposé),
 *  - Drakéide rend les 10 cartes de type de dragon,
 *  - Tieffelin rend héritage + caract. d'incantation + taille,
 *  - taper une carte met à jour `state.ancestrySubChoices.<key>`.
 */

// Stub léger de `useContent('ancestries')` + `useContent('spells')`.
// Évite le fetch réseau dans jsdom — on n'a pas besoin du contenu i18n
// complet, juste assez pour que les choosers rendent leurs cartes.
vi.mock('@/shared/hooks/use-content', () => ({
  useContent: (type: string) => {
    if (type === 'spells') return { data: [], isLoading: false, error: null };
    if (type === 'ancestries') {
      return {
        data: ANCESTRY_FIXTURE,
        isLoading: false,
        error: null,
      };
    }
    return { data: [], isLoading: false, error: null };
  },
}));

const ANCESTRY_FIXTURE = [
  {
    id: 'dragonborn',
    name: { fr: 'Drakéide', en: 'Dragonborn' },
    size: 'medium' as const,
    speed: 30,
    description: { fr: '', en: '' },
    abilityScoreIncrease: [],
    traits: [],
    languages: ['common'],
    source: 'srd-5.2.1' as const,
    options: {
      dragonAncestries: [
        { id: 'red', name: { fr: 'Rouge', en: 'Red' }, damageType: 'fire', damageTypeLabel: { fr: 'Feu', en: 'Fire' } },
        { id: 'gold', name: { fr: 'Or', en: 'Gold' }, damageType: 'fire', damageTypeLabel: { fr: 'Feu', en: 'Fire' } },
        { id: 'black', name: { fr: 'Noir', en: 'Black' }, damageType: 'acid', damageTypeLabel: { fr: 'Acide', en: 'Acid' } },
        { id: 'blue', name: { fr: 'Bleu', en: 'Blue' }, damageType: 'lightning', damageTypeLabel: { fr: 'Foudre', en: 'Lightning' } },
        { id: 'brass', name: { fr: 'Airain', en: 'Brass' }, damageType: 'fire', damageTypeLabel: { fr: 'Feu', en: 'Fire' } },
        { id: 'bronze', name: { fr: 'Bronze', en: 'Bronze' }, damageType: 'lightning', damageTypeLabel: { fr: 'Foudre', en: 'Lightning' } },
        { id: 'copper', name: { fr: 'Cuivre', en: 'Copper' }, damageType: 'acid', damageTypeLabel: { fr: 'Acide', en: 'Acid' } },
        { id: 'green', name: { fr: 'Vert', en: 'Green' }, damageType: 'poison', damageTypeLabel: { fr: 'Poison', en: 'Poison' } },
        { id: 'silver', name: { fr: 'Argent', en: 'Silver' }, damageType: 'cold', damageTypeLabel: { fr: 'Froid', en: 'Cold' } },
        { id: 'white', name: { fr: 'Blanc', en: 'White' }, damageType: 'cold', damageTypeLabel: { fr: 'Froid', en: 'Cold' } },
      ],
    },
  },
  {
    id: 'tiefling',
    name: { fr: 'Tieffelin', en: 'Tiefling' },
    size: 'small' as const,
    speed: 30,
    description: { fr: '', en: '' },
    abilityScoreIncrease: [],
    traits: [],
    languages: ['common'],
    source: 'srd-5.2.1' as const,
    options: {
      tieflingLegacies: [
        { id: 'abyssal', name: { fr: 'Abyssal', en: 'Abyssal' }, resistance: { fr: 'Poison', en: 'Poison' }, cantripSpellId: 'poison-spray', level3SpellId: 'ray-of-sickness', level5SpellId: 'hold-person' },
        { id: 'chthonic', name: { fr: 'Chtonien', en: 'Chthonic' }, resistance: { fr: 'Nécrotique', en: 'Necrotic' }, cantripSpellId: 'chill-touch', level3SpellId: 'false-life', level5SpellId: 'ray-of-enfeeblement' },
        { id: 'infernal', name: { fr: 'Infernal', en: 'Infernal' }, resistance: { fr: 'Feu', en: 'Fire' }, cantripSpellId: 'fire-bolt', level3SpellId: 'hellish-rebuke', level5SpellId: 'darkness' },
      ],
    },
  },
  { id: 'dwarf', name: { fr: 'Nain', en: 'Dwarf' }, size: 'medium' as const, speed: 30, description: { fr: '', en: '' }, abilityScoreIncrease: [], traits: [], languages: ['common'], source: 'srd-5.2.1' as const, options: {} },
];

beforeEach(() => {
  useWizardStore.setState({
    draft: { ...EMPTY_DRAFT, ancestrySubChoices: { ...EMPTY_ANCESTRY_SUB_CHOICES } },
    currentStep: 'ancestry',
    visitedSteps: ['identity', 'class', 'ancestry'],
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('<AncestrySubChoicesSection> — wiring conditionnel par ascendance', () => {
  it('ancestryId null → rien rendu', () => {
    const { container } = render(<AncestrySubChoicesSection />);
    expect(container.firstChild).toBeNull();
  });

  it('Nain → rien rendu (aucun sous-choix imposé SRD)', () => {
    useWizardStore.setState((s) => ({
      draft: { ...s.draft, ancestryId: 'dwarf' },
    }));
    const { container } = render(<AncestrySubChoicesSection />);
    expect(container.firstChild).toBeNull();
  });

  it('Drakéide → rend la section + 10 cartes de type de dragon', () => {
    useWizardStore.setState((s) => ({
      draft: { ...s.draft, ancestryId: 'dragonborn' },
    }));
    render(<AncestrySubChoicesSection />);
    expect(
      screen.getByRole('radiogroup', { name: /type de dragon/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(10);
  });

  it('Tieffelin → rend héritage + caract. incantation + taille (3 fieldsets)', () => {
    useWizardStore.setState((s) => ({
      draft: { ...s.draft, ancestryId: 'tiefling' },
    }));
    render(<AncestrySubChoicesSection />);
    expect(screen.getByRole('radiogroup', { name: /héritage fiélon/i })).toBeInTheDocument();
    expect(
      screen.getByRole('radiogroup', { name: /caractéristique d'incantation/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: /taille/i })).toBeInTheDocument();
  });

  it('Drakéide → cliquer une carte écrit dans state.ancestrySubChoices.dragonAncestry', () => {
    useWizardStore.setState((s) => ({
      draft: { ...s.draft, ancestryId: 'dragonborn' },
    }));
    render(<AncestrySubChoicesSection />);
    const red = screen.getByRole('radio', { name: /Rouge/ });
    fireEvent.click(red);
    expect(useWizardStore.getState().draft.ancestrySubChoices.dragonAncestry).toBe('red');
  });

  it('Tieffelin complet (héritage + caract. + taille) → tous les champs sont posés', () => {
    useWizardStore.setState((s) => ({
      draft: { ...s.draft, ancestryId: 'tiefling' },
    }));
    render(<AncestrySubChoicesSection />);
    fireEvent.click(screen.getByRole('radio', { name: /Infernal/ }));
    fireEvent.click(screen.getByRole('radio', { name: /Charisme|Charisma/ }));
    fireEvent.click(screen.getByRole('radio', { name: /Moyenne|Medium/ }));
    const sc = useWizardStore.getState().draft.ancestrySubChoices;
    expect(sc.tieflingLegacy).toBe('infernal');
    expect(sc.ancestryCastingAbility).toBe('cha');
    expect(sc.ancestrySize).toBe('medium');
  });
});
