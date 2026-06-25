import { describe, expect, it } from 'vitest';

import type { CampaignVariants } from '../../../types/campaign';
import type { Character } from '../../../types/character';
import type { ClassResourcePool } from '../class-resources';
import { applyLongRest, NO_VARIANTS } from '../long-rest';

/**
 * `applyLongRest` — Cat. 4 (calcul chiffré contre la règle SRD) + Cat. 6
 * (intersections variantes). Fonction pure → on asserte le patch au chiffre
 * près : PV→max, dés de vie regagnés = moitié du total (min 1), réserves au
 * max, emplacements au max, épuisement −1. Variantes slowHealing (pas de PV) et
 * grittyRealism (aucun changement mécanique).
 */

function build(overrides: Partial<Character> = {}): Character {
  return {
    id: 'lr',
    name: 'Lr',
    status: 'alive',
    classes: [],
    totalLevel: 6,
    primaryClassId: 'barbarian',
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
    hp: { current: 10, max: 52, temp: 0 },
    ac: 14,
    speed: 30,
    initiative: 1,
    hitDice: [{ classId: 'barbarian', current: 1, max: 6, die: 'd12' }],
    deathSaves: { success: 0, fail: 0 },
    conditions: [],
    inspiration: false,
    exhaustion: 2,
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
    portrait: { type: 'letter', value: 'L' },
    schemaVersion: 2,
    createdAt: null as never,
    updatedAt: null as never,
    updatedBy: 'uid',
    ...overrides,
  };
}

const ragePool: ClassResourcePool = {
  storageKey: 'barbarian:rage',
  resourceKey: 'rage',
  classId: 'barbarian',
  labelKey: 'sheet.combat.resources.rage',
  max: 3,
  restoresOn: 'long',
};

describe('applyLongRest — standard (aucune variante)', () => {
  it('rend les PV au maximum', () => {
    const r = applyLongRest(build(), []);
    expect(r.patch.hp!.current).toBe(52);
    expect(r.summary.hpHealed).toBe(42); // 52 - 10
  });

  it('regagne la moitié des dés de vie (arrondi bas)', () => {
    // total max 6 → regagne floor(6/2) = 3 ; current 1 → 4.
    const r = applyLongRest(build(), []);
    expect(r.patch.hitDice![0]!.current).toBe(4);
    expect(r.summary.hitDiceRegained).toBe(3);
  });

  it('regagne au minimum 1 dé de vie même si la moitié arrondit à 0', () => {
    // total max 1 → floor(1/2) = 0 → forcé à 1.
    const c = build({ hitDice: [{ classId: 'wizard', current: 0, max: 1, die: 'd6' }] });
    const r = applyLongRest(c, []);
    expect(r.summary.hitDiceRegained).toBe(1);
    expect(r.patch.hitDice![0]!.current).toBe(1);
  });

  it('ne dépasse jamais le max de dés de vie', () => {
    const c = build({ hitDice: [{ classId: 'barbarian', current: 6, max: 6, die: 'd12' }] });
    const r = applyLongRest(c, []);
    expect(r.patch.hitDice![0]!.current).toBe(6);
    expect(r.summary.hitDiceRegained).toBe(0);
  });

  it('réinitialise toutes les réserves de classe au max', () => {
    const c = build({
      classResources: { 'barbarian:rage': { current: 0, max: 3, restoresOn: 'long' } },
    });
    const r = applyLongRest(c, [ragePool]);
    expect(r.patch.classResources!['barbarian:rage']).toEqual({
      current: 3,
      max: 3,
      restoresOn: 'long',
    });
    expect(r.summary.resourcesReset).toBe(1);
  });

  it('restaure tous les emplacements de sort au max', () => {
    const c = build({
      spellSlots: { '1': { current: 0, max: 4 }, '2': { current: 1, max: 3 } },
    });
    const r = applyLongRest(c, []);
    expect(r.patch.spellSlots).toEqual({
      '1': { current: 4, max: 4 },
      '2': { current: 3, max: 3 },
    });
  });

  it('retire 1 niveau d\'épuisement (règle 2024)', () => {
    const r = applyLongRest(build({ exhaustion: 2 }), []);
    expect(r.patch.exhaustion).toBe(1);
    expect(r.summary.exhaustionRemoved).toBe(1);
  });

  it('épuisement 0 → reste 0 (jamais négatif)', () => {
    const r = applyLongRest(build({ exhaustion: 0 }), []);
    expect(r.patch.exhaustion).toBe(0);
    expect(r.summary.exhaustionRemoved).toBe(0);
  });
});

describe('applyLongRest — variante slowHealing', () => {
  const slowHealing: CampaignVariants = { ...NO_VARIANTS, slowHealing: true };

  it('ne rend PAS les PV (le joueur dépense ses dés de vie)', () => {
    const r = applyLongRest(build({ hp: { current: 10, max: 52, temp: 0 } }), [], slowHealing);
    expect(r.patch.hp!.current).toBe(10); // inchangé
    expect(r.summary.hpHealed).toBe(0);
  });

  it('regagne tout de même les dés de vie et réinitialise les réserves', () => {
    const c = build({
      hp: { current: 10, max: 52, temp: 0 },
      classResources: { 'barbarian:rage': { current: 0, max: 3, restoresOn: 'long' } },
    });
    const r = applyLongRest(c, [ragePool], slowHealing);
    expect(r.summary.hitDiceRegained).toBe(3);
    expect(r.patch.classResources!['barbarian:rage']!.current).toBe(3);
  });
});

describe('applyLongRest — variante grittyRealism', () => {
  const gritty: CampaignVariants = { ...NO_VARIANTS, grittyRealism: true };

  it('mécaniquement identique au standard (seule la durée narrative change)', () => {
    const standard = applyLongRest(build(), [ragePool]);
    const realism = applyLongRest(build(), [ragePool], gritty);
    expect(realism.patch).toEqual(standard.patch);
    expect(realism.summary).toEqual(standard.summary);
  });
});
