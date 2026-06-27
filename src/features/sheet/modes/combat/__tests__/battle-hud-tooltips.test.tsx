import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { t } from '@/shared/lib/i18n';
import type { Character } from '@/shared/types/character';

import { BattleHud } from '../battle-hud';

/**
 * Infobulles du Battle HUD — Cat. 2 « identité du contenu » : chaque infobulle
 * affiche EXACTEMENT le texte de sa clé i18n (pas « contient un mot »), et
 * l'infobulle d'Inspiration bascule grant↔remove selon l'état du perso.
 */

vi.mock('@/features/dice/use-dice', () => ({
  useDice: () => ({ rollD20Plus: vi.fn().mockResolvedValue(null) }),
}));

vi.mock('@/features/sheet/use-update-character', () => ({
  useUpdateCharacter: () => ({
    updateCharacter: vi.fn().mockResolvedValue(undefined),
    isUpdating: false,
    error: null,
  }),
}));

function buildCharacter(inspiration: boolean): Character {
  return {
    id: 'c1',
    name: 'Hud',
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
    conditions: [],
    inspiration,
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
    portrait: { type: 'letter', value: 'H' },
    schemaVersion: 2,
    createdAt: null as never,
    updatedAt: null as never,
    updatedBy: 'uid',
  };
}

function tooltipTexts(): string[] {
  return screen
    .getAllByRole('tooltip', { hidden: true })
    .map((el) => el.textContent ?? '');
}

describe('BattleHud — infobulles explicites (identité du contenu)', () => {
  it('chaque contrôle porte EXACTEMENT le texte de sa clé i18n', () => {
    render(<BattleHud character={buildCharacter(false)} readOnly={false} />);
    const texts = tooltipTexts();
    expect(texts).toContain(t('combat.hud.tip.action'));
    expect(texts).toContain(t('combat.hud.tip.bonus'));
    expect(texts).toContain(t('combat.hud.tip.reaction'));
    expect(texts).toContain(t('combat.hud.tip.initiative'));
    expect(texts).toContain(t('combat.hud.tip.endTurn'));
  });

  it("infobulle d'Inspiration = « octroyer » quand le perso ne l'a pas", () => {
    render(<BattleHud character={buildCharacter(false)} readOnly={false} />);
    const texts = tooltipTexts();
    expect(texts).toContain(t('combat.hud.tip.inspirationGrant'));
    expect(texts).not.toContain(t('combat.hud.tip.inspirationRemove'));
  });

  it("infobulle d'Inspiration = « retirer » quand le perso l'a déjà", () => {
    render(<BattleHud character={buildCharacter(true)} readOnly={false} />);
    const texts = tooltipTexts();
    expect(texts).toContain(t('combat.hud.tip.inspirationRemove'));
    expect(texts).not.toContain(t('combat.hud.tip.inspirationGrant'));
  });
});
