import { render, screen } from '@testing-library/react';
import { type JSX } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useLocaleStore } from '@/shared/lib/slices/locale-slice';
import type { MapMeta, MapToken } from '@/shared/types/map';

/**
 * Garde-fou « rouge avant vert » de la passe i18n des écrans carte (cloud /
 * import / TV). Avant le fix, ces trois écrans portaient leurs chaînes FR codées
 * en dur : rendus en locale EN, le FR fuyait et les assertions anglaises
 * ci-dessous échouaient. Après bascule sur `t()`, l'anglais sort correctement.
 *
 * On rend chaque écran à un état minimal (liste vide / fichier non choisi /
 * carte introuvable) pour éviter tout fixture lourd, et on asserte le couple
 * FR (contrôle) + EN (aucune fuite).
 */

// ── Mocks (hoisted) ──────────────────────────────────────────────────────
const authState = { user: { uid: 'user-alice' } as { uid: string } | null, isReady: true };
vi.mock('@/features/auth/use-auth', () => ({ useAuth: () => authState }));

const mapsListState: {
  maps: readonly MapMeta[];
  isLoading: boolean;
  error: Error | null;
} = { maps: [], isLoading: false, error: null };
vi.mock('@/features/map-proto/use-maps-list', () => ({
  useMapsList: () => mapsListState,
}));

const mapState: {
  map: MapMeta | null;
  tokens: readonly MapToken[];
  isLoading: boolean;
  error: Error | null;
} = { map: null, tokens: [], isLoading: false, error: null };
vi.mock('@/features/map-proto/use-map', () => ({ useMap: () => mapState }));
vi.mock('@/features/map-proto/use-map-image', () => ({
  useMapImage: () => ({ localImageUrl: null }),
}));

vi.mock('@/shared/lib/services/campaigns', () => ({
  ensureCampaignExists: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/shared/lib/services/maps', () => ({
  createMap: vi.fn(),
  deleteMap: vi.fn(),
}));
vi.mock('@/shared/lib/firebase', () => ({ getDb: () => ({}) }));

import { MapImportScreen } from '../map-import-screen';
import { MapsCloudScreen } from '../maps-cloud-screen';
import { MapTvScreen } from '../map-tv-screen';

afterEach(() => {
  useLocaleStore.setState({ locale: 'fr' });
});

function renderRoute(path: string, routePath: string, element: JSX.Element): void {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={routePath} element={element} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('MapsCloudScreen — i18n', () => {
  it('FR : titre + état vide + badge localisés', () => {
    renderRoute('/map-proto/cloud/camp-1', '/map-proto/cloud/:cid', <MapsCloudScreen />);
    expect(screen.getByText('Cartes')).toBeInTheDocument();
    expect(
      screen.getByText('Aucune carte pour cette campagne. Créez-en une ci-dessus.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Prototype — hors production')).toBeInTheDocument();
  });

  it('EN : aucune fuite FR', () => {
    useLocaleStore.setState({ locale: 'en' });
    renderRoute('/map-proto/cloud/camp-1', '/map-proto/cloud/:cid', <MapsCloudScreen />);
    expect(screen.getByText('Maps')).toBeInTheDocument();
    expect(
      screen.getByText('No maps for this campaign. Create one above.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Prototype — not production')).toBeInTheDocument();
  });
});

describe('MapImportScreen — i18n', () => {
  it('FR : en-tête + bouton fichier localisés', () => {
    renderRoute(
      '/map-proto/cloud/camp-1/import',
      '/map-proto/cloud/:cid/import',
      <MapImportScreen />,
    );
    expect(screen.getByText('Importer une carte')).toBeInTheDocument();
    expect(screen.getByText('Choisir un fichier .dd2vtt')).toBeInTheDocument();
  });

  it('EN : aucune fuite FR', () => {
    useLocaleStore.setState({ locale: 'en' });
    renderRoute(
      '/map-proto/cloud/camp-1/import',
      '/map-proto/cloud/:cid/import',
      <MapImportScreen />,
    );
    expect(screen.getByText('Import a map')).toBeInTheDocument();
    expect(screen.getByText('Choose a .dd2vtt file')).toBeInTheDocument();
  });
});

describe('MapTvScreen — i18n', () => {
  it('FR : carte introuvable localisée', () => {
    renderRoute(
      '/map-proto/cloud/camp-1/maps/m-1/tv',
      '/map-proto/cloud/:cid/maps/:mid/tv',
      <MapTvScreen />,
    );
    expect(screen.getByText('Carte introuvable.')).toBeInTheDocument();
  });

  it('EN : aucune fuite FR', () => {
    useLocaleStore.setState({ locale: 'en' });
    renderRoute(
      '/map-proto/cloud/camp-1/maps/m-1/tv',
      '/map-proto/cloud/:cid/maps/:mid/tv',
      <MapTvScreen />,
    );
    expect(screen.getByText('Map not found.')).toBeInTheDocument();
  });
});
