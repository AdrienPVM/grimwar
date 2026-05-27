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
vi.mock('@/shared/lib/services/campaigns', () => ({
  ensureCampaignExists: (...args: unknown[]) => mockEnsureCampaignExists(...args),
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
    await waitFor(() => {
      expect(mockEnsureCampaignExists).toHaveBeenCalled();
    });
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
    await waitFor(() => {
      expect(mockEnsureCampaignExists).toHaveBeenCalled();
    });
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
    await waitFor(() => {
      expect(mockEnsureCampaignExists).toHaveBeenCalled();
    });
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
    await waitFor(() => {
      expect(mockEnsureCampaignExists).toHaveBeenCalled();
    });
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
    fireEvent.click(screen.getByTestId('maps-cloud-delete-donjon-de-l-aube'));
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

  it('disables submit until ensureCampaignExists settles', async () => {
    const resolver: { fn: ((v: boolean) => void) | null } = { fn: null };
    mockEnsureCampaignExists.mockImplementationOnce(
      () =>
        new Promise<boolean>((r) => {
          resolver.fn = r;
        }),
    );
    renderAt('/map-proto/cloud/camp-1');
    const submit = screen.getByTestId('maps-cloud-create-submit') as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    resolver.fn?.(true);
    await waitFor(() => {
      expect(submit.disabled).toBe(false);
    });
  });
});
