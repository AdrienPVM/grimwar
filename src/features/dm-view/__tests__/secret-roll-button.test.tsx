import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const logSecretRollMock = vi.hoisted(() => vi.fn().mockResolvedValue(true));
vi.mock('@/shared/lib/event-logger', () => ({ logSecretRoll: logSecretRollMock }));

import { SecretRollButton } from '../secret-roll-button';

/**
 * M10 — le jet secret du MJ survit à la séance.
 *
 * Le kind `dm-secret-roll` était déclaré, documenté, et tout le côté LECTEUR
 * (`event-line.ts`) était écrit. Seul l'écrivain manquait : le jet vivait dans
 * un `useState` plafonné à cinq entrées, perdu au démontage de l'écran.
 */

beforeEach(() => {
  logSecretRollMock.mockClear();
  // d20 déterministe : Math.random() = 0.5 → face 11.
  vi.spyOn(Math, 'random').mockReturnValue(0.5);
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('<SecretRollButton> — journalisation', () => {
  it('journalise le jet en visibilité MJ, avec le sujet saisi', () => {
    render(<SecretRollButton campaignId="c-1" />);
    fireEvent.change(screen.getByLabelText('À propos de quoi ?'), {
      target: { value: 'Perception du garde' },
    });
    fireEvent.change(screen.getByLabelText('Modificateur'), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lancer en secret' }));

    expect(logSecretRollMock).toHaveBeenCalledTimes(1);
    const [campaignId, meta] = logSecretRollMock.mock.calls[0]!;
    expect(campaignId).toBe('c-1');
    expect(meta).toMatchObject({
      label: 'Perception du garde',
      face: 11,
      modifier: 3,
      total: 14,
      advantage: 'normal',
    });
    // Pas de `visibility` explicite ⇒ le logger applique `'dm'` par défaut.
    expect(meta.visibility).toBeUndefined();
  });

  it('sans sujet saisi, le label part à null plutôt qu’en chaîne vide', () => {
    render(<SecretRollButton campaignId="c-1" />);
    fireEvent.click(screen.getByRole('button', { name: 'Lancer en secret' }));
    expect(logSecretRollMock.mock.calls[0]![1].label).toBeNull();
  });

  it('hors campagne, le jet reste purement local (aucune écriture)', () => {
    render(<SecretRollButton />);
    fireEvent.click(screen.getByRole('button', { name: 'Lancer en secret' }));
    expect(logSecretRollMock).not.toHaveBeenCalled();
    // Le résultat s'affiche quand même — le MJ garde son outil hors table.
    expect(screen.getByText('11')).toBeInTheDocument();
  });

  it('« Révéler » re-journalise le MÊME jet en visibilité « all »', () => {
    render(<SecretRollButton campaignId="c-1" />);
    fireEvent.click(screen.getByRole('button', { name: 'Lancer en secret' }));
    fireEvent.click(screen.getByRole('button', { name: 'Révéler à la table' }));

    expect(logSecretRollMock).toHaveBeenCalledTimes(2);
    const revealed = logSecretRollMock.mock.calls[1]![1];
    expect(revealed.visibility).toBe('all');
    // Même jet — on ne relance pas les dés en révélant.
    expect(revealed.total).toBe(logSecretRollMock.mock.calls[0]![1].total);
  });

  it('un jet déjà révélé ne peut pas l’être deux fois', () => {
    render(<SecretRollButton campaignId="c-1" />);
    fireEvent.click(screen.getByRole('button', { name: 'Lancer en secret' }));
    fireEvent.click(screen.getByRole('button', { name: 'Révéler à la table' }));
    const revealedButton = screen.getByRole('button', { name: 'Révélé' });
    expect(revealedButton).toBeDisabled();
    fireEvent.click(revealedButton);
    expect(logSecretRollMock).toHaveBeenCalledTimes(2);
  });

  it('hors campagne, aucun bouton « Révéler » — il n’y a rien à révéler', () => {
    render(<SecretRollButton />);
    fireEvent.click(screen.getByRole('button', { name: 'Lancer en secret' }));
    expect(screen.queryByRole('button', { name: 'Révéler à la table' })).toBeNull();
  });
});
