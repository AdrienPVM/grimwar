import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PartyAggregateStrip } from '../party-aggregate-strip';
import type { PartyAggregate } from '../use-party-aggregate';

function mkAggregate(overrides: Partial<PartyAggregate> = {}): PartyAggregate {
  return {
    count: 3,
    averageLevel: 5,
    minLevel: 3,
    maxLevel: 7,
    downedCount: 0,
    isLoading: false,
    ...overrides,
  };
}

/** Valeur affichée d'un bloc stat, retrouvée par son libellé (identité exacte). */
function statValue(label: string): string {
  const box = screen.getByText(label).parentElement;
  return box?.querySelector('span:last-child')?.textContent ?? '';
}

describe('<PartyAggregateStrip>', () => {
  it('agrégat vide (count 0) → ne rend rien', () => {
    const { container } = render(
      <PartyAggregateStrip aggregate={mkAggregate({ count: 0 })} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('identité du contenu : effectif / niveau moyen / éventail affichés exactement', () => {
    render(<PartyAggregateStrip aggregate={mkAggregate()} />);
    expect(statValue('Effectif')).toBe('3');
    expect(statValue('Niveau moyen')).toBe('5');
    // Éventail min≠max : tiret demi-cadratin (U+2013), pas un trait d'union.
    expect(statValue('Niveaux')).toBe('3–7');
  });

  it('compagnie de niveau uniforme → éventail affiché comme un seul chiffre', () => {
    render(
      <PartyAggregateStrip
        aggregate={mkAggregate({ count: 4, averageLevel: 4, minLevel: 4, maxLevel: 4 })}
      />,
    );
    expect(statValue('Niveaux')).toBe('4');
  });

  it('personnages à terre → puce d’alerte avec le décompte', () => {
    render(<PartyAggregateStrip aggregate={mkAggregate({ downedCount: 2 })} />);
    expect(screen.getByText(/À terre/).textContent).toContain('2');
  });

  it('aucun mort → pas de puce « à terre »', () => {
    render(<PartyAggregateStrip aggregate={mkAggregate({ downedCount: 0 })} />);
    expect(screen.queryByText(/À terre/)).not.toBeInTheDocument();
  });
});
