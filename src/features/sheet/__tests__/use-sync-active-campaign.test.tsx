import { StrictMode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useActiveCampaignStore } from '@/shared/lib/slices/active-campaign-slice';
import type { Campaign, CampaignSettings } from '@/shared/types/campaign';

import { useSyncActiveCampaign } from '../use-sync-active-campaign';

const getCampaignMock = vi.hoisted(() => vi.fn());
vi.mock('@/shared/lib/services/campaigns', () => ({
  getCampaign: getCampaignMock,
}));

function settingsOf(overrides: Partial<CampaignSettings> = {}): CampaignSettings {
  return {
    language: 'fr',
    diceMode: 'digital',
    variants: {
      featAtLevel1: false,
      flanking: false,
      slowHealing: false,
      grittyRealism: false,
    },
    ...overrides,
  };
}

function campaignOf(id: string, settings: CampaignSettings): Campaign {
  return { id, settings } as Campaign;
}

/**
 * Garde-fou `plans/DEBT.md > D27` — la campagne active ne doit JAMAIS retomber
 * transitoirement à `null` pendant que la fiche du propriétaire reste montée
 * (re-sync de migration v1→v2, double-invoke StrictMode). Sinon une action de
 * jeu tombant dans cette fenêtre verrait `activeCampaignId === null` et
 * `writeEvent` no-op silencieusement → event perdu.
 */
