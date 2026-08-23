import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Skeleton, SkeletonList, SkeletonText } from '../skeleton';

/**
 * L'ossature de chargement a une exigence d'accessibilité forte : elle remplace
 * une phrase que le lecteur d'écran lisait très bien. Si la phrase disparaît
 * sans être remplacée, on a amélioré l'écran pour les voyants en le dégradant
 * pour les autres.
 */
describe('<Skeleton>', () => {
  it('les formes sont décoratives — invisibles aux lecteurs d’écran', () => {
    const { container } = render(<Skeleton />);
    expect(container.querySelector('.skeleton')?.getAttribute('aria-hidden')).toBe(
      'true',
    );
  });

  it('annonce l’attente par un texte, pas par un empilement de formes', () => {
    render(<SkeletonList label="Chargement de tes personnages" rows={3} />);
    const block = screen.getByText('Chargement de tes personnages');
    expect(block.className).toContain('sr-only');
    // `aria-busy` porte l'état ; `aria-live` fait annoncer l'arrivée du contenu.
    const region = block.parentElement as HTMLElement;
    expect(region.getAttribute('aria-busy')).toBe('true');
    expect(region.getAttribute('aria-live')).toBe('polite');
  });

  it('rend autant de rangées que demandé', () => {
    const { container } = render(<SkeletonList label="…" rows={5} />);
    // Deux barres par rangée (titre + sous-titre) plus la pastille ronde.
    expect(container.querySelectorAll('.skeleton')).toHaveLength(5 * 3);
  });

  it('rend autant de lignes de texte que demandé', () => {
    const { container } = render(<SkeletonText label="…" lines={4} />);
    expect(container.querySelectorAll('.skeleton')).toHaveLength(4);
  });
});
