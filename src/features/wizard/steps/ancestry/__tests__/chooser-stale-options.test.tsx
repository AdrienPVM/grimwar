import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { useWizardStore, EMPTY_DRAFT } from '@/shared/lib/slices/wizard-slice';
import { EMPTY_ANCESTRY_SUB_CHOICES } from '@/shared/types/character';

import { AncestrySubChoicesSection } from '../ancestry-sub-choices-section';

/**
 * Regression — cache Dexie stale (UAT 13.8 du 2026-05-17, 2e passe).
 *
 * Le bug Adrien : sur F5 simple sans wipe, sections Drakéide/Goliath vides
 * SILENCIEUSES. Le 1er fix (`?.options?.X`) avait transformé le crash en
 * section vide muette — pire qu'un crash, parce qu'un crash se voit. La 2e
 * passe (ce que ce test couvre) : durcissement A généralisé — quand un
 * chooser de sous-choix se retrouve avec 0 option alors qu'il en attendait,
 * il DOIT afficher une bannière visible `role="alert"`, jamais un `null`
 * silencieux.
 *
 * Comment ce test devient rouge avant fix : sur le code pré-fix (early
 * return null), aucun `role="alert"` n'est rendu → `getByRole('alert')` jette.
 * Sur le code patché, la bannière `ChooserMissingDataBanner` est rendue → le
 * test passe.
 *
 * Le fixture stale (sans `options`) ne passe plus le schéma strict, donc en
 * pratique le loader le filtre au boot. Mais le hook `useContent` peut
 * recevoir des données partielles via tests/mock — la défense en profondeur
 * dans le chooser reste utile, et c'est exactement ce test qui le verrouille.
 */

const ANCESTRY_FIXTURE_STALE = [
  // Toutes ces entrées simulent une shape cache pré-13.7 (pas de `options`)
  // — le but est de vérifier que le chooser ne crashe pas ET affiche une
  // bannière visible.
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
    options: {},
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
    options: {},
  },
  {
    id: 'elf',
    name: { fr: 'Elfe', en: 'Elf' },
    size: 'medium' as const,
    speed: 30,
    description: { fr: '', en: '' },
    abilityScoreIncrease: [],
    traits: [],
    languages: ['common'],
    source: 'srd-5.2.1' as const,
    options: {},
  },
  {
    id: 'gnome',
    name: { fr: 'Gnome', en: 'Gnome' },
    size: 'small' as const,
    speed: 30,
    description: { fr: '', en: '' },
    abilityScoreIncrease: [],
    traits: [],
    languages: ['common'],
    source: 'srd-5.2.1' as const,
    options: {},
  },
  {
    id: 'goliath',
    name: { fr: 'Goliath', en: 'Goliath' },
    size: 'medium' as const,
    speed: 30,
    description: { fr: '', en: '' },
    abilityScoreIncrease: [],
    traits: [],
    languages: ['common'],
    source: 'srd-5.2.1' as const,
    options: {},
  },
  {
    id: 'human',
    name: { fr: 'Humain', en: 'Human' },
    size: 'medium' as const,
    speed: 30,
    description: { fr: '', en: '' },
    abilityScoreIncrease: [],
    traits: [],
    languages: ['common'],
    source: 'srd-5.2.1' as const,
    options: {},
  },
];

vi.mock('@/shared/hooks/use-content', () => ({
  useContent: (type: string) => {
    if (type === 'spells') return { data: [], isLoading: false, error: null };
    if (type === 'ancestries') {
      return { data: ANCESTRY_FIXTURE_STALE, isLoading: false, error: null };
    }
    return { data: [], isLoading: false, error: null };
  },
}));

vi.mock('@/shared/lib/content-loader', () => ({
  invalidatePublicContent: vi.fn().mockResolvedValue(undefined),
}));

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

describe('Choosers — bannière visible quand 0 option (durcissement A généralisé)', () => {
  // Pour chaque ascendance à sous-choix, on vérifie : (a) pas de throw au
  // render, (b) une bannière `role="alert"` visible est rendue avec le marker
  // `data-chooser-empty=<key>`.

  it('Drakéide sans options → bannière visible, marker dragon-ancestry', () => {
    useWizardStore.setState((s) => ({
      draft: { ...s.draft, ancestryId: 'dragonborn' },
    }));
    render(<AncestrySubChoicesSection />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(
      document.querySelector('[data-chooser-empty="dragon-ancestry"]'),
    ).not.toBeNull();
  });

  it('Tieffelin sans options → bannière visible, marker tiefling-legacy', () => {
    useWizardStore.setState((s) => ({
      draft: { ...s.draft, ancestryId: 'tiefling' },
    }));
    render(<AncestrySubChoicesSection />);
    // Tieffelin a 3 choosers (héritage, ability, taille) ; seul héritage doit
    // tomber sur la bannière (les 2 autres ne dépendent pas du bundle).
    expect(
      document.querySelector('[data-chooser-empty="tiefling-legacy"]'),
    ).not.toBeNull();
  });

  it('Elfe sans options → bannière visible, marker elf-lineage', () => {
    useWizardStore.setState((s) => ({
      draft: { ...s.draft, ancestryId: 'elf' },
    }));
    render(<AncestrySubChoicesSection />);
    expect(
      document.querySelector('[data-chooser-empty="elf-lineage"]'),
    ).not.toBeNull();
  });

  it('Gnome sans options → bannière visible, marker gnome-lineage', () => {
    useWizardStore.setState((s) => ({
      draft: { ...s.draft, ancestryId: 'gnome' },
    }));
    render(<AncestrySubChoicesSection />);
    expect(
      document.querySelector('[data-chooser-empty="gnome-lineage"]'),
    ).not.toBeNull();
  });

  it('Goliath sans options → bannière visible, marker goliath-ancestry', () => {
    useWizardStore.setState((s) => ({
      draft: { ...s.draft, ancestryId: 'goliath' },
    }));
    render(<AncestrySubChoicesSection />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(
      document.querySelector('[data-chooser-empty="goliath-ancestry"]'),
    ).not.toBeNull();
  });

  it('Humain sans skillfulOptions → bannière visible, marker ancestry-extra-skill-human', () => {
    useWizardStore.setState((s) => ({
      draft: { ...s.draft, ancestryId: 'human' },
    }));
    render(<AncestrySubChoicesSection />);
    expect(
      document.querySelector('[data-chooser-empty="ancestry-extra-skill-human"]'),
    ).not.toBeNull();
  });
});
