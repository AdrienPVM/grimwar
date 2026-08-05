import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { t } from '@/shared/lib/i18n';
import type { Npc } from '@/shared/types/npc';

const createNpc = vi.fn();
const updateNpc = vi.fn();
const logNpcIntroduced = vi.fn();
const showToast = vi.fn();

vi.mock('@/shared/lib/services/npcs', () => ({
  createNpc: (...args: unknown[]) => createNpc(...args),
  updateNpc: (...args: unknown[]) => updateNpc(...args),
}));
vi.mock('@/shared/lib/event-logger', () => ({
  logNpcIntroduced: (...args: unknown[]) => logNpcIntroduced(...args),
}));
vi.mock('@/shared/lib/slices/toast-slice', () => ({
  showToast: (...args: unknown[]) => showToast(...args),
}));

import { NpcEditModal } from '../npc-edit-modal';

function existingNpc(overrides: Partial<Npc> = {}): Npc {
  return {
    id: 'npc-1',
    name: 'Aldric',
    role: 'merchant',
    location: 'Valombre',
    shortDescription: 'Marchand bourru.',
    publicDescription: 'Échoppe.',
    dmNotes: 'Informateur.',
    portrait: { type: 'letter', value: 'A' },
    combatStats: null,
    relationships: [{ characterId: 'pj-1', attitude: 'friendly' }],
    tags: ['recurring'],
    visibility: 'all',
    createdBy: 'dm-1',
    createdAt: { seconds: 1 },
    updatedAt: { seconds: 1 },
    ...overrides,
  };
}

function renderModal(npc: Npc | null): void {
  render(
    <NpcEditModal
      open
      campaignId="c-1"
      createdByUid="dm-1"
      npc={npc}
      onClose={vi.fn()}
      onSaved={vi.fn()}
    />,
  );
}

