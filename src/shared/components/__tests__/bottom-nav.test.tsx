import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { BottomNav, isTabActive, BOTTOM_NAV_TABS } from '../bottom-nav';
import { shouldShowBottomNav } from '../../lib/bottom-nav-visibility';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <BottomNav />
    </MemoryRouter>,
  );
}

describe('shouldShowBottomNav', () => {
  it.each([
    '/',
    '/campaigns',
    '/campaigns/abc',
    '/campaigns/abc/journal',
    '/campaigns/abc/encounters/e1',
    '/codex',
    '/account',
  ])('affiche la barre sur un écran de consultation (%s)', (path) => {
    expect(shouldShowBottomNav(path)).toBe(true);
  });

  it.each([
    // Fiche du propriétaire : le menu radial occupe déjà le coin bas droit.
    '/character/abc',
    // Fiche d'un membre lue par le meneur — même écran, autre chemin.
    '/campaigns/abc/members/u1/sheet',
    // Assistant de création : tâche tunnélisée.
    '/create',
    // Canevas de carte et sa projection TV.
    '/map-proto',
    '/map-proto/cloud/c1/maps/m1',
    '/map-proto/cloud/c1/maps/m1/tv',
    // Éditeur de packs.
    '/account/content',
    '/account/content/new',
  ])('efface la barre sur un écran immersif ou tunnélisé (%s)', (path) => {
    expect(shouldShowBottomNav(path)).toBe(false);
  });

  it('ne masque pas une route qui partage seulement un préfixe textuel', () => {
    // Garde-fou contre un `startsWith` nu : `/creations` n'est pas `/create`.
    expect(shouldShowBottomNav('/creations')).toBe(true);
    expect(shouldShowBottomNav('/characters-hall')).toBe(true);
  });

  it('ignore le slash final', () => {
    expect(shouldShowBottomNav('/codex/')).toBe(true);
    expect(shouldShowBottomNav('/create/')).toBe(false);
  });
});

describe('isTabActive', () => {
  const characters = BOTTOM_NAV_TABS[0]!;
  const campaigns = BOTTOM_NAV_TABS[1]!;

  it("n'allume « Personnages » que sur la racine exacte", () => {
    expect(isTabActive(characters, '/')).toBe(true);
    // Sans le drapeau `exact`, la racine serait préfixe de TOUT et les trois
    // onglets s'allumeraient ensemble sur chaque écran.
    expect(isTabActive(characters, '/codex')).toBe(false);
    expect(isTabActive(characters, '/campaigns')).toBe(false);
  });

  it('garde « Campagnes » allumé dans les sous-écrans de campagne', () => {
    expect(isTabActive(campaigns, '/campaigns')).toBe(true);
    expect(isTabActive(campaigns, '/campaigns/abc/journal')).toBe(true);
  });
});

describe('<BottomNav />', () => {
  it('rend les trois destinations avec leurs libellés français', () => {
    renderAt('/');
    expect(screen.getByRole('navigation', { name: 'Espaces principaux' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Personnages/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Campagnes/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Codex/ })).toBeInTheDocument();
  });

  it("marque la destination courante via aria-current, pas seulement par la couleur", () => {
    renderAt('/codex');
    expect(screen.getByRole('link', { name: /Codex/ })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: /Personnages/ })).not.toHaveAttribute('aria-current');
  });

  it('ne rend rien du tout sur la fiche', () => {
    const { container } = renderAt('/character/abc');
    expect(container).toBeEmptyDOMElement();
  });
});
