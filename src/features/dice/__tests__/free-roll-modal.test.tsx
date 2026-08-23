import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { FreeRollModal } from '../free-roll-modal';

/**
 * La modale ne lance pas : elle valide une formule et la remonte. On vérifie
 * donc que la validation suit exactement ce que le parseur accepte — y compris
 * les dés retranchés ouverts par M48.
 */
describe('FreeRollModal', () => {
  function setup() {
    const onSubmit = vi.fn();
    const onClose = vi.fn();
    render(<FreeRollModal onSubmit={onSubmit} onClose={onClose} />);
    return { onSubmit, onClose };
  }

  function type(value: string): void {
    fireEvent.change(screen.getByTestId('free-roll-input'), {
      target: { value },
    });
  }

  it('n’accuse pas un champ encore vide', () => {
    setup();
    expect(screen.queryByTestId('free-roll-error')).toBeNull();
    expect(screen.getByTestId('free-roll-submit')).toBeDisabled();
  });

  it('remonte une formule valide', () => {
    const { onSubmit } = setup();
    type('2d10+3');
    expect(screen.queryByTestId('free-roll-error')).toBeNull();
    fireEvent.click(screen.getByTestId('free-roll-submit'));
    expect(onSubmit).toHaveBeenCalledWith('2d10+3');
  });

  it('accepte un terme retranché (Fardeau)', () => {
    const { onSubmit } = setup();
    type('1d20-1d4');
    fireEvent.click(screen.getByTestId('free-roll-submit'));
    expect(onSubmit).toHaveBeenCalledWith('1d20-1d4');
  });

  it('signale une formule illisible dès la frappe et bloque le lancer', () => {
    const { onSubmit } = setup();
    type('2d');
    expect(screen.getByTestId('free-roll-error')).toBeInTheDocument();
    expect(screen.getByTestId('free-roll-submit')).toBeDisabled();
    fireEvent.click(screen.getByTestId('free-roll-submit'));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('rattrape une formule corrigée après une saisie fautive', () => {
    setup();
    type('4d');
    expect(screen.getByTestId('free-roll-error')).toBeInTheDocument();
    type('4d6');
    expect(screen.queryByTestId('free-roll-error')).toBeNull();
    expect(screen.getByTestId('free-roll-submit')).toBeEnabled();
  });

  it('lance à la touche Entrée', () => {
    const { onSubmit } = setup();
    type('  8d6  ');
    fireEvent.keyDown(screen.getByTestId('free-roll-input'), { key: 'Enter' });
    expect(onSubmit).toHaveBeenCalledWith('8d6');
  });

  it('n’envoie rien à Entrée sur une formule invalide', () => {
    const { onSubmit } = setup();
    type('abc');
    fireEvent.keyDown(screen.getByTestId('free-roll-input'), { key: 'Enter' });
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