beforeEach(() => {
  createNpc.mockReset().mockResolvedValue('npc-new');
  updateNpc.mockReset().mockResolvedValue(undefined);
  logNpcIntroduced.mockReset().mockResolvedValue(undefined);
  showToast.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('NpcEditModal — création', () => {
  it('bloque la création sans nom', async () => {
    renderModal(null);
    fireEvent.click(screen.getByRole('button', { name: t('npcs.edit.save') }));
    expect(await screen.findByText(t('npcs.edit.error.name'))).toBeInTheDocument();
    expect(createNpc).not.toHaveBeenCalled();
  });

  it('crée un PNJ non-combattant (combatStats null) et journalise l’introduction', async () => {
    renderModal(null);
    fireEvent.change(screen.getByPlaceholderText(t('npcs.edit.field.namePlaceholder')), {
      target: { value: 'Belric' },
    });
    fireEvent.click(screen.getByRole('button', { name: t('npcs.edit.save') }));

    await waitFor(() => expect(createNpc).toHaveBeenCalledTimes(1));
    const [cid, uid, input] = createNpc.mock.calls[0] as [string, string, Record<string, unknown>];
    expect(cid).toBe('c-1');
    expect(uid).toBe('dm-1');
    expect(input).toMatchObject({
      name: 'Belric',
      visibility: 'all',
      combatStats: null,
      relationships: [],
    });
    await waitFor(() =>
      expect(logNpcIntroduced).toHaveBeenCalledWith('npc-new', 'Belric', 'all'),
    );
  });

  it('crée un PNJ combattant avec PV/CA saisis', async () => {
    renderModal(null);
    fireEvent.change(screen.getByPlaceholderText(t('npcs.edit.field.namePlaceholder')), {
      target: { value: 'Gobelin chef' },
    });
    // Active le bloc combat.
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.change(screen.getByLabelText(t('npcs.edit.combat.hp')), {
      target: { value: '22' },
    });
    fireEvent.change(screen.getByLabelText(t('npcs.edit.combat.ac')), {
      target: { value: '15' },
    });
    fireEvent.click(screen.getByRole('button', { name: t('npcs.edit.save') }));

    await waitFor(() => expect(createNpc).toHaveBeenCalledTimes(1));
    const [, , input] = createNpc.mock.calls[0] as [string, string, Record<string, unknown>];
    expect(input.combatStats).toMatchObject({ hp: 22, ac: 15 });
  });

  it('crée un PNJ secret (visibility dm) → event mirror dm', async () => {
    renderModal(null);
    fireEvent.change(screen.getByPlaceholderText(t('npcs.edit.field.namePlaceholder')), {
      target: { value: 'Le Masque' },
    });
    fireEvent.click(screen.getByRole('button', { name: t('npcs.visibility.dm') }));
    fireEvent.click(screen.getByRole('button', { name: t('npcs.edit.save') }));

    await waitFor(() =>
      expect(logNpcIntroduced).toHaveBeenCalledWith('npc-new', 'Le Masque', 'dm'),
    );
  });
});

describe('NpcEditModal — édition', () => {
  it('met à jour sans journaliser d’introduction et PRÉSERVE les relations', async () => {
    renderModal(existingNpc());
    fireEvent.change(screen.getByDisplayValue('Aldric'), { target: { value: 'Aldric II' } });
    fireEvent.click(screen.getByRole('button', { name: t('npcs.edit.save') }));

    await waitFor(() => expect(updateNpc).toHaveBeenCalledTimes(1));
    const [cid, npcId, input] = updateNpc.mock.calls[0] as [
      string,
      string,
      Record<string, unknown>,
    ];
    expect(cid).toBe('c-1');
    expect(npcId).toBe('npc-1');
    expect(input).toMatchObject({
      name: 'Aldric II',
      relationships: [{ characterId: 'pj-1', attitude: 'friendly' }],
    });
    expect(logNpcIntroduced).not.toHaveBeenCalled();
  });
});

describe('NpcEditModal — portrait photo (M39)', () => {
  it('un PNJ sans photo reste au médaillon à la lettre', async () => {
    renderModal(null);
    fireEvent.change(screen.getByPlaceholderText(t('npcs.edit.field.namePlaceholder')), {
      target: { value: 'Belric' },
    });
    fireEvent.change(
      screen.getByPlaceholderText(t('npcs.edit.field.portraitPlaceholder')),
      { target: { value: 'B' } },
    );
    fireEvent.click(screen.getByRole('button', { name: t('npcs.edit.save') }));
    await waitFor(() => expect(createNpc).toHaveBeenCalledTimes(1));
    const [, , input] = createNpc.mock.calls[0] as [string, string, Record<string, unknown>];
    expect(input.portrait).toEqual({ type: 'letter', value: 'B' });
  });

  it('une photo déjà posée revient telle quelle à la réouverture, et se retire', async () => {
    const dataUrl = 'data:image/webp;base64,AAAA';
    renderModal(existingNpc({ portrait: { type: 'image', value: dataUrl } }));
    expect(
      (screen.getByTestId('npc-portrait-preview') as HTMLImageElement).src,
    ).toBe(dataUrl);
    // Le champ glyphe est neutralisé tant qu'une photo existe — deux portraits
    // concurrents seraient un piège.
    expect(
      (
        screen.getByPlaceholderText(
          t('npcs.edit.field.portraitPlaceholder'),
        ) as HTMLInputElement
      ).disabled,
    ).toBe(true);

    fireEvent.click(screen.getByTestId('npc-portrait-remove'));
    fireEvent.click(screen.getByRole('button', { name: t('npcs.edit.save') }));
    await waitFor(() => expect(updateNpc).toHaveBeenCalledTimes(1));
    const [, , input] = updateNpc.mock.calls[0] as [string, string, Record<string, unknown>];
    expect(input.portrait).toEqual({ type: 'letter', value: '' });
  });
});

describe('NpcEditModal — lien bestiaire (M40)', () => {
  it('éditer un PNJ lié à un monstre NE PERD PAS le lien', async () => {
    // Régression : `handleSave` reconstruisait `combatStats` depuis les seuls
    // CR/CA/PV/notes. Renommer un PNJ le déliait donc silencieusement de son
    // monstre — alors que `relationships`, lui, était bien préservé.
    renderModal(
      existingNpc({
        combatStats: { monsterContentId: 'bugbear', cr: 1, ac: 16, hp: 27 },
      }),
    );
    fireEvent.change(screen.getByDisplayValue('Aldric'), {
      target: { value: 'Aldric le Sombre' },
    });
    fireEvent.click(screen.getByRole('button', { name: t('npcs.edit.save') }));

    await waitFor(() => expect(updateNpc).toHaveBeenCalledTimes(1));
    const [, , input] = updateNpc.mock.calls[0] as [string, string, Record<string, unknown>];
    expect(input.combatStats).toMatchObject({
      monsterContentId: 'bugbear',
      cr: 1,
      ac: 16,
      hp: 27,
    });
  });

  it('« Délier » retire le lien sans effacer les chiffres déjà joués', async () => {
    renderModal(
      existingNpc({
        combatStats: { monsterContentId: 'bugbear', cr: 1, ac: 16, hp: 27 },
      }),
    );
    fireEvent.click(screen.getByTestId('npc-unlink-monster'));
    fireEvent.click(screen.getByRole('button', { name: t('npcs.edit.save') }));

    await waitFor(() => expect(updateNpc).toHaveBeenCalledTimes(1));
    const [, , input] = updateNpc.mock.calls[0] as [string, string, Record<string, unknown>];
    expect(input.combatStats).toMatchObject({ cr: 1, ac: 16, hp: 27 });
    expect(
      (input.combatStats as Record<string, unknown>).monsterContentId,
    ).toBeUndefined();
  });
});
