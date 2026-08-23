import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { t } from '@/shared/lib/i18n';

const createHandout = vi.fn();
const updateHandout = vi.fn();
const logHandoutSent = vi.fn();
const showToast = vi.fn();

vi.mock('@/shared/lib/services/handouts', () => ({
  createHandout: (...args: unknown[]) => createHandout(...args),
  updateHandout: (...args: unknown[]) => updateHandout(...args),
}));
vi.mock('@/shared/lib/event-logger', () => ({
  logHandoutSent: (...args: unknown[]) => logHandoutSent(...args),
}));
vi.mock('@/shared/lib/slices/toast-slice', () => ({
  showToast: (...args: unknown[]) => showToast(...args),
}));

import type { Handout } from '@/shared/types/handout';

import { HandoutEditorModal, type HandoutPlayer } from '../handout-editor-modal';

const PLAYERS: HandoutPlayer[] = [
  { uid: 'p-1', label: 'Alice' },
  { uid: 'p-2', label: 'Bob' },
];

function mkHandout(over: Partial<Handout> = {}): Handout {
  return {
    id: 'hd-1',
    title: 'La lettre du baron',
    type: 'text',
    content: { text: 'Mon cher ami…' },
    recipients: ['p-1'],
    revealedTo: ['p-1'],
    visibility: 'sent',
    createdBy: 'dm-1',
    createdAt: null,
    ...over,
  } as Handout;
}

function renderModal(
  over: { players?: HandoutPlayer[]; editing?: Handout | null } = {},
): {
  onClose: ReturnType<typeof vi.fn>;
  onSent: ReturnType<typeof vi.fn>;
} {
  const onClose = vi.fn();
  const onSent = vi.fn();
  render(
    <HandoutEditorModal
      open
      campaignId="c-1"
      createdByUid="dm-1"
      players={over.players ?? PLAYERS}
      editing={over.editing ?? null}
      onClose={onClose}
      onSent={onSent}
    />,
  );
  return { onClose, onSent };
}

beforeEach(() => {
  createHandout.mockReset().mockResolvedValue('hd-new');
  updateHandout.mockReset().mockResolvedValue(undefined);
  logHandoutSent.mockReset().mockResolvedValue(undefined);
  showToast.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('HandoutEditorModal — création', () => {
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

// ─────────────────────────────────────────────────────────────────────
// Correction d'un document déjà envoyé (M12)
// ─────────────────────────────────────────────────────────────────────

describe('HandoutEditorModal — correction (M12)', () => {
  it('préremplit titre, contenu et destinataires du document existant', () => {
    renderModal({ editing: mkHandout() });
    expect(screen.getByText(t('handouts.edit.title'))).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(t('handouts.create.titlePlaceholder')),
    ).toHaveValue('La lettre du baron');
    expect(
      screen.getByPlaceholderText(t('handouts.create.contentPlaceholder')),
    ).toHaveValue('Mon cher ami…');
    // Ciblé sur Alice → mode « choisir » actif, Alice cochée.
    expect(
      screen.getByRole('button', { name: t('handouts.create.recipientsSome') }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Alice/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('corriger le titre appelle updateHandout, PAS createHandout', async () => {
    const { onSent } = renderModal({ editing: mkHandout() });
    fireEvent.change(
      screen.getByPlaceholderText(t('handouts.create.titlePlaceholder')),
      { target: { value: 'La lettre de la baronne' } },
    );
    fireEvent.click(screen.getByRole('button', { name: t('handouts.edit.save') }));

    await waitFor(() => expect(updateHandout).toHaveBeenCalledTimes(1));
    expect(updateHandout).toHaveBeenCalledWith('c-1', 'hd-1', {
      title: 'La lettre de la baronne',
      text: 'Mon cher ami…',
      recipients: ['p-1'],
    });
    expect(createHandout).not.toHaveBeenCalled();
    await waitFor(() => expect(onSent).toHaveBeenCalled());
  });

  it('une correction ne re-journalise PAS un envoi (le récit mentirait)', async () => {
    renderModal({ editing: mkHandout() });
    fireEvent.click(screen.getByRole('button', { name: t('handouts.edit.save') }));
    await waitFor(() => expect(updateHandout).toHaveBeenCalled());
    expect(logHandoutSent).not.toHaveBeenCalled();
  });

  it('ajouter un destinataire transmet la liste élargie', async () => {
    renderModal({ editing: mkHandout({ recipients: ['p-1'] }) });
    fireEvent.click(screen.getByRole('button', { name: /Bob/ }));
    fireEvent.click(screen.getByRole('button', { name: t('handouts.edit.save') }));
    await waitFor(() =>
      expect(updateHandout).toHaveBeenCalledWith(
        'c-1',
        'hd-1',
        expect.objectContaining({ recipients: ['p-1', 'p-2'] }),
      ),
    );
  });

  it('document diffusé à toute la table → mode « toute la table » présélectionné', () => {
    renderModal({ editing: mkHandout({ recipients: 'all' }) });
    expect(
      screen.getByRole('button', { name: t('handouts.create.recipientsAll') }),
    ).toHaveAttribute('aria-pressed', 'true');
  });
});
