import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Character } from '@/shared/types/character';

import { ConditionsRow } from '../conditions-row';

import conditionsBundle from '../../../../../../public/data/conditions.json';

/**
 * États (mode Combat) — Cat. 2 (identité du contenu : la modale affiche la
 * description SRD EXACTE de l'état tapé, pas juste « un texte ») + Cat. 5
 * (le bouton « Retirer cet état » écrit bien `conditions: []`). Bundle
 * conditions réel injecté.
 *
 * Régression D-condition-read : avant, taper un chip retirait l'état sans
 * jamais en montrer la règle. Désormais : tap = lecture, retrait dans la modale.
 */

const { updateCharacterMock } = vi.hoisted(() => ({
  updateCharacterMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/shared/hooks/use-content', () => ({
  useContent: (type: string) =>
    type === 'conditions'
      ? { data: conditionsBundle, isLoading: false, error: null }
      : { data: [], isLoading: false, error: null },
}));

vi.mock('@/features/sheet/use-update-character', () => ({
  useUpdateCharacter: () => ({
    updateCharacter: updateCharacterMock,
    isUpdating: false,
    error: null,
  }),
}));

beforeEach(() => {
  updateCharacterMock.mockClear();
});

// Vérité du contenu : on lit la description attendue DEPUIS le bundle, pas en dur.
const blinded = (conditionsBundle as Array<{ id: string; name: { fr: string }; description: { fr: string } }>).find(
  (c) => c.id === 'blinded',
)!;

function buildCharacter(conditions: string[]): Character {
  return {
    id: 'c1',
    name: 'Cond',
    status: 'alive',
    classes: [],
    totalLevel: 1,
    primaryClassId: 'fighter',
    ancestryId: 'human',
    ancestrySubChoices: {
      dragonAncestry: null,
      tieflingLegacy: null,
      elfLineage: null,
      gnomeLineage: null,
      goliathAncestry: null,
      ancestryCastingAbility: null,
      ancestryExtraSkill: null,
      ancestrySize: null,
    },
    backgroundId: 'soldier',
    extraLanguages: [],
    experience: 0,
    alignment: 'N',
    abilities: { for: 16, dex: 12, con: 14, int: 10, sag: 10, cha: 10 },
    saves: { for: true, dex: false, con: true, int: false, sag: false, cha: false },
    skills: {},
    hp: { current: 12, max: 12, temp: 0 },
    ac: 14,
    speed: 30,
    initiative: 1,
    hitDice: [],
    deathSaves: { success: 0, fail: 0 },
    conditions,
    inspiration: false,
    exhaustion: 0,
    currentConcentration: null,
    classResources: {},
    spellSlots: {},
    preparedSpells: {},
    knownSpells: {},
    spellcastingAbility: {},
    inventory: { items: [], coins: { cu: 0, ar: 0, el: 0, or: 0, pl: 0 }, weightCache: 0 },
    personality: { trait: '', ideal: '', bond: '', flaw: '', backstory: '' },
    featureUsage: {},
    extraProficiencies: { armor: [], weapons: [], tools: [], languages: [] },
    presentInCampaigns: [],
    homeCampaignId: null,
    stats: { totalRolls: 0, totalD20Sum: 0, crits: 0, fumbles: 0, skillUses: {} },
    portrait: { type: 'letter', value: 'C' },
    schemaVersion: 2,
    createdAt: null as never,
    updatedAt: null as never,
    updatedBy: 'uid',
  };
}

describe('ConditionsRow — lecture de la règle SRD + retrait depuis la modale', () => {
  it('le chip affiche le libellé FR officiel de l\'état actif', () => {
    render(<ConditionsRow character={buildCharacter(['blinded'])} readOnly={false} />);
    expect(screen.getByRole('button', { name: /Voir le détail de l’état Aveuglé/ })).toBeInTheDocument();
  });

  it('tap sur le chip ouvre la modale avec la description SRD EXACTE (identité, pas présence)', async () => {
    const user = userEvent.setup();
    render(<ConditionsRow character={buildCharacter(['blinded'])} readOnly={false} />);

    await user.click(screen.getByRole('button', { name: /Voir le détail de l’état Aveuglé/ }));

    const dialog = screen.getByRole('dialog');
    // Titre = name.fr exact, corps = description.fr exacte (depuis le bundle).
    expect(within(dialog).getByText(blinded.name.fr)).toBeInTheDocument();
    expect(within(dialog).getByText(blinded.description.fr)).toBeInTheDocument();
  });

  it('« Retirer cet état » écrit conditions: [] et ferme la modale', async () => {
    const user = userEvent.setup();
    render(<ConditionsRow character={buildCharacter(['blinded'])} readOnly={false} />);

    await user.click(screen.getByRole('button', { name: /Voir le détail de l’état Aveuglé/ }));
    await user.click(screen.getByRole('button', { name: /Retirer cet état/ }));

    expect(updateCharacterMock).toHaveBeenCalledWith({ conditions: [] });
  });

  it('en lecture seule : la règle reste lisible mais SANS bouton de retrait', async () => {
    const user = userEvent.setup();
    render(<ConditionsRow character={buildCharacter(['blinded'])} readOnly={true} />);

    await user.click(screen.getByRole('button', { name: /Voir le détail de l’état Aveuglé/ }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(blinded.description.fr)).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: /Retirer cet état/ })).not.toBeInTheDocument();
  });

  it('aucun état actif → message dédié', () => {
    render(<ConditionsRow character={buildCharacter([])} readOnly={false} />);
    expect(screen.getByText('Aucun état actif.')).toBeInTheDocument();
  });
});
