import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';

import { CampaignContentProvider } from '@/shared/lib/campaign-content-context';
import * as loaderModule from '@/shared/lib/content-loader';
import { useAuthStore } from '@/shared/lib/slices/auth-slice';
import type { Character } from '@/shared/types/character';

import { useInventoryDerived } from '../use-inventory-derived';

/**
 * JALON 2A.4 — résolution d'inventaire campaign-scope.
 *
 * Avant 2A.4, un item d'inventaire avec `contentScope: 'campaign'` se résolvait
 * toujours en `content: null` (cf. commentaire pré-existant du module). À partir
 * de 2A.4, si le composant est rendu sous un `CampaignContentProvider` portant
 * un `campaignId` non-null, le contenu est chargé via `loadCampaignContent` et
 * résolu — ce qui débloque les items custom MJ pour JALON 4.
 *
 * Garde-fous testés ici :
 *  1. Hors Provider → comportement inchangé (campaign item → `content: null`),
 *     `loadCampaignContent` n'est PAS appelé. Zéro régression.
 *  2. Avec Provider + items campaign en inventaire → `loadCampaignContent` est
 *     appelé avec le bon campaignId, l'item est résolu.
 *  3. Avec Provider mais ZÉRO item campaign dans l'inventaire → on ne paye
 *     pas le round-trip Firestore (`loadCampaignContent` n'est PAS appelé).
 *     Régression possible si on enlève la garde `hasCampaignItems`.
 */

vi.mock('@/shared/hooks/use-content', () => ({
  useContent: () => ({ data: [], loading: false, error: null }),
}));

function makeCharacter(inventoryItems: Character['inventory']['items']): Character {
  return {
    id: 'test-char',
    name: 'Test',
    status: 'alive',
    classes: [{ classId: 'fighter', subclassId: null, level: 1 }],
    totalLevel: 1,
    primaryClassId: 'fighter',
    ancestryId: 'human',
    ancestrySubChoices: {},
    backgroundId: 'soldier',
    extraLanguages: [],
    experience: 0,
    alignment: null,
    abilities: { for: 10, dex: 10, con: 10, int: 10, sag: 10, cha: 10 },
    saves: { for: false, dex: false, con: false, int: false, sag: false, cha: false },
    skills: {},
    hp: { current: 10, max: 10, temp: 0 },
    ac: 10,
    speed: 9,
    initiative: 0,
    hitDice: [{ classId: 'fighter', current: 1, max: 1, die: 'd10' }],
    deathSaves: { success: 0, fail: 0 },
    conditions: [],
    inspiration: false,
    exhaustion: 0,
    currentConcentration: null,
    classResources: {},
    spellSlots: {},
    preparedSpells: {},
    knownSpells: {},
    spellcastingAbility: {},
    inventory: {
      items: inventoryItems,
      coins: { cu: 0, ar: 0, el: 0, or: 0, pl: 0 },
      weightCache: 0,
    },
    personality: { traits: [], ideals: [], bonds: [], flaws: [] },
    featureUsage: {},
    extraProficiencies: { armor: [], weapons: [], tools: [], languages: [] },
    presentInCampaigns: [],
    homeCampaignId: null,
    stats: { totalRolls: 0, totalD20Sum: 0, crits: 0, fumbles: 0, skillUses: {} },
    portrait: { type: 'letter', value: 'T' },
    schemaVersion: 2,
  } as unknown as Character;
}

const customCampaignItem = {
  id: 'lame-du-bourgmestre',
  name: { fr: 'Lame du Bourgmestre' },
  category: 'weapon' as const,
  cost: null,
  weight: 1.5,
  description: { fr: 'Épée familiale du MJ.' },
  source: 'aidedd-homebrew' as const,
};

function wrapperWithCampaign(campaignId: string | null) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <CampaignContentProvider campaignId={campaignId}>
        {children}
      </CampaignContentProvider>
    );
  };
}

describe('useInventoryDerived — campaign scope (JALON 2A.4)', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, isAnonymous: false, isReady: false });
    vi.restoreAllMocks();
  });

  it('hors Provider : item campaign-scope reste content:null + loadCampaignContent NON appelé', async () => {
    const spy = vi
      .spyOn(loaderModule, 'loadCampaignContent')
      .mockResolvedValue([customCampaignItem as never]);

    const character = makeCharacter([
      {
        contentId: 'lame-du-bourgmestre',
        contentScope: 'campaign',
        contentSource: 'camp-xyz',
        qty: 1,
        equipped: false,
        attuned: false,
        notes: '',
      },
    ]);

    const { result } = renderHook(() => useInventoryDerived(character));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(spy).not.toHaveBeenCalled();
    expect(result.current.resolvedItems).toHaveLength(1);
    expect(result.current.resolvedItems[0]?.content).toBeNull();
  });

  it('sous Provider avec campaignId : item campaign-scope résolu via loadCampaignContent', async () => {
    const spy = vi
      .spyOn(loaderModule, 'loadCampaignContent')
      .mockResolvedValue([customCampaignItem as never]);

    const character = makeCharacter([
      {
        contentId: 'lame-du-bourgmestre',
        contentScope: 'campaign',
        contentSource: 'camp-xyz',
        qty: 1,
        equipped: false,
        attuned: false,
        notes: '',
      },
    ]);

    const { result } = renderHook(() => useInventoryDerived(character), {
      wrapper: wrapperWithCampaign('camp-xyz'),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.resolvedItems[0]?.content).not.toBeNull();
    });

    expect(spy).toHaveBeenCalledWith('items', 'camp-xyz');
    expect(result.current.resolvedItems[0]?.content?.id).toBe(
      'lame-du-bourgmestre',
    );
    expect(result.current.resolvedItems[0]?.isMagic).toBe(false);
  });

  it('sous Provider mais 0 item campaign en inventaire : loadCampaignContent NON appelé (garde hasCampaignItems)', async () => {
    const spy = vi
      .spyOn(loaderModule, 'loadCampaignContent')
      .mockResolvedValue([]);

    const character = makeCharacter([
      {
        contentId: 'epee-longue',
        contentScope: 'public',
        qty: 1,
        equipped: false,
        attuned: false,
        notes: '',
      },
    ]);

    const { result } = renderHook(() => useInventoryDerived(character), {
      wrapper: wrapperWithCampaign('camp-xyz'),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(spy).not.toHaveBeenCalled();
  });

  it('Provider sans campaignId (Provider monté hors campagne) : pas de fetch même avec items campaign', async () => {
    const spy = vi
      .spyOn(loaderModule, 'loadCampaignContent')
      .mockResolvedValue([customCampaignItem as never]);

    const character = makeCharacter([
      {
        contentId: 'lame-du-bourgmestre',
        contentScope: 'campaign',
        contentSource: 'camp-xyz',
        qty: 1,
        equipped: false,
        attuned: false,
        notes: '',
      },
    ]);

    const { result } = renderHook(() => useInventoryDerived(character), {
      wrapper: wrapperWithCampaign(null),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(spy).not.toHaveBeenCalled();
    expect(result.current.resolvedItems[0]?.content).toBeNull();
  });
});
