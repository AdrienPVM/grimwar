import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Modale d'autorité sur un membre (M11) — rétrograder un co-meneur, exclure un
 * joueur. Les deux gestes sont destructifs : on vérifie qu'ils appellent le BON
 * service, qu'une fermeture n'écrit rien, et surtout que l'erreur typée
 * `last-gm-cannot-demote` remonte en français plutôt qu'en `permission-denied`
 * opaque — c'est le seul refus que le meneur rencontrera vraiment.
 */

// `vi.hoisted` : le factory de `vi.mock` est remonté en tête de module, il ne
// peut donc pas fermer sur une classe déclarée plus bas (TDZ).
const { demoteMock, kickMock, FakeCampaignServiceError } = vi.hoisted(() => {
  class FakeCampaignServiceError extends Error {
    readonly kind: string;
    constructor(kind: string) {
      super(kind);
      this.name = 'CampaignServiceError';
      this.kind = kind;
    }
  }
  return {
    demoteMock: vi.fn(),
    kickMock: vi.fn(),
    FakeCampaignServiceError,
  };
});

vi.mock('@/shared/lib/services/campaigns', () => ({
  CampaignServiceError: FakeCampaignServiceError,
  demoteGm: (...args: unknown[]) => demoteMock(...args),
  kickMember: (...args: unknown[]) => kickMock(...args),
}));

import { MemberActionModal } from '../member-action-modal';

afterEach(() => {
  demoteMock.mockReset();
  kickMock.mockReset();
});

function renderModal(
  action: 'demote' | 'kick' | null,
  opts: { onClose?: () => void; onDone?: () => void } = {},
): ReturnType<typeof render> {
  return render(
    <MemberActionModal
      action={action}
      campaignId="cid-1"
      targetUid="uid-bob"
      targetLabel="Bob"
      onClose={opts.onClose ?? vi.fn()}
      onDone={opts.onDone ?? vi.fn()}
    />,
  );
}

describe('<MemberActionModal>', () => {
  it('rétrogradation : titre, avertissement de réversibilité, appel de demoteGm', async () => {
    demoteMock.mockResolvedValue(undefined);
    const onDone = vi.fn();
    renderModal('demote', { onDone });

    expect(screen.getByText('Rétrograder ce meneur')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(
      screen.getByText(/Il redevient joueur et garde sa place à la table/i),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Rétrograder$/i }));
    await waitFor(() => {
      expect(demoteMock).toHaveBeenCalledWith('cid-1', 'uid-bob');
    });
    expect(kickMock).not.toHaveBeenCalled();
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
  });

  it('exclusion : dit ce qui est perdu ET que la fiche reste au joueur', async () => {
    kickMock.mockResolvedValue(undefined);
    renderModal('kick');

    expect(screen.getByText('Exclure ce membre')).toBeInTheDocument();
    expect(
      screen.getByText(/Sa fiche de personnage lui appartient et reste intacte/i),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Confirmer l’exclusion/i }));
    await waitFor(() => {
      expect(kickMock).toHaveBeenCalledWith('cid-1', 'uid-bob');
    });
    expect(demoteMock).not.toHaveBeenCalled();
  });

  it('dernier meneur : message explicite, pas un permission-denied brut', async () => {
    demoteMock.mockRejectedValue(
      new FakeCampaignServiceError('last-gm-cannot-demote'),
    );
    renderModal('demote');
    fireEvent.click(screen.getByRole('button', { name: /^Rétrograder$/i }));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        /doit toujours garder au moins un meneur/i,
      );
    });
  });

  it('campagne disparue : message dédié', async () => {
    kickMock.mockRejectedValue(new FakeCampaignServiceError('campaign-not-found'));
    renderModal('kick');
    fireEvent.click(screen.getByRole('button', { name: /Confirmer l’exclusion/i }));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/n'existe plus/i);
    });
  });

  it('erreur inconnue : repli générique, aucune fermeture silencieuse', async () => {
    kickMock.mockRejectedValue(new Error('offline'));
    const onDone = vi.fn();
    renderModal('kick', { onDone });
    fireEvent.click(screen.getByRole('button', { name: /Confirmer l’exclusion/i }));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/n'a pas abouti/i);
    });
    expect(onDone).not.toHaveBeenCalled();
  });

  it('« Annuler » ferme sans rien écrire', () => {
    const onClose = vi.fn();
    renderModal('kick', { onClose });
    fireEvent.click(screen.getByRole('button', { name: /^Annuler$/i }));
    expect(kickMock).not.toHaveBeenCalled();
    expect(demoteMock).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
