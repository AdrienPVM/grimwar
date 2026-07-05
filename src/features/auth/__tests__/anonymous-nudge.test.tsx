import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

// useAuth — piloté par un holder mutable (uid + isAnonymous).
const authHolder: { user: { uid: string } | null; isAnonymous: boolean } = {
  user: { uid: 'uid-1' },
  isAnonymous: true,
};
vi.mock('@/features/auth/use-auth', () => ({
  useAuth: () => authHolder,
}));

const navigateMock = vi.fn();
vi.mock('react-router-dom', async (importActual) => {
  const actual = await importActual<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});

import { AnonymousNudge } from '../anonymous-nudge';

afterEach(() => {
  authHolder.user = { uid: 'uid-1' };
  authHolder.isAnonymous = true;
  navigateMock.mockReset();
});

function renderNudge(): ReturnType<typeof render> {
  return render(
    <MemoryRouter>
      <AnonymousNudge />
    </MemoryRouter>,
  );
}

describe('<AnonymousNudge>', () => {
  it("affiche le rappel pour un utilisateur anonyme, avec CTA vers /account", () => {
    authHolder.isAnonymous = true;
    renderNudge();
    // Identité du contenu, pas juste présence : titre + corps + CTA attendus.
    expect(screen.getByText('Sauvegarde ton compte')).toBeInTheDocument();
    expect(screen.getByText(/ton compte est provisoire/i)).toBeInTheDocument();
    const cta = screen.getByRole('button', { name: /Sécuriser mon compte/i });
    fireEvent.click(cta);
    expect(navigateMock).toHaveBeenCalledWith('/account');
  });

  it("ne rend rien pour un utilisateur déjà lié (compte non anonyme)", () => {
    authHolder.isAnonymous = false;
    const { container } = renderNudge();
    expect(container).toBeEmptyDOMElement();
  });

  it("ne rend rien sans utilisateur connecté", () => {
    authHolder.user = null;
    authHolder.isAnonymous = true;
    const { container } = renderNudge();
    expect(container).toBeEmptyDOMElement();
  });
});
