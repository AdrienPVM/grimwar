import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { t } from '@/shared/lib/i18n';

const createHandout = vi.fn();
const logHandoutSent = vi.fn();
const showToast = vi.fn();

vi.mock('@/shared/lib/services/handouts', () => ({
  createHandout: (...args: unknown[]) => createHandout(...args),
}));
vi.mock('@/shared/lib/event-logger', () => ({
  logHandoutSent: (...args: unknown[]) => logHandoutSent(...args),
}));
vi.mock('@/shared/lib/slices/toast-slice', () => ({
  showToast: (...args: unknown[]) => showToast(...args),
}));

import { HandoutCreateModal, type HandoutPlayer } from '../handout-create-modal';

const PLAYERS: HandoutPlayer[] = [
  { uid: 'p-1', label: 'Alice' },
  { uid: 'p-2', label: 'Bob' },
];

function renderModal(over: { players?: HandoutPlayer[] } = {}): {
  onClose: ReturnType<typeof vi.fn>;
  onSent: ReturnType<typeof vi.fn>;
} {
  const onClose = vi.fn();
  const onSent = vi.fn();
  render(
    <HandoutCreateModal
      open
      campaignId="c-1"
      createdByUid="dm-1"
      players={over.players ?? PLAYERS}
      onClose={onClose}
      onSent={onSent}
    />,
  );
  return { onClose, onSent };
}

beforeEach(() => {
  createHandout.mockReset().mockResolvedValue('hd-new');
  logHandoutSent.mockReset().mockResolvedValue(undefined);
  showToast.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('HandoutCreateModal', () => {
  it('bloque l’envoi sans titre et affiche l’erreur', async () => {
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: t('handouts.create.send') }));
    expect(await screen.findByText(t('handouts.create.error.title'))).toBeInTheDocument();
    expect(createHandout).not.toHaveBeenCalled();
  });

  it('bloque l’envoi sans contenu', async () => {
    renderModal();
    fireEvent.change(screen.getByPlaceholderText(t('handouts.create.titlePlaceholder')), {
      target: { value: 'Une lettre' },
    });
    fireEvent.click(screen.getByRole('button', { name: t('handouts.create.send') }));
    expect(await screen.findByText(t('handouts.create.error.content'))).toBeInTheDocument();
    expect(createHandout).not.toHaveBeenCalled();
  });

  it("envoie à toute la table par défaut avec type 'text'", async () => {
    const { onSent } = renderModal();
    fireEvent.change(screen.getByPlaceholderText(t('handouts.create.titlePlaceholder')), {
      target: { value: 'La carte' },
    });
    fireEvent.change(screen.getByPlaceholderText(t('handouts.create.contentPlaceholder')), {
      target: { value: '## Salle secrète' },
    });
    fireEvent.click(screen.getByRole('button', { name: t('handouts.create.send') }));

    await waitFor(() => expect(createHandout).toHaveBeenCalledTimes(1));
    expect(createHandout).toHaveBeenCalledWith('c-1', 'dm-1', {
      title: 'La carte',
      type: 'text',
      content: { text: '## Salle secrète' },
      recipients: 'all',
    });
    await waitFor(() => expect(logHandoutSent).toHaveBeenCalledWith('hd-new', 'all', 'La carte'));
    await waitFor(() => expect(onSent).toHaveBeenCalled());
  });

  it('cible des joueurs précis et exige au moins un destinataire', async () => {
    renderModal();
    fireEvent.change(screen.getByPlaceholderText(t('handouts.create.titlePlaceholder')), {
      target: { value: 'Indice privé' },
    });
    fireEvent.change(screen.getByPlaceholderText(t('handouts.create.contentPlaceholder')), {
      target: { value: 'Pour toi seul' },
    });
    // Passe en mode « choisir des joueurs » sans sélection → erreur.
    fireEvent.click(screen.getByRole('button', { name: t('handouts.create.recipientsSome') }));
    fireEvent.click(screen.getByRole('button', { name: t('handouts.create.send') }));
    expect(await screen.findByText(t('handouts.create.error.recipients'))).toBeInTheDocument();
    expect(createHandout).not.toHaveBeenCalled();

    // Sélectionne Bob → envoi ciblé.
    fireEvent.click(screen.getByRole('button', { name: 'Bob' }));
    fireEvent.click(screen.getByRole('button', { name: t('handouts.create.send') }));
    await waitFor(() => expect(createHandout).toHaveBeenCalledTimes(1));
    expect(createHandout).toHaveBeenCalledWith(
      'c-1',
      'dm-1',
      expect.objectContaining({ recipients: ['p-2'] }),
    );
  });
});
