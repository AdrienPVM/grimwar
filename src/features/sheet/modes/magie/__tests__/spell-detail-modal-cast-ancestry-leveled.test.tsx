import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Character } from '@/shared/types/character';
import type { Spell } from '@/shared/types/content';

import { SpellDetailModal } from '../spell-detail-modal';
import type { AncestrySpellUsageSpec } from '../ancestry-spell-usage';

import spellsBundle from '../../../../../../public/data/spells.json';

/**
 * D12b — lancement des sorts d'ascendance à recharge limitée (Tieffelin /
 * Elfe L3-L5). AVANT ce câblage le bouton « Lancer » était désactivé en dur
 * pour tout sort d'ascendance de niveau ≥ 1 (hint « pas encore implémenté »).
 * Ce test prouve le passage rouge → vert :
 *
 *  1. bouton actif sur un sort L3 débloqué + quota disponible ;
 *  2. cast → `featureUsage` décrémenté (PAS d'emplacement de classe consommé) ;
 *  3. quota épuisé → bouton désactivé + hint « plus d'usage » ;
 *  4. verrou RAW : sort L3 désactivé tant que le perso n'a pas le niveau requis ;
 *  5. cantrip d'ascendance (usage null) → toujours lançable, aucune écriture
 *     `featureUsage`.
 */

interface SpellBundleEntry extends Omit<Spell, 'summonedCreatureIds'> {
  summonedCreatureIds?: string[];
}

function spellFromBundle(id: string): Spell {
  const found = (spellsBundle as SpellBundleEntry[]).find((s) => s.id === id);
  if (!found) throw new Error(`[cast-ancestry-test] sort ${id} absent du bundle`);
  return found as Spell;
}

const { updateCharacterMock } = vi.hoisted(() => ({
  updateCharacterMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/shared/hooks/use-content', () => ({
  // Pas de statblock invoqué dans ces sorts → bundle vide.
  useContent: () => ({ data: [], isLoading: false, error: null }),
}));
vi.mock('@/features/dice/use-dice', () => ({
  useDice: () => ({ rollDamageWithMode: vi.fn().mockResolvedValue(null) }),
}));
vi.mock('@/features/sheet/use-update-character', () => ({
  useUpdateCharacter: () => ({
    updateCharacter: updateCharacterMock,
    isUpdating: false,
    error: null,
  }),
}));
// Le logger touche Firebase au runtime → no-op en test.
vi.mock('@/shared/lib/event-logger', () => ({
  logSpellCast: vi.fn(),
}));

beforeEach(() => {
  updateCharacterMock.mockClear();
});

const INFERNAL_USAGE: AncestrySpellUsageSpec = {
  key: 'ancestry-spell:represailles-infernales',
  cadence: 'long-rest',
  max: 1,
  restoresOn: 'long',
};

/** Tieffelin Infernal NON-caster (ancestryOnly) au niveau `totalLevel`. */
function tieflingNonCaster(
  totalLevel: number,
  featureUsage: Character['featureUsage'] = {},
): Character {
  return {
    id: 'test',
    name: 'Test Tieffelin',
    status: 'alive',
    classes: [],
    totalLevel,
    primaryClassId: 'rogue',
    ancestryId: 'tiefling',
    ancestrySubChoices: {
      dragonAncestry: null,
      tieflingLegacy: 'infernal',
      elfLineage: null,
      gnomeLineage: null,
      goliathAncestry: null,
      ancestryCastingAbility: 'cha',
      ancestryExtraSkill: null,
      ancestrySize: 'medium',
    },
    backgroundId: 'criminal',
    extraLanguages: [],
    experience: 0,
    alignment: 'N',
    abilities: { for: 10, dex: 16, con: 12, int: 10, sag: 12, cha: 14 },
    saves: { for: false, dex: true, con: false, int: true, sag: false, cha: false },
    skills: {},
    hp: { current: 20, max: 20, temp: 0 },
    ac: 14,
    speed: 30,
    initiative: 3,
    hitDice: [{ classId: 'rogue', current: totalLevel, max: totalLevel, die: 'd8' }],
    deathSaves: { success: 0, fail: 0 },
    conditions: [],
    inspiration: false,
    exhaustion: 0,
    currentConcentration: null,
    classResources: {},
    // Non-caster → aucun emplacement de classe.
    spellSlots: {},
    preparedSpells: {},
    knownSpells: { ancestry: ['trait-de-feu', 'represailles-infernales', 'tenebres'] },
    spellcastingAbility: {},
    inventory: { items: [], coins: { cu: 0, ar: 0, el: 0, or: 0, pl: 0 }, weightCache: 0 },
    personality: { trait: '', ideal: '', bond: '', flaw: '', backstory: '' },
    featureUsage,
    extraProficiencies: { armor: [], weapons: [], tools: [], languages: [] },
    presentInCampaigns: [],
    homeCampaignId: null,
    stats: { totalRolls: 0, totalD20Sum: 0, crits: 0, fumbles: 0, skillUses: {} },
    portrait: { type: 'letter', value: 'T' },
    schemaVersion: 2,
    createdAt: null as never,
    updatedAt: null as never,
    updatedBy: 'test-uid',
  };
}

