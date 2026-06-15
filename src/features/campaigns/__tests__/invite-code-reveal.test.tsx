import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { InviteCodeReveal } from '../invite-code-reveal';

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

afterEach(() => {
  uninstallClipboard();
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
});
