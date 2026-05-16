import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

// useAuth : on simule un user anonyme par défaut (cas S1 le plus courant).
const authHolder: { user: { uid: string; displayName: string | null; email: string | null } | null } = {
  user: { uid: 'uid-anon', displayName: null, email: null },
};

vi.mock('@/features/auth/use-auth', () => ({
  useAuth: () => ({ user: authHolder.user }),
}));

import { NavShell } from '../nav-shell';

afterEach(() => {
  authHolder.user = { uid: 'uid-anon', displayName: null, email: null };
});

function renderAt(initialPath: string): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <NavShell />
    </MemoryRouter>,
  );
}

describe('<NavShell>', () => {
  it("route '/' rend la marque ⚔ GrimWar sans bouton retour", () => {
    renderAt('/');
    expect(screen.getByLabelText("Retour à l'accueil")).toBeInTheDocument();
    expect(screen.getByText('GrimWar')).toBeInTheDocument();
    expect(screen.queryByLabelText('Retour à la bibliothèque')).not.toBeInTheDocument();
  });

  it("route '/character/:id' rend le bouton retour qui pointe vers /", () => {
    renderAt('/character/c-42');
    const back = screen.getByLabelText('Retour à la bibliothèque');
    expect(back).toBeInTheDocument();
    expect(back.getAttribute('href')).toBe('/');
  });

  it("route '/create' rend également le bouton retour", () => {
    renderAt('/create');
    expect(screen.getByLabelText('Retour à la bibliothèque')).toBeInTheDocument();
  });

  it("avatar rendu avec l'initiale du displayName quand présent", () => {
    authHolder.user = { uid: 'uid-1', displayName: 'Galadriel', email: null };
    renderAt('/');
    const avatar = screen.getByLabelText('Compte (à venir)');
    expect(avatar.textContent).toBe('G');
  });

  it("avatar utilise l'initiale de l'email si pas de displayName", () => {
    authHolder.user = { uid: 'uid-2', displayName: null, email: 'remy@example.com' };
    renderAt('/');
    expect(screen.getByLabelText('Compte (à venir)').textContent).toBe('R');
  });

  it("avatar fallback 'A' pour user anonyme sans displayName ni email", () => {
    authHolder.user = { uid: 'uid-anon', displayName: null, email: null };
    renderAt('/');
    expect(screen.getByLabelText('Compte (à venir)').textContent).toBe('A');
  });

  it('avatar est cliquable et ne crash pas (no-op S1)', () => {
    renderAt('/');
    const avatar = screen.getByLabelText('Compte (à venir)');
    expect(() => avatar.click()).not.toThrow();
  });

  it('navigation principale a aria-label fr', () => {
    const { container } = renderAt('/');
    const nav = container.querySelector('nav');
    expect(nav?.getAttribute('aria-label')).toBe('Navigation principale');
  });
});
