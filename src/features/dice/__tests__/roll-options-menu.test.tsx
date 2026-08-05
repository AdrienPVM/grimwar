import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { NORMAL_ROLL, RollOptionsMenu } from '../roll-options-menu';

/**
 * Le menu ne lance rien : il rend un CHOIX. On vérifie donc exactement ce
 * qu'il remonte, puisque c'est tout ce dont l'appelant dispose.
 */
describe('RollOptionsMenu', () => {
  function setup(hasInspiration = true) {
    const onPick = vi.fn();
    const onClose = vi.fn();
    render(
      <RollOptionsMenu
        title="JS Force"
        ariaLabel="Options du jet JS Force"
        hasInspiration={hasInspiration}
        onPick={onPick}
        onClose={onClose}
      />,
    );
    return { onPick, onClose };
  }

  it('remonte un jet ordinaire par défaut', () => {
    const { onPick } = setup();
    fireEvent.click(screen.getByTestId('roll-options-normal'));
    expect(onPick).toHaveBeenCalledWith({
      advantage: 'normal',
      useInspiration: false,
      bonus: 0,
    });
  });

  it('remonte l’avantage et le désavantage demandés', () => {
    const { onPick } = setup();
    fireEvent.click(screen.getByTestId('roll-options-advantage'));
    expect(onPick).toHaveBeenLastCalledWith(
      expect.objectContaining({ advantage: 'advantage' }),
    );
    fireEvent.click(screen.getByTestId('roll-options-disadvantage'));
    expect(onPick).toHaveBeenLastCalledWith(
      expect.objectContaining({ advantage: 'disadvantage' }),
    );
  });

  it('remonte le bonus ponctuel saisi', () => {
    const { onPick } = setup();
    fireEvent.change(screen.getByTestId('roll-options-bonus'), {
      target: { value: '2' },
    });
    fireEvent.click(screen.getByTestId('roll-options-normal'));
    expect(onPick).toHaveBeenCalledWith(
      expect.objectContaining({ bonus: 2 }),
    );
  });

  it('accepte un bonus négatif (malus circonstanciel)', () => {
    const { onPick } = setup();
    fireEvent.change(screen.getByTestId('roll-options-bonus'), {
      target: { value: '-3' },
    });
    fireEvent.click(screen.getByTestId('roll-options-normal'));
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ bonus: -3 }));
  });

  it('borne le bonus pour qu’une faute de frappe ne devienne pas un +900', () => {
    const { onPick } = setup();
    fireEvent.change(screen.getByTestId('roll-options-bonus'), {
      target: { value: '900' },
    });
    fireEvent.click(screen.getByTestId('roll-options-normal'));
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ bonus: 10 }));
  });

  it('ne dépense l’inspiration que si on l’active', () => {
    const { onPick } = setup();
    const toggle = screen.getByTestId('roll-options-inspiration');
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(screen.getByTestId('roll-options-normal'));
    expect(onPick).toHaveBeenCalledWith(
      expect.objectContaining({ useInspiration: true }),
    );
  });

  it('cache la dépense d’inspiration quand il n’y en a pas à dépenser', () => {
    setup(false);
    expect(screen.queryByTestId('roll-options-inspiration')).toBeNull();
  });

  it('NORMAL_ROLL décrit bien le tap simple', () => {
    expect(NORMAL_ROLL).toEqual({
      advantage: 'normal',
      useInspiration: false,
      bonus: 0,
    });
  });
});
