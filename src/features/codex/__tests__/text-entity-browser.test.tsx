import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  TextEntityBrowser,
  type CodexEntry,
} from '../browsers/text-entity-browser';

/**
 * Codex — browser générique « nom + texte » (plan 19). Vérifie recherche,
 * compteur singulier/pluriel, état vide et identité du corps de modale.
 */

const ENTRIES: CodexEntry[] = [
  {
    id: 'alpha',
    name: 'Alpha',
    searchText: 'alpha première entrée',
    body: <p>Corps détaillé de Alpha.</p>,
  },
  {
    id: 'beta',
    name: 'Beta',
    searchText: 'beta deuxième entrée',
    body: <p>Corps de Beta.</p>,
  },
  {
    id: 'gamma',
    name: 'Gamma',
    searchText: 'gamma troisième entrée',
    body: <p>Corps de Gamma.</p>,
  },
];

describe('TextEntityBrowser (Codex)', () => {
  it('rend la liste triée et le compteur pluriel', () => {
    render(
      <TextEntityBrowser entries={ENTRIES} loading={false} searchPlaceholder="Chercher…" />,
    );
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.getByText('Gamma')).toBeInTheDocument();
    expect(screen.getByText('3 · résultats')).toBeInTheDocument();
  });

  it('filtre par recherche et bascule au singulier', () => {
    render(
      <TextEntityBrowser entries={ENTRIES} loading={false} searchPlaceholder="Chercher…" />,
    );
    fireEvent.change(screen.getByPlaceholderText('Chercher…'), {
      target: { value: 'première' },
    });
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.queryByText('Beta')).not.toBeInTheDocument();
    expect(screen.getByText('1 · résultat')).toBeInTheDocument();
  });

  it('montre l’état vide quand rien ne correspond', () => {
    render(
      <TextEntityBrowser entries={ENTRIES} loading={false} searchPlaceholder="Chercher…" />,
    );
    fireEvent.change(screen.getByPlaceholderText('Chercher…'), {
      target: { value: 'zzz introuvable' },
    });
    expect(
      screen.getByText('Aucune entrée ne correspond à ta recherche.'),
    ).toBeInTheDocument();
  });

  it('ouvre la modale avec le titre + le corps exact', () => {
    render(
      <TextEntityBrowser entries={ENTRIES} loading={false} searchPlaceholder="Chercher…" />,
    );
    fireEvent.click(screen.getByText('Beta'));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Beta')).toBeInTheDocument();
    expect(within(dialog).getByText('Corps de Beta.')).toBeInTheDocument();
  });

  it('affiche l’indicateur de chargement', () => {
    render(<TextEntityBrowser entries={[]} loading searchPlaceholder="Chercher…" />);
    expect(screen.getByText('Invocation du contenu…')).toBeInTheDocument();
  });
});
