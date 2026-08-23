import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Condition, Feat, Invocation } from '@/shared/types/content';

import {
  ConditionBrowser,
  FeatBrowser,
  InvocationBrowser,
} from '../browsers/codex-text-browsers';

/**
 * Codex — adaptateurs texte (plan 19). Vérifie que dons / états / invocations
 * sont projetés vers `CodexEntry` avec les champs EXACTS du bundle (prérequis,
 * résumé, description, niveau d'invocation).
 */

const FEAT: Feat = {
  id: 'grand-maitre-armes',
  name: { fr: 'Grand maître d’armes', en: 'Great Weapon Master' },
  prerequisite: { fr: 'Maîtrise d’une arme de corps à corps', en: '' },
  summary: { fr: 'Tu frappes plus fort avec les armes lourdes.', en: '' },
  description: { fr: 'Quand tu marques un coup critique, fais une attaque bonus.', en: '' },
  source: 'srd-5.2.1',
};

const CONDITION: Condition = {
  id: 'aveugle',
  name: { fr: 'Aveuglé', en: 'Blinded' },
  description: {
    fr: 'Une créature aveuglée ne voit rien et rate les jets reposant sur la vue.',
    en: '',
  },
  source: 'srd-5.2.1',
};

const INVOCATION: Invocation = {
  id: 'vision-diabolique',
  name: { fr: 'Vision diabolique', en: 'Devil’s Sight' },
  summary: { fr: 'Tu vois dans le noir, magique ou non, jusqu’à 36 mètres.', en: '' },
  prerequisiteWarlockLevel: 2,
  prerequisiteOther: null,
  source: 'srd-5.2.1',
};

vi.mock('@/shared/hooks/use-content', () => ({
  useContent: (type: string) => {
    if (type === 'feats') return { data: [FEAT], loading: false, error: null , scopeOf: () => ({ scope: 'public' as const }) };
    if (type === 'conditions') return { data: [CONDITION], loading: false, error: null , scopeOf: () => ({ scope: 'public' as const }) };
    if (type === 'invocations') return { data: [INVOCATION], loading: false, error: null , scopeOf: () => ({ scope: 'public' as const }) };
    return { data: [], loading: false, error: null , scopeOf: () => ({ scope: 'public' as const }) };
  },
}));

describe('Codex text browsers', () => {
  it('FeatBrowser : nom + prérequis en méta, modale = résumé + description exacts', () => {
    render(<FeatBrowser />);
    expect(screen.getByText('Grand maître d’armes')).toBeInTheDocument();
    expect(
      screen.getByText(/Maîtrise d’une arme de corps à corps/),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByText('Grand maître d’armes'));
    const dialog = screen.getByRole('dialog');
    expect(
      within(dialog).getByText('Tu frappes plus fort avec les armes lourdes.'),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText(
        'Quand tu marques un coup critique, fais une attaque bonus.',
      ),
    ).toBeInTheDocument();
  });

  it('ConditionBrowser : modale = description officielle exacte', () => {
    render(<ConditionBrowser />);
    fireEvent.click(screen.getByText('Aveuglé'));
    const dialog = screen.getByRole('dialog');
    expect(
      within(dialog).getByText(
        'Une créature aveuglée ne voit rien et rate les jets reposant sur la vue.',
      ),
    ).toBeInTheDocument();
  });

  it('InvocationBrowser : niveau requis + résumé exacts', () => {
    render(<InvocationBrowser />);
    expect(screen.getByText('Vision diabolique')).toBeInTheDocument();
    // Méta liste : « Niveau requis 2 » (label codex + niveau du bundle).
    expect(screen.getAllByText(/Niveau requis 2/).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByText('Vision diabolique'));
    const dialog = screen.getByRole('dialog');
    expect(
      within(dialog).getByText(
        'Tu vois dans le noir, magique ou non, jusqu’à 36 mètres.',
      ),
    ).toBeInTheDocument();
  });
});
