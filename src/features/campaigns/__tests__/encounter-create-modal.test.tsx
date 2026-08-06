import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { t } from '@/shared/lib/i18n';
import type { CreateParticipantInput } from '@/shared/lib/services/encounters';

// ── Mocks des dépendances de données ──────────────────────────────────────
const createEncounter = vi.fn();
const bestiary: { data: unknown[] } = { data: [] };

vi.mock('@/shared/lib/services/encounters', () => ({
  createEncounter: (...args: unknown[]) => createEncounter(...args),
}));
vi.mock('@/shared/hooks/use-content', () => ({
  useContent: (type: string) =>
    type === 'monsters'
      ? { data: bestiary.data, loading: false, error: null , scopeOf: () => ({ scope: 'public' as const }) }
      : { data: [], loading: false, error: null , scopeOf: () => ({ scope: 'public' as const }) },
}));
// La compagnie liée et les PNJ enregistrés ne concernent pas l'autofill bestiaire.
vi.mock('../use-encounter-party-draft', () => ({
  useEncounterPartyDraft: () => ({ drafts: [], isLoading: false, hadReadError: false }),
}));
vi.mock('../use-npcs', () => ({
  useNpcs: () => ({ npcs: [], isLoading: false, error: null, refresh: vi.fn() }),
}));

import { EncounterCreateModal } from '../encounter-create-modal';

/** Fixture bestiaire — Gobelin SRD (PV moyens 7, slug « gobelin »). */
const GOBLIN = {
  id: 'gobelin',
  name: { fr: 'Gobelin', en: 'Goblin' },
  size: 'small',
  type: 'humanoïde',
  alignment: { fr: 'Neutre mauvais', en: '' },
  ac: 15,
  acDetail: null,
  hp: { avg: 7, formula: '2d6' },
  speed: { walk: 30 },
  abilities: { for: 8, dex: 14, con: 10, int: 10, sag: 8, cha: 8 },
  saves: {},
  skills: {},
  resistances: [],
  immunities: [],
  vulnerabilities: [],
  conditionImmunities: [],
  senses: { darkvision: 60, passivePerception: 9 },
  languages: [],
  cr: 0.25,
  xp: 50,
  traits: [],
  actions: [],
  reactions: null,
  legendaryActions: null,
  source: 'srd-5.2.1',
};

function renderModal(): { onCreated: ReturnType<typeof vi.fn> } {
  const onCreated = vi.fn();
  render(
    <EncounterCreateModal
      campaignId="c-1"
      open
      linkedMembers={[]}
      onClose={vi.fn()}
      onCreated={onCreated}
    />,
  );
  return { onCreated };
}

beforeEach(() => {
  createEncounter.mockReset().mockResolvedValue({ encounterId: 'e-new' });
  bestiary.data = [GOBLIN];
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('EncounterCreateModal — autofill bestiaire', () => {
  it('préremplit une ligne avec le nom + PV moyens du monstre choisi', async () => {
    renderModal();

    fireEvent.click(screen.getByText(`+ ${t('encounters.create.monsters.fromBestiary')}`));
    // La modale de sélection liste le Gobelin → on le choisit.
    fireEvent.click(await screen.findByTestId('monster-pick-gobelin'));

    // Nom prérempli (identité, pas présence) + PV moyens 7 du bloc de stats.
    expect(screen.getByDisplayValue('Gobelin')).toBeInTheDocument();
    expect(screen.getByDisplayValue('7')).toBeInTheDocument();
  });

  it('propage monsterContentId = slug sur le participant créé', async () => {
    renderModal();

    fireEvent.change(screen.getByPlaceholderText(t('encounters.create.nameField.placeholder')), {
      target: { value: 'Embuscade' },
    });
    fireEvent.click(screen.getByText(`+ ${t('encounters.create.monsters.fromBestiary')}`));
    fireEvent.click(await screen.findByTestId('monster-pick-gobelin'));

    fireEvent.click(screen.getByText(t('encounters.create.submit')));

    await waitFor(() => expect(createEncounter).toHaveBeenCalledTimes(1));
    const [, payload] = createEncounter.mock.calls[0] as [
      string,
      { participants: CreateParticipantInput[] },
    ];
    expect(payload.participants).toHaveLength(1);
    expect(payload.participants[0]).toMatchObject({
      type: 'monster',
      monsterContentId: 'gobelin',
      name: 'Gobelin',
      maxHp: 7,
    });
  });

  it('rompt le lien au bestiaire si le nom est édité à la main (contentId → null)', async () => {
    renderModal();

    fireEvent.change(screen.getByPlaceholderText(t('encounters.create.nameField.placeholder')), {
      target: { value: 'Embuscade' },
    });
    fireEvent.click(screen.getByText(`+ ${t('encounters.create.monsters.fromBestiary')}`));
    fireEvent.click(await screen.findByTestId('monster-pick-gobelin'));

    // Le MJ renomme la créature → le slug ne correspond plus, on le détache.
    fireEvent.change(screen.getByDisplayValue('Gobelin'), {
      target: { value: 'Chef gobelin' },
    });
    fireEvent.click(screen.getByText(t('encounters.create.submit')));

    await waitFor(() => expect(createEncounter).toHaveBeenCalledTimes(1));
    const [, payload] = createEncounter.mock.calls[0] as [
      string,
      { participants: CreateParticipantInput[] },
    ];
    expect(payload.participants[0]).toMatchObject({
      type: 'monster',
      monsterContentId: null,
      name: 'Chef gobelin',
    });
  });
});
