import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { InvocationEffectCard } from '../invocation-effect-card';

/**
 * D13a — InvocationEffectCard. Tests d'identité (cat. 2) + cas-limites (cat. 6).
 *
 *  - Pour `armor-of-shadows`, la carte rend EXACTEMENT le label canonique
 *    « CA = 13 + modificateur de Dextérité » + la condition d'application
 *    « sans armure équipée, bouclier cumulable » (vocabulaire WotC FR officiel).
 *  - Pour les 4 autres invocations L1 (`eldritch-mind`, `pact-of-the-blade`,
 *    `pact-of-the-chain`, `pact-of-the-tome`) la carte ne rend rien (effet
 *    runtime pas câblé — D13b-e). Pas de placeholder trompeur.
 *  - Pour un slug inconnu (seed corrompu) la carte ne rend rien sans crash.
 */
describe('<InvocationEffectCard>', () => {
  it('cat. 2 — armor-of-shadows rend le label « CA = 13 + modificateur de Dextérité »', () => {
    const { container } = render(
      <InvocationEffectCard slug="armor-of-shadows" />,
    );
    expect(container.firstChild).not.toBeNull();
    expect(
      screen.getByTestId('invocation-effect-label'),
    ).toHaveTextContent(/CA = 13 \+ modificateur de Dextérité/);
    expect(
      screen.getByText(
        /S'applique uniquement sans armure équipée. Le bouclier reste cumulable./,
      ),
    ).toBeInTheDocument();
  });

  it('cat. 2 — armor-of-shadows rend le titre « Mécanique »', () => {
    render(<InvocationEffectCard slug="armor-of-shadows" />);
    expect(screen.getByText('Mécanique')).toBeInTheDocument();
  });

  it.each(['eldritch-mind', 'pact-of-the-blade', 'pact-of-the-chain', 'pact-of-the-tome'])(
    'cat. 6 — %s (D13b-e attendus) ne rend rien (pas de placeholder trompeur)',
    (slug) => {
      const { container } = render(<InvocationEffectCard slug={slug} />);
      expect(container.firstChild).toBeNull();
    },
  );

  it('cat. 6 — slug inconnu (seed corrompu) ne rend rien sans crash', () => {
    const { container } = render(
      <InvocationEffectCard slug="invocation-fantome-inexistante" />,
    );
    expect(container.firstChild).toBeNull();
  });
});
