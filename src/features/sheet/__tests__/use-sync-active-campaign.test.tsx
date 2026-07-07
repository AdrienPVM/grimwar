import { StrictMode } from 'react';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useActiveCampaignStore } from '@/shared/lib/slices/active-campaign-slice';

import { useSyncActiveCampaign } from '../use-sync-active-campaign';

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

  it('reste posée après un cycle StrictMode (double-invoke des effets)', () => {
    // StrictMode simule montage→démontage→remontage. La campagne doit se
    // stabiliser sur « posée » (le clear transitoire de démontage simulé ne
    // laisse pas d'état null au repos).
    renderHook(() => useSyncActiveCampaign('camp-1'), { wrapper: StrictMode });
    expect(readActive()).toBe('camp-1');
  });
});
