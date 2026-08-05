import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { MapMeta } from '@/shared/types/map';

/**
 * Tests pour MapsCloudScreen (CHANTIER D tracer D.3).
 *
 * On mocke :
 *   - `useAuth` (auth gating, uid pour les writes),
 *   - `useMapsList` (data driver),
 *   - les services `campaigns`/`maps` (createMap, deleteMap, ensureCampaignExists).
 * On vérifie : gating signed-out / cid manquant, création (call avec bons args),
 * suppression (call), validation slug, surfaçage erreurs.
 */

// ── Mocks ────────────────────────────────────────────────────────────────
const authState: {
  user: { uid: string } | null;
  isReady: boolean;
} = { user: { uid: 'user-alice' }, isReady: true };

vi.mock('@/features/auth/use-auth', () => ({
  useAuth: () => authState,
}));

const mapsListState: {
  maps: readonly MapMeta[];
  isLoading: boolean;
  error: Error | null;
} = { maps: [], isLoading: false, error: null };

vi.mock('@/features/map-proto/use-maps-list', () => ({
  useMapsList: () => mapsListState,
}));

const mockEnsureCampaignExists = vi.fn();
const mockGetCampaign = vi.fn();
vi.mock('@/shared/lib/services/campaigns', () => ({
  ensureCampaignExists: (...args: unknown[]) => mockEnsureCampaignExists(...args),
  getCampaign: (...args: unknown[]) => mockGetCampaign(...args),
}));

const mockCreateMap = vi.fn();
const mockDeleteMap = vi.fn();
vi.mock('@/shared/lib/services/maps', () => ({
  createMap: (...args: unknown[]) => mockCreateMap(...args),
  deleteMap: (...args: unknown[]) => mockDeleteMap(...args),
}));

// Firebase stub (cascade depuis useMapsList si jamais).
vi.mock('@/shared/lib/firebase', () => ({
  getDb: () => ({}),
}));

import { MapsCloudScreen } from '../maps-cloud-screen';

function renderAt(path: string): void {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/map-proto/cloud/:cid" element={<MapsCloudScreen />} />
        <Route path="/map-proto/cloud" element={<MapsCloudScreen />} />
      </Routes>
    </MemoryRouter>,
  );
}

function mkMap(id: string, name: string): MapMeta {
  return {
    id,
    name,
    imageUrl: null,
    gridSize: 70,
    feetPerSquare: 5,
    showGrid: true,
    fogEnabled: true,
    lightingEnabled: true,
    fogPolygons: [],
    lightSources: [],
    aoeTemplates: [],
    schemaVersion: 1,
    createdAt: null,
    updatedAt: null,
    updatedBy: 'user-alice',
  };
}

