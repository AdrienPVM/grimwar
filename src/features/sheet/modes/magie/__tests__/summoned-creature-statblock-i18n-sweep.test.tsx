import { render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { useLocaleStore } from '@/shared/lib/slices/locale-slice';
import type { SummonedCreatureStatBlock } from '@/shared/types/content';

import { SummonedCreatureStatBlockCard } from '../summoned-creature-stat-block-card';

/**
 * Garde-fou « rouge avant vert » de la passe i18n de la carte profil de
 * créature invoquée (`summoned-creature-stat-block-card.tsx`).
 *
 * Avant le fix, tous les libellés du stat block étaient codés en dur en FR
 * (« Classe d'armure », « Points de vie », « Profil de la créature invoquée »,
 * « Actions bonus », « Réactions »…). Rendue en locale EN, la carte fuyait le
 * FR et les assertions anglaises ci-dessous échouaient. Après bascule sur
 * `t()`, l'anglais sort et le FR n'apparaît plus.
 *
 * Vérifié empiriquement rouge avant vert : `git stash` du composant → ce
 * fichier échoue, `git stash pop` → vert.
 */

const FIXTURE: SummonedCreatureStatBlock = {
  id: 'creature-test',
  name: { fr: 'Bête éthérée', en: 'Aetherial Beast' },
  sizeTypeAlignment: { fr: 'Grand monstre, Neutre', en: 'Large Monstrosity, Neutral' },
  acFormula: { fr: 'CA 11 + niveau du sort', en: 'AC 11 + spell level' },
  hpFormula: { fr: 'PV 30 + 5 par niveau', en: 'HP 30 + 5 per level' },
  speed: { fr: '9 m, vol 18 m', en: '30 ft., fly 60 ft.' },
  abilities: { for: 17, dex: 14, con: 15, int: 6, sag: 12, cha: 8 },
  resistances: { fr: 'acide, feu', en: 'acid, fire' },
  immunities: { fr: 'Empoisonné', en: 'Poisoned' },
  senses: { fr: 'Vision dans le noir 18 m', en: 'Darkvision 60 ft.' },
  languages: { fr: 'comprend les langues de son invocateur', en: "understands its summoner's languages" },
  challenge: { fr: 'Aucun (XP 0)', en: 'None (XP 0)' },
  traits: [{ name: { fr: 'Vol', en: 'Flyby' }, description: { fr: '…', en: '…' } }],
  actions: [{ name: { fr: 'Morsure', en: 'Bite' }, description: { fr: '…', en: '…' } }],
  bonusActions: [{ name: { fr: 'Bond', en: 'Leap' }, description: { fr: '…', en: '…' } }],
  reactions: [{ name: { fr: 'Riposte', en: 'Riposte' }, description: { fr: '…', en: '…' } }],
  source: 'srd-5.2.1',
};

afterEach(() => {
  useLocaleStore.setState({ locale: 'fr' });
});

describe('SummonedCreatureStatBlockCard — passe i18n (rouge avant vert)', () => {
  it('rend l’EN, aucune fuite des libellés FR codés en dur', () => {
    useLocaleStore.setState({ locale: 'en' });
    render(<SummonedCreatureStatBlockCard statBlock={FIXTURE} />);

    const card = screen.getByTestId('summoned-creature-statblock');

    // En-tête + aria-label en anglais.
    expect(within(card).getByText('Summoned creature profile')).toBeInTheDocument();
    expect(card).toHaveAttribute('aria-label', 'Profile of Aetherial Beast');

    // Libellés du stat block en anglais (ceux qui diffèrent du FR).
    expect(within(card).getByText('Armor class')).toBeInTheDocument();
    expect(within(card).getByText('Hit points')).toBeInTheDocument();
    expect(within(card).getByText('Speed')).toBeInTheDocument();
    expect(within(card).getByText('Languages')).toBeInTheDocument();
    expect(within(card).getByText('Challenge')).toBeInTheDocument();
    expect(within(card).getByText('Resistances')).toBeInTheDocument();
    expect(within(card).getByText('Immunities')).toBeInTheDocument();
    expect(within(card).getByText('Bonus actions')).toBeInTheDocument();
    expect(within(card).getByText('Reactions')).toBeInTheDocument();

    // Aucune fuite des libellés FR codés en dur d'avant la passe.
    expect(within(card).queryByText('Profil de la créature invoquée')).not.toBeInTheDocument();
    expect(within(card).queryByText("Classe d'armure")).not.toBeInTheDocument();
    expect(within(card).queryByText('Points de vie')).not.toBeInTheDocument();
    expect(within(card).queryByText('Facteur de puissance')).not.toBeInTheDocument();
    expect(within(card).queryByText('Résistances')).not.toBeInTheDocument();
    expect(within(card).queryByText('Immunités')).not.toBeInTheDocument();
    expect(within(card).queryByText('Actions bonus')).not.toBeInTheDocument();
    expect(within(card).queryByText('Réactions')).not.toBeInTheDocument();
    expect(card).not.toHaveAttribute('aria-label', 'Profil de Aetherial Beast');
  });

  it('rend le FR par défaut (non-régression visuelle)', () => {
    render(<SummonedCreatureStatBlockCard statBlock={FIXTURE} />);

    const card = screen.getByTestId('summoned-creature-statblock');
    expect(within(card).getByText('Profil de la créature invoquée')).toBeInTheDocument();
    expect(card).toHaveAttribute('aria-label', 'Profil de Bête éthérée');
    expect(within(card).getByText("Classe d'armure")).toBeInTheDocument();
    expect(within(card).getByText('Points de vie')).toBeInTheDocument();
    expect(within(card).getByText('Facteur de puissance')).toBeInTheDocument();
    expect(within(card).getByText('Actions bonus')).toBeInTheDocument();
    expect(within(card).getByText('Réactions')).toBeInTheDocument();
  });
});
