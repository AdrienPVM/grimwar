import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { requestHitMissGate } from '@/shared/lib/slices/ui-modals-slice';

import { HitMissGateModal } from '../hit-miss-gate-modal';
import { expectNoForbiddenEnglish } from '../../../../tests/helpers/i18n-guard';

/**
 * `<HitMissGateModal />` — gate Touché/Raté du mode physique.
 *
 * Après la migration i18n (aucune chaîne codée en dur), on vérifie l'IDENTITÉ
 * des libellés FR (Cat. 2, pas « contient ») ET que chaque bouton résout la
 * promesse de `requestHitMissGate` avec la bonne valeur (Cat. 5, comportement).
 *
 * Pas d'`afterEach` de reset : `requestHitMissGate` auto-résout toute requête
 * pendante précédente, et RTL démonte le composant entre chaque test.
 */

describe('<HitMissGateModal>', () => {
  it('aucune requête → ne rend rien', () => {
    const { container } = render(<HitMissGateModal />);
    expect(container).toBeEmptyDOMElement();
  });

  it('requête ouverte → libellés FR exacts (identité, pas présence)', () => {
    void requestHitMissGate({ label: 'Épée longue' });
    render(<HitMissGateModal />);
    expect(screen.getByText('Mode physique — résolution d’attaque')).toBeInTheDocument();
    expect(screen.getByText('Ton total dépasse-t-il la CA de la cible ?')).toBeInTheDocument();
    expect(screen.getByText('Épée longue')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Raté' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Touché' })).toBeInTheDocument();
  });

  it('« Touché » résout la promesse à hit', async () => {
    const user = userEvent.setup();
    const pending = requestHitMissGate({ label: 'Dague' });
    render(<HitMissGateModal />);
    await user.click(screen.getByRole('button', { name: 'Touché' }));
    await expect(pending).resolves.toBe('hit');
  });

  it('« Raté » résout la promesse à miss', async () => {
    const user = userEvent.setup();
    const pending = requestHitMissGate({ label: 'Dague' });
    render(<HitMissGateModal />);
    await user.click(screen.getByRole('button', { name: 'Raté' }));
    await expect(pending).resolves.toBe('miss');
  });

  it('aucun anglicisme dans les libellés', () => {
    void requestHitMissGate({ label: 'Arc court' });
    const { container } = render(<HitMissGateModal />);
    expectNoForbiddenEnglish(container.textContent ?? '', 'hit-miss-gate-modal');
  });
});