describe('useSyncActiveCampaign', () => {
  beforeEach(() => {
    useActiveCampaignStore.getState().clearActiveCampaign();
    getCampaignMock.mockReset();
    getCampaignMock.mockResolvedValue(campaignOf('camp-1', settingsOf()));
  });

  const readActive = (): string | null =>
    useActiveCampaignStore.getState().activeCampaignId;

  it('pose la campagne active quand un id est fourni', () => {
    renderHook(() => useSyncActiveCampaign('camp-1'));
    expect(readActive()).toBe('camp-1');
  });

  it('efface la campagne active quand `null` (fiche chargée, non liée)', () => {
    useActiveCampaignStore.getState().setActiveCampaign('camp-1');
    renderHook(() => useSyncActiveCampaign(null));
    expect(readActive()).toBeNull();
  });

  it('NE TOUCHE PAS le store quand `undefined` (fiche pas encore chargée)', () => {
    useActiveCampaignStore.getState().setActiveCampaign('camp-1');
    renderHook(() => useSyncActiveCampaign(undefined));
    // undefined = état inconnu → on préserve la dernière campagne active.
    expect(readActive()).toBe('camp-1');
  });

  it("D27 — préserve la campagne active pendant une fenêtre de re-sync transitoire (id → undefined → id)", () => {
    const { rerender } = renderHook(
      ({ home }: { home: string | null | undefined }) =>
        useSyncActiveCampaign(home),
      { initialProps: { home: 'camp-1' as string | null | undefined } },
    );
    expect(readActive()).toBe('camp-1');

    // Cascade de migration : `useCharacter` réécrit le doc, la fiche re-render et
    // `character` est momentanément indéfini côté écran → `undefined` remonte ici.
    rerender({ home: undefined });
    // Cœur de D27 : la campagne NE DOIT PAS avoir été effacée dans cette fenêtre.
    expect(readActive()).toBe('camp-1');

    // La fiche v2 arrive, même campagne d'attache → toujours active.
    rerender({ home: 'camp-1' });
    expect(readActive()).toBe('camp-1');
  });

  it('efface la campagne active quand la fiche est délié en cours de montage (id → null)', () => {
    const { rerender } = renderHook(
      ({ home }: { home: string | null | undefined }) =>
        useSyncActiveCampaign(home),
      { initialProps: { home: 'camp-1' as string | null | undefined } },
    );
    expect(readActive()).toBe('camp-1');
    // Délien réel (homeCampaignId passe à null sur une fiche CHARGÉE) → clear.
    rerender({ home: null });
    expect(readActive()).toBeNull();
  });

  it('efface la campagne active au démontage réel de l’écran', () => {
    const { unmount } = renderHook(() => useSyncActiveCampaign('camp-1'));
    expect(readActive()).toBe('camp-1');
    unmount();
    expect(readActive()).toBeNull();
  });

  // ── M1 : les réglages de la table atteignent la mécanique ────────────────
  const readSettings = (): CampaignSettings | null =>
    useActiveCampaignStore.getState().activeCampaignSettings;

  it('charge les réglages de la campagne d’attache', async () => {
    getCampaignMock.mockResolvedValue(
      campaignOf('camp-1', settingsOf({ diceMode: 'physical' })),
    );
    renderHook(() => useSyncActiveCampaign('camp-1'));
    await waitFor(() => expect(readSettings()?.diceMode).toBe('physical'));
  });

  it('transporte les variantes 5e telles quelles', async () => {
    getCampaignMock.mockResolvedValue(
      campaignOf(
        'camp-1',
        settingsOf({
          variants: {
            featAtLevel1: false,
            flanking: false,
            slowHealing: true,
            grittyRealism: true,
          },
        }),
      ),
    );
    renderHook(() => useSyncActiveCampaign('camp-1'));
    await waitFor(() => expect(readSettings()?.variants.slowHealing).toBe(true));
    expect(readSettings()?.variants.grittyRealism).toBe(true);
  });

  it('ne charge rien pour une fiche sans campagne d’attache', () => {
    renderHook(() => useSyncActiveCampaign(null));
    expect(getCampaignMock).not.toHaveBeenCalled();
    expect(readSettings()).toBeNull();
  });

  it('laisse les réglages à null quand la campagne est illisible (règles standard)', async () => {
    getCampaignMock.mockRejectedValue(new Error('permission-denied'));
    renderHook(() => useSyncActiveCampaign('camp-1'));
    await waitFor(() => expect(getCampaignMock).toHaveBeenCalled());
    // Une campagne illisible NE DOIT PAS bloquer la fiche : on joue en RAW.
    expect(readSettings()).toBeNull();
    expect(readActive()).toBe('camp-1');
  });

  it('n’applique JAMAIS les réglages d’une table à une autre (pointeur changé pendant le fetch)', async () => {
    // Scénario réel : la fiche démarre son fetch pour camp-1, puis un AUTRE
    // écran (rencontre, session) repointe le store sur camp-2 sans que ce hook
    // ne se remonte — le `cancelled` du cleanup ne se déclenche donc pas, et
    // seule la comparaison d'id empêche camp-1 d'écraser les réglages de camp-2.
    let resolveSlow: ((c: Campaign) => void) | undefined;
    getCampaignMock.mockImplementation(
      () =>
        new Promise<Campaign>((resolve) => {
          resolveSlow = resolve;
        }),
    );

    renderHook(() => useSyncActiveCampaign('camp-1'));
    await waitFor(() => expect(resolveSlow).toBeTypeOf('function'));

    const store = useActiveCampaignStore.getState();
    store.setActiveCampaign('camp-2');
    store.setActiveCampaignSettings(settingsOf({ diceMode: 'digital' }));

    // camp-1 répond enfin, en mode physique : la réponse doit être ignorée.
    resolveSlow?.(campaignOf('camp-1', settingsOf({ diceMode: 'physical' })));
    await new Promise((r) => setTimeout(r, 0));
    expect(readSettings()?.diceMode).toBe('digital');
  });

  it('remet les réglages à null au changement de campagne', () => {
    const store = useActiveCampaignStore.getState();
    store.setActiveCampaign('camp-1');
    store.setActiveCampaignSettings(settingsOf({ diceMode: 'physical' }));
    store.setActiveCampaign('camp-2');
    expect(readSettings()).toBeNull();
  });

  it('reste posée après un cycle StrictMode (double-invoke des effets)', () => {
    // StrictMode simule montage→démontage→remontage. La campagne doit se
    // stabiliser sur « posée » (le clear transitoire de démontage simulé ne
    // laisse pas d'état null au repos).
    renderHook(() => useSyncActiveCampaign('camp-1'), { wrapper: StrictMode });
    expect(readActive()).toBe('camp-1');
  });
});