beforeEach(() => {
  authState.user = { uid: 'user-alice' };
  authState.isReady = true;
  mapsListState.maps = [];
  mapsListState.isLoading = false;
  mapsListState.error = null;
  mockEnsureCampaignExists.mockReset().mockResolvedValue(false);
  // Par défaut l'utilisateur est MENEUR de la campagne — la console d'édition
  // n'apparaît que pour lui depuis M34 (les joueurs y arrivent en lecture seule).
  mockGetCampaign.mockReset().mockResolvedValue({ gmIds: ['user-alice'] });
  mockCreateMap.mockReset().mockResolvedValue('m-1');
  mockDeleteMap.mockReset().mockResolvedValue(undefined);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('MapsCloudScreen', () => {
  it('shows signed-out gate when user is null', () => {
    authState.user = null;
    renderAt('/map-proto/cloud/camp-1');
    expect(screen.getByTestId('maps-cloud-signed-out')).toBeTruthy();
    // ensureCampaignExists ne doit PAS être appelé sans user.
    expect(mockEnsureCampaignExists).not.toHaveBeenCalled();
  });

  it('calls ensureCampaignExists with cid + uid on mount', async () => {
    renderAt('/map-proto/cloud/camp-1');
    await waitFor(() => {
      expect(mockEnsureCampaignExists).toHaveBeenCalledWith('camp-1', 'user-alice');
    });
  });

  it('renders empty state when no maps', async () => {
    renderAt('/map-proto/cloud/camp-1');
    expect(screen.getByTestId('maps-cloud-empty')).toBeTruthy();
    await waitFor(() => {
      expect(mockEnsureCampaignExists).toHaveBeenCalled();
    });
  });

  it('renders list when maps are present', async () => {
    mapsListState.maps = [mkMap('donjon-de-l-aube', "Donjon de l'Aube")];
    renderAt('/map-proto/cloud/camp-1');
    expect(screen.getByTestId('maps-cloud-card-donjon-de-l-aube')).toBeTruthy();
    expect(screen.getByText("Donjon de l'Aube")).toBeTruthy();
    await waitFor(() => {
      expect(mockEnsureCampaignExists).toHaveBeenCalled();
    });
  });

  it('renders cid in header', async () => {
    renderAt('/map-proto/cloud/camp-1');
    expect(screen.getByTestId('maps-cloud-cid').textContent).toContain('camp-1');
    await waitFor(() => {
      expect(mockEnsureCampaignExists).toHaveBeenCalled();
    });
  });

  it('creates a map with valid form input', async () => {
    renderAt('/map-proto/cloud/camp-1');
    await screen.findByTestId('maps-cloud-create-id');
    const idInput = screen.getByTestId('maps-cloud-create-id') as HTMLInputElement;
    const nameInput = screen.getByTestId('maps-cloud-create-name') as HTMLInputElement;
    fireEvent.change(idInput, { target: { value: 'foret-noire' } });
    fireEvent.change(nameInput, { target: { value: 'Forêt noire' } });
    fireEvent.submit(screen.getByTestId('maps-cloud-create-form'));
    await waitFor(() => {
      expect(mockCreateMap).toHaveBeenCalledTimes(1);
    });
    const [cidArg, mapIdArg, inputArg, uidArg] = mockCreateMap.mock.calls[0]!;
    expect(cidArg).toBe('camp-1');
    expect(mapIdArg).toBe('foret-noire');
    expect(uidArg).toBe('user-alice');
    expect(inputArg).toMatchObject({
      name: 'Forêt noire',
      gridSize: 70,
      feetPerSquare: 5,
      showGrid: true,
      fogEnabled: true,
      lightingEnabled: true,
      fogPolygons: [],
      lightSources: [],
      aoeTemplates: [],
      imageUrl: null,
    });
  });

  it('rejects invalid slug before calling createMap', async () => {
    renderAt('/map-proto/cloud/camp-1');
    await screen.findByTestId('maps-cloud-create-id');
    fireEvent.change(screen.getByTestId('maps-cloud-create-id'), {
      target: { value: 'Bad Slug!' },
    });
    fireEvent.change(screen.getByTestId('maps-cloud-create-name'), {
      target: { value: 'Nom' },
    });
    fireEvent.submit(screen.getByTestId('maps-cloud-create-form'));
    expect(screen.getByTestId('maps-cloud-form-error')).toBeTruthy();
    expect(mockCreateMap).not.toHaveBeenCalled();
  });

  it('rejects empty name', async () => {
    renderAt('/map-proto/cloud/camp-1');
    await screen.findByTestId('maps-cloud-create-id');
    fireEvent.change(screen.getByTestId('maps-cloud-create-id'), {
      target: { value: 'ok-slug' },
    });
    fireEvent.submit(screen.getByTestId('maps-cloud-create-form'));
    expect(screen.getByTestId('maps-cloud-form-error')).toBeTruthy();
    expect(mockCreateMap).not.toHaveBeenCalled();
  });

  it('surfaces createMap errors in formError', async () => {
    mockCreateMap.mockRejectedValueOnce(new Error('permission-denied'));
    renderAt('/map-proto/cloud/camp-1');
    await screen.findByTestId('maps-cloud-create-id');
    fireEvent.change(screen.getByTestId('maps-cloud-create-id'), {
      target: { value: 'ok-slug' },
    });
    fireEvent.change(screen.getByTestId('maps-cloud-create-name'), {
      target: { value: 'Nom' },
    });
    fireEvent.submit(screen.getByTestId('maps-cloud-create-form'));
    await waitFor(() => {
      expect(screen.getByTestId('maps-cloud-form-error').textContent).toContain(
        'permission-denied',
      );
    });
  });

  it('calls deleteMap when delete button is clicked', async () => {
    mapsListState.maps = [mkMap('donjon-de-l-aube', "Donjon de l'Aube")];
    renderAt('/map-proto/cloud/camp-1');
    fireEvent.click(
      await screen.findByTestId('maps-cloud-delete-donjon-de-l-aube'),
    );
    await waitFor(() => {
      expect(mockDeleteMap).toHaveBeenCalledWith('camp-1', 'donjon-de-l-aube');
    });
  });

  it('surfaces useMapsList transport error', async () => {
    mapsListState.error = new Error('rules-failed');
    renderAt('/map-proto/cloud/camp-1');
    expect(screen.getByTestId('maps-cloud-list-error').textContent).toContain('rules-failed');
    await waitFor(() => {
      expect(mockEnsureCampaignExists).toHaveBeenCalled();
    });
  });

  it('surfaces ensureCampaignExists error in header', async () => {
    mockEnsureCampaignExists.mockRejectedValueOnce(new Error('write-denied'));
    renderAt('/map-proto/cloud/camp-1');
    await waitFor(() => {
      expect(screen.getByTestId('maps-cloud-ensure-error').textContent).toContain('write-denied');
    });
  });

  it('n\u2019expose la console d\u2019\u00e9dition qu\u2019une fois la campagne r\u00e9solue', async () => {
    const resolver: { fn: ((v: boolean) => void) | null } = { fn: null };
    mockEnsureCampaignExists.mockImplementationOnce(
      () =>
        new Promise<boolean>((r) => {
          resolver.fn = r;
        }),
    );
    renderAt('/map-proto/cloud/camp-1');
    // Tant qu\u2019on ignore si l\u2019utilisateur est meneur, on ne propose aucun
    // geste d\u2019\u00e9criture \u2014 un bouton qui \u00e9choue est un mensonge d\u2019interface.
    expect(screen.queryByTestId('maps-cloud-create-submit')).toBeNull();
    resolver.fn?.(true);
    const submit = (await screen.findByTestId(
      'maps-cloud-create-submit',
    )) as HTMLButtonElement;
    expect(submit.disabled).toBe(false);
  });

  it('un JOUEUR ne voit ni cr\u00e9ation, ni import, ni suppression', async () => {
    mockGetCampaign.mockResolvedValue({ gmIds: ['user-gm'] });
    mapsListState.maps = [mkMap('donjon-de-l-aube', "Donjon de l'Aube")];
    renderAt('/map-proto/cloud/camp-1');
    await screen.findByTestId('maps-cloud-member-intro');
    expect(screen.queryByTestId('maps-cloud-create-form')).toBeNull();
    expect(screen.queryByTestId('maps-cloud-import-link')).toBeNull();
    expect(screen.queryByTestId('maps-cloud-delete-donjon-de-l-aube')).toBeNull();
  });

  it('la carte envoie le JOUEUR en vue pr\u00e9sentation, le MENEUR en \u00e9dition', async () => {
    mapsListState.maps = [mkMap('donjon-de-l-aube', "Donjon de l'Aube")];
    renderAt('/map-proto/cloud/camp-1');
    expect(
      (await screen.findByTestId('maps-cloud-open-donjon-de-l-aube')).getAttribute(
        'href',
      ),
    ).toBe('/map-proto/cloud/camp-1/maps/donjon-de-l-aube');

    mockGetCampaign.mockResolvedValue({ gmIds: ['user-gm'] });
    renderAt('/map-proto/cloud/camp-1');
    await waitFor(() => {
      const links = screen.getAllByTestId('maps-cloud-open-donjon-de-l-aube');
      expect(links[links.length - 1]!.getAttribute('href')).toBe(
        '/map-proto/cloud/camp-1/maps/donjon-de-l-aube/tv',
      );
    });
  });
});
