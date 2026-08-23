import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Le service de rotation (M11) écrit 3 docs Firestore — stubé au niveau module
// pour observer les arguments réellement passés (l'uid de l'APPELANT, exigé par
// la rule de create sur `inviteCodes`).
const rotateMock = vi.fn();
vi.mock('@/shared/lib/services/campaigns', () => ({
  rotateInviteCode: (...args: unknown[]) => rotateMock(...args),
}));

import { InviteCodeReveal, buildInviteLink } from '../invite-code-reveal';

// ─────────────────────────────────────────────────────────────────────
// Helpers — on contrôle navigator.clipboard et document.execCommand pour
// observer le chemin de copie utilisé. Pas de fake timers : `waitFor` de
// React Testing Library s'appuie sur de vrais setTimeout, et le `setTimeout`
// du composant lui-même (feedback Copié → 1800ms) peut s'observer simplement
// avec un `new Promise` réel — le test reste rapide (<2s).
// ─────────────────────────────────────────────────────────────────────

interface ClipboardMock {
  writeText: ReturnType<typeof vi.fn>;
}

function installClipboard(
  writeTextImpl: (text: string) => Promise<void> = vi.fn().mockResolvedValue(undefined),
): ClipboardMock {
  const writeText = vi.fn(writeTextImpl);
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    writable: true,
    configurable: true,
  });
  return { writeText };
}

function uninstallClipboard(): void {
  Object.defineProperty(navigator, 'clipboard', {
    value: undefined,
    writable: true,
    configurable: true,
  });
}

function installShare(): ReturnType<typeof vi.fn> {
  const share = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'share', {
    value: share,
    writable: true,
    configurable: true,
  });
  return share;
}

function uninstallShare(): void {
  Object.defineProperty(navigator, 'share', {
    value: undefined,
    writable: true,
    configurable: true,
  });
}

afterEach(() => {
  uninstallClipboard();
  uninstallShare();
  rotateMock.mockReset();
});

describe('<InviteCodeReveal>', () => {
  it('affiche le code en grand', () => {
    render(<InviteCodeReveal code="ABC234" />);
    expect(screen.getByText('ABC234')).toBeInTheDocument();
    // L'aria-label exact du code (pas du wrapper) → un unique élément.
    expect(
      screen.getByLabelText("Code d'invitation à dicter ou copier"),
    ).toBeInTheDocument();
  });

  it("clic Copier → appelle navigator.clipboard.writeText + bascule sur 'Copié !'", async () => {
    const { writeText } = installClipboard();
    render(<InviteCodeReveal code="ABC234" />);
    fireEvent.click(screen.getByRole('button', { name: /Copier le code/i }));
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('ABC234');
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Copié/i })).toBeInTheDocument();
    });
  });

  it('le feedback Copié revient à Copier après le timeout', async () => {
    installClipboard();
    render(<InviteCodeReveal code="XYZ234" />);
    fireEvent.click(screen.getByRole('button', { name: /Copier le code/i }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Copié/i })).toBeInTheDocument();
    });
    // 1800ms est la valeur exacte du timeout du composant — on attend un peu
    // plus pour absorber le jitter du scheduler de jsdom. Le `await act` wrappe
    // la propagation du setState déclenché par setTimeout.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 2000));
    });
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Copier le code/i }),
      ).toBeInTheDocument();
    });
  });

  it("fallback execCommand si navigator.clipboard absent", async () => {
    const execCommandMock = vi.fn().mockReturnValue(true);
    const original = document.execCommand;
    document.execCommand = execCommandMock as typeof document.execCommand;
    try {
      render(<InviteCodeReveal code="QWE234" />);
      fireEvent.click(screen.getByRole('button', { name: /Copier le code/i }));
      await waitFor(() => {
        expect(execCommandMock).toHaveBeenCalledWith('copy');
      });
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Copié/i })).toBeInTheDocument();
      });
    } finally {
      document.execCommand = original;
    }
  });

  it("pas de feedback Copié si writeText rejette ET execCommand échoue", async () => {
    installClipboard(() => Promise.reject(new Error('denied')));
    const original = document.execCommand;
    document.execCommand = (() => false) as typeof document.execCommand;
    try {
      render(<InviteCodeReveal code="ABC234" />);
      fireEvent.click(screen.getByRole('button', { name: /Copier le code/i }));
      // Tick une microtask pour laisser la promise rejected se propager.
      await Promise.resolve();
      await Promise.resolve();
      expect(
        screen.queryByRole('button', { name: /^Copié/i }),
      ).not.toBeInTheDocument();
    } finally {
      document.execCommand = original;
    }
  });

  it('buildInviteLink construit /campaigns/join?code=CODE sur l’origine courante', () => {
    expect(buildInviteLink('ABC234')).toBe(
      `${window.location.origin}/campaigns/join?code=ABC234`,
    );
  });

  it('« Partager le lien » avec Web Share API → navigator.share reçoit l’URL, pas de copie', async () => {
    const share = installShare();
    const { writeText } = installClipboard();
    render(<InviteCodeReveal code="ABC234" />);
    fireEvent.click(screen.getByRole('button', { name: /Partager le lien/i }));
    await waitFor(() => {
      expect(share).toHaveBeenCalledWith(
        expect.objectContaining({
          url: `${window.location.origin}/campaigns/join?code=ABC234`,
        }),
      );
    });
    expect(writeText).not.toHaveBeenCalled();
  });

  it('« Partager le lien » sans Web Share API → copie l’URL + « Lien copié ! »', async () => {
    // navigator.share absent (uninstallShare via afterEach du test précédent, ici
    // jamais installé) → repli sur la copie presse-papiers.
    const { writeText } = installClipboard();
    render(<InviteCodeReveal code="ABC234" />);
    fireEvent.click(screen.getByRole('button', { name: /Partager le lien/i }));
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(
        `${window.location.origin}/campaigns/join?code=ABC234`,
      );
    });
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Lien copié/i }),
      ).toBeInTheDocument();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────