function renderModal(
  character: Character,
  spellId: string,
  source: { label: string; usage: AncestrySpellUsageSpec | null; unlockedAt: number },
) {
  return render(
    <SpellDetailModal
      character={character}
      spell={spellFromBundle(spellId)}
      spellcastingClasses={[]}
      ancestrySource={source}
      pactTomeSource={null}
      readOnly={false}
      onClose={() => undefined}
    />,
  );
}

describe('SpellDetailModal — cast sort d\'ascendance L3 (D12b)', () => {
  it('L3 débloqué + quota plein → bouton « Lancer » actif (rouge → vert)', () => {
    renderModal(tieflingNonCaster(5), 'represailles-infernales', {
      label: 'Héritage Infernal',
      usage: INFERNAL_USAGE,
      unlockedAt: 3,
    });
    const dialog = screen.getByRole('dialog');
    const launchBtn = within(dialog).getByRole('button', { name: /Lancer/ });
    expect(launchBtn).toBeEnabled();
    // L'indicateur de quota remplace le sélecteur d'emplacement.
    expect(within(dialog).getByText(/1 \/ 1 ·/)).toBeInTheDocument();
    expect(within(dialog).queryByText('Emplacement')).not.toBeInTheDocument();
  });

  it('cast → décrémente featureUsage à 0, sans toucher aux emplacements', async () => {
    renderModal(tieflingNonCaster(5), 'represailles-infernales', {
      label: 'Héritage Infernal',
      usage: INFERNAL_USAGE,
      unlockedAt: 3,
    });
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /Lancer/ }));

    await waitFor(() => expect(updateCharacterMock).toHaveBeenCalledTimes(1));
    const [patch, opts] = updateCharacterMock.mock.calls[0]!;
    expect(patch).toEqual({
      featureUsage: {
        'ancestry-spell:represailles-infernales': { current: 0, max: 1, restoresOn: 'long' },
      },
    });
    // Pas d'emplacement consommé (sort d'ascendance hors slots de classe).
    expect(patch.spellSlots).toBeUndefined();
    expect(opts).toEqual({ log: 'manual' });
  });

  it('quota épuisé (current 0) → bouton désactivé + hint « plus d\'usage »', () => {
    renderModal(
      tieflingNonCaster(5, {
        'ancestry-spell:represailles-infernales': { current: 0, max: 1, restoresOn: 'long' },
      }),
      'represailles-infernales',
      { label: 'Héritage Infernal', usage: INFERNAL_USAGE, unlockedAt: 3 },
    );
    const dialog = screen.getByRole('dialog');
    const launchBtn = within(dialog).getByRole('button', { name: /Lancer/ });
    expect(launchBtn).toBeDisabled();
    expect(launchBtn).toHaveAttribute('title', 'Plus aucun usage avant un repos long.');
    // Cliquer ne déclenche aucune écriture.
    fireEvent.click(launchBtn);
    expect(updateCharacterMock).not.toHaveBeenCalled();
  });

  it('verrou RAW : sort L3 désactivé tant que le perso n\'a pas atteint le niveau requis', () => {
    renderModal(tieflingNonCaster(1), 'represailles-infernales', {
      label: 'Héritage Infernal',
      usage: INFERNAL_USAGE,
      unlockedAt: 3,
    });
    const dialog = screen.getByRole('dialog');
    const launchBtn = within(dialog).getByRole('button', { name: /Lancer/ });
    expect(launchBtn).toBeDisabled();
    expect(launchBtn).toHaveAttribute('title', 'Disponible au niveau 3');
  });

  it('cantrip d\'ascendance (usage null) → lançable, aucune écriture featureUsage', async () => {
    const onClose = vi.fn();
    render(
      <SpellDetailModal
        character={tieflingNonCaster(1)}
        spell={spellFromBundle('trait-de-feu')}
        spellcastingClasses={[]}
        ancestrySource={{ label: 'Héritage Infernal', usage: null, unlockedAt: 1 }}
        pactTomeSource={null}
        readOnly={false}
        onClose={onClose}
      />,
    );
    const dialog = screen.getByRole('dialog');
    const launchBtn = within(dialog).getByRole('button', { name: /Lancer/ });
    expect(launchBtn).toBeEnabled();
    expect(launchBtn).not.toHaveAttribute('title');
    fireEvent.click(launchBtn);
    // Le cast aboutit (onClose appelé) mais un cantrip à volonté ne consomme
    // rien → aucun patch `featureUsage`/slot n'est écrit.
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(updateCharacterMock).not.toHaveBeenCalled();
  });
});
