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

// Bestiaire vide pour le sélecteur de monstre → l'état vide rend ses chaînes.
vi.mock('@/shared/hooks/use-content', () => ({
  useContent: () => ({ data: [], loading: false }),
}));

import { MapImportScreen } from '../map-import-screen';
import { MapsCloudScreen } from '../maps-cloud-screen';
import { MapTvScreen } from '../map-tv-screen';
import { MonsterPickerModal } from '../monster-picker-modal';
import { TokenEditModal } from '../token-edit-modal';

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

describe('TokenEditModal — i18n', () => {
  const token = {
    id: 't1',
    kind: 'pnj' as const,
    label: 'Gobelin',
    position: { x: 0, y: 0 },
    color: '#f87171',
    updatedAt: null,
    updatedBy: 'u',
  };

  function renderModal(): void {
    // onUploadImage + onCarriedLightChange câblés → toutes les sections rendues.
    render(
      <TokenEditModal
        token={token}
        onSave={() => {}}
        onDelete={() => {}}
        onDuplicate={() => {}}
        onClose={() => {}}
        onUploadImage={() => {}}
        onRemoveImage={() => {}}
        onCarriedLightChange={() => {}}
      />,
    );
  }

  it('FR : sections + actions localisées', () => {
    renderModal();
    expect(screen.getByText('Modifier le jeton')).toBeInTheDocument();
    expect(screen.getByText('Couleur')).toBeInTheDocument();
    expect(screen.getByText('Portée de vision')).toBeInTheDocument();
    expect(screen.getByText('Lumière portée')).toBeInTheDocument();
    expect(screen.getByText('Enregistrer')).toBeInTheDocument();
  });

  it('EN : aucune fuite FR', () => {
    useLocaleStore.setState({ locale: 'en' });
    renderModal();
    expect(screen.getByText('Edit the token')).toBeInTheDocument();
    expect(screen.getByText('Color')).toBeInTheDocument();
    expect(screen.getByText('Vision range')).toBeInTheDocument();
    expect(screen.getByText('Carried light')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByText('Delete this token')).toBeInTheDocument();
  });
});

describe('MonsterPickerModal — i18n', () => {
  it('FR : titre + état vide localisés', () => {
    render(<MonsterPickerModal open onClose={() => {}} onPick={() => {}} />);
    expect(screen.getByText('Ajouter depuis le bestiaire')).toBeInTheDocument();
    expect(screen.getByText('Votre bestiaire est vide.')).toBeInTheDocument();
  });

  it('EN : aucune fuite FR', () => {
    useLocaleStore.setState({ locale: 'en' });
    render(<MonsterPickerModal open onClose={() => {}} onPick={() => {}} />);
    expect(screen.getByText('Add from the bestiary')).toBeInTheDocument();
    expect(screen.getByText('Your bestiary is empty.')).toBeInTheDocument();
  });
});
