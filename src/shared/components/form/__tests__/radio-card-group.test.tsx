import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { RadioCardGroup, type RadioCardOption } from '../radio-card-group';

/**
 * Composant utilitaire pour les sous-choix narratifs (plan 13.8 step 1).
 *
 * Tests comportementaux + a11y. Doivent ÉCHOUER si on retombe sur :
 *   - `<select>` natif au lieu de cards,
 *   - perte du fieldset/legend,
 *   - tap target < 44px,
 *   - radio sans `name` partagé (qui casse la nav flèches native).
 */

const OPTIONS: ReadonlyArray<RadioCardOption<'a' | 'b' | 'c'>> = [
  {
    value: 'a',
    title: 'Alpha',
    description: 'Premier choix.',
    mechanicalImpact: 'Impact A',
  },
  { value: 'b', title: 'Bêta', description: 'Deuxième choix.' },
  { value: 'c', title: 'Cêdrat', mechanicalImpact: 'Impact C' },
];

function Harness({
  initial,
  onChangeSpy,
}: {
  initial?: 'a' | 'b' | 'c' | null;
  onChangeSpy?: (v: 'a' | 'b' | 'c') => void;
}): JSX.Element {
  const [v, setV] = useState<'a' | 'b' | 'c' | null>(initial ?? null);
  return (
    <RadioCardGroup
      legend="Sous-choix"
      helper="Helper pédagogique"
      name="test-choice"
      value={v}
      onValueChange={(next) => {
        setV(next);
        onChangeSpy?.(next);
      }}
      options={OPTIONS}
    />
  );
}

describe('<RadioCardGroup> — structure a11y', () => {
  it('rend un radiogroup avec aria-label = legend (jamais un <select>)', () => {
    render(<Harness />);
    const group = screen.getByRole('radiogroup', { name: 'Sous-choix' });
    expect(group).toBeInTheDocument();
    expect(document.querySelector('select')).toBeNull();
  });

  it('rend un fieldset + legend lisible (pas sr-only)', () => {
    render(<Harness />);
    const legend = screen.getByText('Sous-choix');
    expect(legend.tagName).toBe('LEGEND');
    expect(legend.className).not.toContain('sr-only');
  });

  it('rend le helper sous la legend', () => {
    render(<Harness />);
    expect(screen.getByText('Helper pédagogique')).toBeInTheDocument();
  });

  it('chaque option est un input radio avec le même name (nav flèches native)', () => {
    render(<Harness />);
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(3);
    for (const r of radios) {
      expect(r.getAttribute('name')).toBe('test-choice');
    }
  });

  it('tap target ≥ 68px sur chaque carte (mobile-first)', () => {
    render(<Harness />);
    // Les inputs radio sont sr-only ; la zone tappable est le <label>.
    const labels = document.querySelectorAll('label[for^="radio-card-"]');
    expect(labels.length).toBe(3);
    labels.forEach((label) => {
      expect(label.className).toContain('min-h-[68px]');
    });
  });
});

describe('<RadioCardGroup> — sélection à la souris', () => {
  it('cliquer une carte met à jour la valeur et la marque cochée', () => {
    const spy = vi.fn();
    render(<Harness onChangeSpy={spy} />);
    fireEvent.click(screen.getByRole('radio', { name: /Bêta/ }));
    expect(spy).toHaveBeenCalledWith('b');
    expect(screen.getByRole('radio', { name: /Bêta/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /Alpha/ })).not.toBeChecked();
  });

  it('option disabled ne déclenche pas onValueChange', () => {
    const spy = vi.fn();
    const opts: ReadonlyArray<RadioCardOption<'a' | 'b'>> = [
      { value: 'a', title: 'A' },
      { value: 'b', title: 'B', disabled: true },
    ];
    render(
      <RadioCardGroup
        legend="L"
        name="n"
        value={null}
        onValueChange={spy}
        options={opts}
      />,
    );
    // La radio b est disabled : `fireEvent.click` n'émet pas onChange.
    fireEvent.click(screen.getByRole('radio', { name: /B/ }));
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('<RadioCardGroup> — état checked', () => {
  it('value initiale → la carte correspondante est cochée', () => {
    render(<Harness initial="c" />);
    expect(screen.getByRole('radio', { name: /Cêdrat/ })).toBeChecked();
  });

  it('value=null → aucune carte cochée', () => {
    render(<Harness initial={null} />);
    for (const r of screen.getAllByRole('radio')) {
      expect(r).not.toBeChecked();
    }
  });
});

describe('<RadioCardGroup> — lisibilité (anti-régression UAT)', () => {
  it('le titre porte une couleur explicite (jamais d\'héritage ambigu)', () => {
    render(<Harness />);
    expect(screen.getByText('Alpha').className).toMatch(/\btext-(gold|gold-bright)\b/);
  });

  it('description rendue dans une classe texte canonique', () => {
    render(<Harness />);
    expect(screen.getByText('Premier choix.').className).toMatch(/\btext-text\b/);
  });

  it('impact mécanique en italique discret', () => {
    render(<Harness />);
    expect(screen.getByText('Impact A').className).toMatch(/\bitalic\b/);
  });
});