// Régénération du code (M11) — révocation d'un code diffusé
// ─────────────────────────────────────────────────────────────────────

describe('<InviteCodeReveal> — régénération du code', () => {
  it('sans campaignId/uid → aucune affordance de régénération (vue joueur)', () => {
    render(<InviteCodeReveal code="ABC234" />);
    expect(
      screen.queryByRole('button', { name: /Régénérer le code/i }),
    ).not.toBeInTheDocument();
  });

  it('un simple clic ne régénère RIEN : il faut confirmer', () => {
    render(<InviteCodeReveal code="ABC234" campaignId="cid-1" uid="gm-1" />);
    fireEvent.click(screen.getByRole('button', { name: /Régénérer le code/i }));
    expect(rotateMock).not.toHaveBeenCalled();
    // L'avertissement dit ce qui casse — les liens déjà partagés.
    expect(
      screen.getByText(/Le code actuel cessera immédiatement de fonctionner/i),
    ).toBeInTheDocument();
  });

  it('confirmation → appelle le service avec (campaignId, uid) et notifie le parent', async () => {
    rotateMock.mockResolvedValue('ZZZ789');
    const onRotated = vi.fn();
    render(
      <InviteCodeReveal
        code="ABC234"
        campaignId="cid-1"
        uid="gm-1"
        onRotated={onRotated}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Régénérer le code/i }));
    fireEvent.click(
      screen.getByRole('button', { name: /Confirmer la régénération/i }),
    );
    await waitFor(() => {
      expect(rotateMock).toHaveBeenCalledWith('cid-1', 'gm-1');
    });
    await waitFor(() => {
      expect(onRotated).toHaveBeenCalledWith('ZZZ789');
    });
    // Le bloc revient à l'état de repos, avec l'accusé de réception.
    await waitFor(() => {
      expect(screen.getByText('Nouveau code en place.')).toBeInTheDocument();
    });
  });

  it('« Garder le code actuel » annule sans écrire', () => {
    render(<InviteCodeReveal code="ABC234" campaignId="cid-1" uid="gm-1" />);
    fireEvent.click(screen.getByRole('button', { name: /Régénérer le code/i }));
    fireEvent.click(
      screen.getByRole('button', { name: /Garder le code actuel/i }),
    );
    expect(rotateMock).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: /Régénérer le code/i }),
    ).toBeInTheDocument();
  });

  it('échec du service → message d’erreur, le code affiché reste inchangé', async () => {
    rotateMock.mockRejectedValue(new Error('permission-denied'));
    render(<InviteCodeReveal code="ABC234" campaignId="cid-1" uid="gm-1" />);
    fireEvent.click(screen.getByRole('button', { name: /Régénérer le code/i }));
    fireEvent.click(
      screen.getByRole('button', { name: /Confirmer la régénération/i }),
    );
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        /La régénération n'a pas abouti/i,
      );
    });
    expect(screen.getByText('ABC234')).toBeInTheDocument();
  });
});
