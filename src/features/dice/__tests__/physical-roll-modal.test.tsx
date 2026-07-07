import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';

import {
  requestPhysicalRoll,
  resolvePhysicalRoll,
  useUiModalsStore,
} from '@/shared/lib/slices/ui-modals-slice';

import { PhysicalRollModal } from '../physical-roll-modal';

/**
 * `<PhysicalRollModal />` — remontage par requête (clé `requestId`).
 *
 * Régression : deux prompts consécutifs partageant label + nombre de dés (ex.
 * un jet d'attaque « 1d20 » remplacé par un jet de sauvegarde « 1d20 »)
 * réconciliaient la MÊME instance sous l'ancienne clé `label + dice.length`,
 * gardant les faces saisies au prompt précédent. La clé `requestId` monotone
 * force le remontage → les faces repartent vides.
 */

function spec(label: string, modifier: number) {
  return {
    dice: [{ count: 1, sides: 20 }],
    modifier,
    label,
    advantage: 'normal' as const,
  };
}

afterEach(() => {
  act(() => {
    resolvePhysicalRoll(null);
    useUiModalsStore.setState({ pendingPhysicalRoll: null });
  });
});

describe('<PhysicalRollModal>', () => {
  it('aucune requête → ne rend rien', () => {
    const { container } = render(<PhysicalRollModal />);
    expect(container).toBeEmptyDOMElement();
  });

  it('deux prompts même label + même nombre de dés → les faces ne fuient PAS', async () => {
    const user = userEvent.setup();
    // Prompt A (attaque) — même forme « 1d20 » que le prompt B qui suivra.
    void requestPhysicalRoll(spec('Attaque', 5));
    render(<PhysicalRollModal />);

    const inputA = screen.getByLabelText('Face d20 numéro 1') as HTMLInputElement;
    await user.type(inputA, '13');
    expect(inputA.value).toBe('13');

    // Prompt B — MÊME label, MÊME nombre de dés. Auto-passe A. Sous l'ancienne
    // clé (label + dice.length), l'instance n'était PAS remontée → '13' restait.
    act(() => {
      void requestPhysicalRoll(spec('Attaque', 3));
    });

    const inputB = screen.getByLabelText('Face d20 numéro 1') as HTMLInputElement;
    expect(inputB.value).toBe('');
  });
});
