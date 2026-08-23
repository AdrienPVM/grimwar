import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ClassEntity, Spell } from '@/shared/types/content';

import { SpellBrowser } from '../browsers/spell-browser';

/**
 * Codex — navigateur de sorts (plan 19). Tests d'IDENTITÉ (pas de présence) :
 * la modale d'un sort affiche EXACTEMENT les champs de l'entrée du bundle, et
 * les filtres niveau/école retranchent les bonnes entrées.
 */

const FIRE_BOLT: Spell = {
  id: 'fire-bolt',
  name: { fr: 'Trait de feu', en: 'Fire Bolt' },
  level: 0,
  school: 'evocation',
  castingTime: { fr: '1 action', en: '1 Action' },
  range: { fr: '36 mètres', en: '120 ft' },
  components: { v: true, s: true, m: false },
  duration: { fr: 'Instantanée', en: 'Instantaneous' },
  concentration: false,
  ritual: false,
  description: {
    fr: 'Tu projettes un trait de feu vers une créature à portée.',
    en: 'You hurl a mote of fire.',
  },
  atHigherLevels: {
    fr: 'Les dégâts augmentent de 1d10 aux niveaux 5, 11 et 17.',
    en: '',
  },
  classes: ['sorcerer', 'wizard'],
  source: 'srd-5.2.1',
};

const CHARM_PERSON: Spell = {
  id: 'charm-person',
  name: { fr: 'Charme-personne', en: 'Charm Person' },
  level: 1,
  school: 'enchantment',
  castingTime: { fr: '1 action', en: '1 Action' },
  range: { fr: '9 mètres', en: '30 ft' },
  components: { v: true, s: true, m: false },
  duration: { fr: '1 heure', en: '1 Hour' },
  concentration: false,
  ritual: false,
  description: { fr: 'Tu tentes de charmer une créature humanoïde.', en: '' },
  atHigherLevels: null,
  classes: ['bard', 'wizard'],
  source: 'srd-5.2.1',
};

const SPELLS: Spell[] = [FIRE_BOLT, CHARM_PERSON];

const CLASSES: ClassEntity[] = [
  { id: 'wizard', name: { fr: 'Magicien', en: 'Wizard' } } as unknown as ClassEntity,
  { id: 'sorcerer', name: { fr: 'Ensorceleur', en: 'Sorcerer' } } as unknown as ClassEntity,
  { id: 'bard', name: { fr: 'Barde', en: 'Bard' } } as unknown as ClassEntity,
];

// Mock par type ; le navigateur lit 'spells' + 'classes'.
// M50 — la provenance : « Trait de feu » vient du SRD, « Charme-personne » est
// servi par un pack maison. `scopeOf` est la source de la puce.
const scopeOf = (id: string): { scope: 'public' | 'user'; originLabel?: string } =>
  id === 'charm-person'
    ? { scope: 'user', originLabel: 'Ma campagne' }
    : { scope: 'public' };

vi.mock('@/shared/hooks/use-content', () => ({
  useContent: (type: string) => {
    if (type === 'spells')
      return { data: SPELLS, loading: false, error: null, scopeOf };
    if (type === 'classes')
      return { data: CLASSES, loading: false, error: null, scopeOf };
    return { data: [], loading: false, error: null, scopeOf };
  },
}));

describe('SpellBrowser (Codex)', () => {
  it('liste tous les sorts du bundle', () => {
    render(<SpellBrowser />);
    expect(screen.getByText('Trait de feu')).toBeInTheDocument();
    expect(screen.getByText('Charme-personne')).toBeInTheDocument();
    expect(screen.getByText(/2 ·/)).toBeInTheDocument();
  });

  it('filtre par recherche de nom', () => {
    render(<SpellBrowser />);
    fireEvent.change(screen.getByPlaceholderText('Rechercher un sort…'), {
      target: { value: 'charme' },
    });
    expect(screen.queryByText('Trait de feu')).not.toBeInTheDocument();
    expect(screen.getByText('Charme-personne')).toBeInTheDocument();
  });

  it('filtre par niveau via le chip de niveau', () => {
    render(<SpellBrowser />);
    // Le chip de filtre (role=button), pas l'en-tête de section h3 homonyme.
    fireEvent.click(screen.getByRole('button', { name: 'Niveau 1' }));
    expect(screen.queryByText('Trait de feu')).not.toBeInTheDocument();
    expect(screen.getByText('Charme-personne')).toBeInTheDocument();
  });

  it('filtre par école via le chip école', () => {
    render(<SpellBrowser />);
    // « Évocation » n'existe que sur Trait de feu.
    fireEvent.click(screen.getByRole('button', { name: 'Évocation' }));
    expect(screen.getByText('Trait de feu')).toBeInTheDocument();
    expect(screen.queryByText('Charme-personne')).not.toBeInTheDocument();
  });

  it('ouvre la modale détail avec les champs EXACTS du sort', () => {
    render(<SpellBrowser />);
    fireEvent.click(screen.getByText('Trait de feu'));
    const dialog = screen.getByRole('dialog');
    // Identité : niveau + école + tous les méta-champs + description + upcast.
    expect(within(dialog).getByText('Sort mineur · Évocation')).toBeInTheDocument();
    expect(within(dialog).getByText('Instantanée')).toBeInTheDocument();
    expect(within(dialog).getByText('36 mètres')).toBeInTheDocument();
    expect(
      within(dialog).getByText(
        'Tu projettes un trait de feu vers une créature à portée.',
      ),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText(
        'Les dégâts augmentent de 1d10 aux niveaux 5, 11 et 17.',
      ),
    ).toBeInTheDocument();
    // Classes résolues + triées (Ensorceleur, Magicien).
    expect(within(dialog).getByText('Ensorceleur, Magicien')).toBeInTheDocument();
  });

  it('marque d’une puce le sort servi par un pack maison, pas le sort SRD', () => {
    render(<SpellBrowser />);
    const chips = screen.getAllByTestId('codex-origin-chip');
    expect(chips).toHaveLength(1);
    expect(chips[0]).toHaveTextContent('Ma campagne');
    // La puce est bien dans la rangée du sort maison.
    expect(
      screen.getByText('Charme-personne').closest('button'),
    ).toHaveTextContent('Ma campagne');
    expect(screen.getByText('Trait de feu').closest('button')).not.toHaveTextContent(
      'Ma campagne',
    );
  });
});