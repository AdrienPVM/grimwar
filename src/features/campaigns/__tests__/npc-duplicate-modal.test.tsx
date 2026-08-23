import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { t } from '@/shared/lib/i18n';
import type { Campaign } from '@/shared/types/campaign';
import type { Npc } from '@/shared/types/npc';

const createNpc = vi.fn();
const showToast = vi.fn();

vi.mock('@/shared/lib/services/npcs', () => ({
  createNpc: (...args: unknown[]) => createNpc(...args),
}));
vi.mock('@/shared/lib/slices/toast-slice', () => ({
  showToast: (...args: unknown[]) => showToast(...args),
}));

import { NpcDuplicateModal } from '../npc-duplicate-modal';

function mkNpc(overrides: Partial<Npc> = {}): Npc {
  return {
    id: 'npc-1',
    name: 'Elminster',
    role: 'ally',
    location: 'Valombre',
    shortDescription: 'Un vieux mage.',
    publicDescription: 'Public.',
    dmNotes: 'Secret.',
    portrait: { type: 'letter', value: 'E' },
    combatStats: { monsterContentId: 'archmage', ac: 12, hp: 99 },
    relationships: [{ characterId: 'pj-1', attitude: 'friendly' }],
    tags: ['recurring'],
    visibility: 'all',
    createdBy: 'dm-1',
    createdAt: { seconds: 1 },
    updatedAt: { seconds: 1 },
    ...overrides,
  };
}

function mkCampaign(id: string, name: string): Campaign {
  return {
    id,
    name,
    description: '',
    gmIds: ['dm-1'],
    createdBy: 'dm-1',
    inviteCode: 'ABC234',
    settings: {
      language: 'fr',
      diceMode: 'digital',
      variants: {
        featAtLevel1: false,
        flanking: false,
        slowHealing: false,
        grittyRealism: false,
      },
    },
    status: 'active',
    schemaVersion: 1,
    createdAt: null,
    updatedAt: null,
  };
}

beforeEach(() => {
  createNpc.mockReset().mockResolvedValue('npc-copy');
  showToast.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('NpcDuplicateModal', () => {
  it('sans autre campagne menée, rien à choisir et rien à confirmer', () => {
    render(
      <NpcDuplicateModal
        open
        npc={mkNpc()}
        targets={[]}
        createdByUid="dm-1"
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByTestId('npc-duplicate-empty')).toBeInTheDocument();
    expect(
      (
        screen.getByRole('button', {
          name: t('npcs.duplicate.confirm'),
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });

  it('recopie le PNJ dans la campagne choisie SANS ses relations, et en secret', async () => {
    const onClose = vi.fn();
    render(
      <NpcDuplicateModal
        open
        npc={mkNpc()}
        targets={[mkCampaign('c-2', 'Les Mers du Sud')]}
        createdByUid="dm-1"
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByTestId('npc-duplicate-target-c-2'));
    fireEvent.click(screen.getByRole('button', { name: t('npcs.duplicate.confirm') }));

    await waitFor(() => expect(createNpc).toHaveBeenCalledTimes(1));
    const [cid, uid, input] = createNpc.mock.calls[0] as [
      string,
      string,
      Record<string, unknown>,
    ];
    expect(cid).toBe('c-2');
    expect(uid).toBe('dm-1');
    expect(input).toMatchObject({
      name: 'Elminster',
      role: 'ally',
      tags: ['recurring'],
      // Le bloc de combat suit — il ne dépend d'aucune donnée de la campagne
      // d'origine, contrairement aux relations.
      combatStats: { monsterContentId: 'archmage', ac: 12, hp: 99 },
      // Les relations pointent des personnages qui n'existent pas là-bas.
      relationships: [],
      // Un PNJ public ici peut être une révélation ailleurs.
      visibility: 'dm',
    });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('les campagnes sont proposées dans l’ordre alphabétique français', () => {
    render(
      <NpcDuplicateModal
        open
        npc={mkNpc()}
        targets={[
          mkCampaign('c-3', 'Zanzibar'),
          mkCampaign('c-2', 'Élancourt'),
          mkCampaign('c-4', 'Amberlac'),
        ]}
        createdByUid="dm-1"
        onClose={vi.fn()}
      />,
    );
    const labels = screen
      .getAllByRole('radio')
      .map((el) => el.textContent);
    expect(labels).toEqual(['Amberlac', 'Élancourt', 'Zanzibar']);
  });

  it('une écriture refusée reste à l’écran avec son message', async () => {
    createNpc.mockRejectedValueOnce(new Error('permission-denied'));
    const onClose = vi.fn();
    render(
      <NpcDuplicateModal
        open
        npc={mkNpc()}
        targets={[mkCampaign('c-2', 'Les Mers du Sud')]}
        createdByUid="dm-1"
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByTestId('npc-duplicate-target-c-2'));
    fireEvent.click(screen.getByRole('button', { name: t('npcs.duplicate.confirm') }));
    expect(await screen.findByText(t('npcs.duplicate.error'))).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});
