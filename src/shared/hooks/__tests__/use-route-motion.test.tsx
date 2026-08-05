import { render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useRouteMotion } from '../use-route-motion';

/**
 * Harnais minimal : un conteneur qui applique le hook, plus deux écrans hauts
 * assez pour qu'un défilement ait un sens.
 */
function Harness(): JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  useRouteMotion(ref);
  return (
    <div ref={ref}>
      <Routes>
        <Route path="/" element={<Screen title="liste" to="/detail" />} />
        <Route path="/detail" element={<Screen title="détail" to="/" />} />
      </Routes>
    </div>
  );
}

function Screen({ title, to }: { title: string; to: string }): JSX.Element {
  const navigate = useNavigate();
  return (
    <div style={{ height: '3000px' }}>
      <h1>{title}</h1>
      <button type="button" onClick={() => navigate(to)}>
        aller
      </button>
      <button type="button" onClick={() => navigate(-1)}>
        revenir
      </button>
    </div>
  );
}

describe('useRouteMotion', () => {
  let scrollTo: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    scrollTo = vi.fn((_x: number, y: number) => {
      Object.defineProperty(window, 'scrollY', { value: y, configurable: true, writable: true });
    });
    Object.defineProperty(window, 'scrollTo', { value: scrollTo, configurable: true, writable: true });
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true, writable: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function scrollUserTo(y: number): void {
    Object.defineProperty(window, 'scrollY', { value: y, configurable: true, writable: true });
    window.dispatchEvent(new Event('scroll'));
  }

  it('remonte en haut sur une navigation avant', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/']}>
        <Harness />
      </MemoryRouter>,
    );

    scrollUserTo(1200);
    await user.click(screen.getByRole('button', { name: 'aller' }));

    expect(screen.getByRole('heading', { name: 'détail' })).toBeInTheDocument();
    expect(scrollTo).toHaveBeenLastCalledWith(0, 0);
  });

  it('restaure la position mémorisée au retour', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/']}>
        <Harness />
      </MemoryRouter>,
    );

    // La liste est défilée, puis on ouvre un détail…
    scrollUserTo(1200);
    await user.click(screen.getByRole('button', { name: 'aller' }));
    expect(scrollTo).toHaveBeenLastCalledWith(0, 0);

    // …et on revient : c'est TOUTE la valeur du hook. Sans lui, on retombe en
    // tête de liste et il faut retrouver sa place à chaque aller-retour.
    await user.click(screen.getByRole('button', { name: 'revenir' }));
    expect(screen.getByRole('heading', { name: 'liste' })).toBeInTheDocument();
    expect(scrollTo).toHaveBeenLastCalledWith(0, 1200);
  });

  it('ne casse pas quand `animate` est absent (jsdom)', () => {
    // Garde-fou : le hook doit rendre l'arbre même sans API Web Animations.
    expect(() =>
      render(
        <MemoryRouter initialEntries={['/']}>
          <Harness />
        </MemoryRouter>,
      ),
    ).not.toThrow();
  });
});
