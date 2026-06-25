import { describe, expect, it } from 'vitest';

import type { Character } from '../../../types/character';
import { applyHitDieSpend } from '../short-rest';

/**
 * `applyHitDieSpend` — Cat. 4 (calcul chiffré contre la règle SRD). Le tirage
 * est injecté (fonction pure), donc on asserte les PV rendus et le décrément du
 * pool au chiffre près : capage à `hp.max`, jamais de PV négatifs, un seul dé
 * dépensé, autres pools intacts.
 */

function build(overrides: Partial<Character> = {}): Character {
  return {
    id: 'sr',
    name: 'Sr',
    status: 'alive',
    classes: [],
    totalLevel: 3,
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
    hp: { current: 10, max: 28, temp: 0 },
    ac: 16,
    speed: 30,
    initiative: 1,
    hitDice: [{ classId: 'fighter', current: 3, max: 3, die: 'd10' }],
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
    inventory: { items: [], coins: { cu: 0, ar: 0, el: 0, or: 0, pl: 0 }, weightCache: 0 },
    personality: { trait: '', ideal: '', bond: '', flaw: '', backstory: '' },
    featureUsage: {},
    extraProficiencies: { armor: [], weapons: [], tools: [], languages: [] },
    presentInCampaigns: [],
    homeCampaignId: null,
    stats: { totalRolls: 0, totalD20Sum: 0, crits: 0, fumbles: 0, skillUses: {} },
    portrait: { type: 'letter', value: 'S' },
    schemaVersion: 2,
    createdAt: null as never,
    updatedAt: null as never,
    updatedBy: 'uid',
    ...overrides,
  };
}

describe('applyHitDieSpend', () => {
  it('rend les PV du jet et décrémente le pool', () => {
    const result = applyHitDieSpend(build(), 'fighter', 7);
    expect(result).not.toBeNull();
    expect(result!.healedBy).toBe(7);
    expect(result!.patch.hp.current).toBe(17); // 10 + 7
    expect(result!.patch.hitDice[0]!.current).toBe(2); // 3 → 2
  });

  it('cape les PV à hp.max (le surplus est perdu)', () => {
    const result = applyHitDieSpend(build({ hp: { current: 25, max: 28, temp: 0 } }), 'fighter', 9);
    expect(result!.patch.hp.current).toBe(28); // pas 34
    expect(result!.healedBy).toBe(3); // soin réel capé
    expect(result!.patch.hitDice[0]!.current).toBe(2);
  });

  it('un jet de 0 (dé minimal + mod négatif déjà capé) ne soigne pas mais consomme le dé', () => {
    const result = applyHitDieSpend(build(), 'fighter', 0);
    expect(result!.healedBy).toBe(0);
    expect(result!.patch.hp.current).toBe(10);
    expect(result!.patch.hitDice[0]!.current).toBe(2);
  });

  it('retourne null si le pool de la classe est vide', () => {
    const c = build({ hitDice: [{ classId: 'fighter', current: 0, max: 3, die: 'd10' }] });
    expect(applyHitDieSpend(c, 'fighter', 6)).toBeNull();
  });

  it('retourne null si la classe n\'a pas de pool', () => {
    expect(applyHitDieSpend(build(), 'wizard', 6)).toBeNull();
  });

  it('multi-class : ne touche que le pool de la classe dépensée', () => {
    const c = build({
      hitDice: [
        { classId: 'fighter', current: 2, max: 2, die: 'd10' },
        { classId: 'wizard', current: 1, max: 1, die: 'd6' },
      ],
    });
    const result = applyHitDieSpend(c, 'wizard', 4);
    expect(result!.patch.hitDice[0]!.current).toBe(2); // fighter intact
    expect(result!.patch.hitDice[1]!.current).toBe(0); // wizard décrémenté
  });
});
