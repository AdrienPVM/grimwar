import { describe, expect, it } from 'vitest';

import {
  casterLevel,
  maxHp,
  proficiencyBonus,
  slotCasterLevel,
  spellSlotsForCasterLevel,
  totalLevel,
} from '../multiclass';
import {
  createEmptyClassSubChoices,
  type CharacterClassEntry,
} from '@/shared/types/character';

/** Helper local : entrée `classes[]` minimale avec sentinelles v2 (plan 13.7). */
const mk = (classId: string, level: number): CharacterClassEntry => ({
  classId,
  subclassId: null,
  level,
  ...createEmptyClassSubChoices(),
});

describe('proficiencyBonus', () => {
  it('matches SRD table', () => {
    expect(proficiencyBonus(1)).toBe(2);
    expect(proficiencyBonus(4)).toBe(2);
    expect(proficiencyBonus(5)).toBe(3);
    expect(proficiencyBonus(8)).toBe(3);
    expect(proficiencyBonus(9)).toBe(4);
    expect(proficiencyBonus(13)).toBe(5);
    expect(proficiencyBonus(17)).toBe(6);
    expect(proficiencyBonus(20)).toBe(6);
  });
});

describe('totalLevel', () => {
  it('sums multiclass levels', () => {
    expect(totalLevel([mk('a', 3)])).toBe(3);
    expect(
      totalLevel([
        mk('a', 5),
        mk('b', 2),
      ]),
    ).toBe(7);
  });
});

describe('maxHp', () => {
  it('level 1 fighter (d10) with +2 CON = 12', () => {
    const hp = maxHp({
      classes: [{ classId: 'fighter', level: 1, die: 'd10' }],
      primaryClassId: 'fighter',
      conMod: 2,
    });
    expect(hp).toBe(12);
  });
  it('level 5 wizard (d6) with +0 CON = 6 + 4*4 = 22', () => {
    const hp = maxHp({
      classes: [{ classId: 'wizard', level: 5, die: 'd6' }],
      primaryClassId: 'wizard',
      conMod: 0,
    });
    expect(hp).toBe(6 + 4 * 4);
  });
  it('always at least 1', () => {
    const hp = maxHp({
      classes: [{ classId: 'wizard', level: 1, die: 'd6' }],
      primaryClassId: 'wizard',
      conMod: -10,
    });
    expect(hp).toBeGreaterThanOrEqual(1);
  });
});

// DEBT D30 — un demi-lanceur MONO-CLASSE suit sa table de classe, pas la règle
// d'addition multiclasse `floor(niveau/2)`. Valeurs figées contre le SRD 5.2.1 :
// table Paladin (SRD_CC_v5.2.1.txt L5145-5166) et Rôdeur (L5593-5614), qui sont
// identiques sur les 20 niveaux. Vérification humaine faite UNE fois ici.
describe('slotCasterLevel — demi-lanceur mono-classe (D30)', () => {
  // [niveau de classe, emplacements attendus] repris LIGNE À LIGNE du SRD.
  const SRD_HALF_CASTER_SLOTS: readonly [number, Record<number, number>][] = [
    [1, { 1: 2 }],
    [2, { 1: 2 }],
    [3, { 1: 3 }],
    [4, { 1: 3 }],
    [5, { 1: 4, 2: 2 }],
    [6, { 1: 4, 2: 2 }],
    [7, { 1: 4, 2: 3 }],
    [8, { 1: 4, 2: 3 }],
    [9, { 1: 4, 2: 3, 3: 2 }],
    [10, { 1: 4, 2: 3, 3: 2 }],
    [11, { 1: 4, 2: 3, 3: 3 }],
    [12, { 1: 4, 2: 3, 3: 3 }],
    [13, { 1: 4, 2: 3, 3: 3, 4: 1 }],
    [14, { 1: 4, 2: 3, 3: 3, 4: 1 }],
    [15, { 1: 4, 2: 3, 3: 3, 4: 2 }],
    [16, { 1: 4, 2: 3, 3: 3, 4: 2 }],
    [17, { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 }],
    [18, { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 }],
    [19, { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 }],
    [20, { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 }],
  ];

  it.each(SRD_HALF_CASTER_SLOTS)(
    'Paladin/Rôdeur mono-classe niveau %i → table SRD exacte',
    (level, expected) => {
      const slots = spellSlotsForCasterLevel(slotCasterLevel([{ level, progression: 'half' }]));
      for (const lvl of [1, 2, 3, 4, 5, 6, 7, 8, 9] as const) {
        expect(slots[lvl]).toBe(expected[lvl] ?? 0);
      }
    },
  );

  it('le demi-lanceur mono-classe a l Incantation dès le niveau 1 (SRD 5.2.1)', () => {
    // Régression directe de la note erronée de D28 (« demi-lanceurs L1 → {} »,
    // règle 2014). En 5.2.1 le Paladin niveau 1 a 2 emplacements de niveau 1.
    expect(slotCasterLevel([{ level: 1, progression: 'half' }])).toBe(1);
    expect(spellSlotsForCasterLevel(1)[1]).toBe(2);
  });

  it('full caster mono-classe : inchangé (table unifiée == table de classe)', () => {
    expect(slotCasterLevel([{ level: 5, progression: 'full' }])).toBe(5);
    expect(slotCasterLevel([{ level: 20, progression: 'full' }])).toBe(20);
  });

  it('multiclasse : retombe sur la règle d addition floor()', () => {
    // 5 magicien (full=5) + 2 paladin (half=1) = 6 — règle multiclasse SRD.
    expect(
      slotCasterLevel([
        { level: 5, progression: 'full' },
        { level: 2, progression: 'half' },
      ]),
    ).toBe(6);
    // 2 paladin + 2 rôdeur = deux demi-lanceurs ⇒ addition, pas table de classe.
    expect(
      slotCasterLevel([
        { level: 2, progression: 'half' },
        { level: 2, progression: 'half' },
      ]),
    ).toBe(2);
  });

  it('Occultiste pur reste hors table unifiée', () => {
    expect(slotCasterLevel([{ level: 10, progression: 'pact' }])).toBe(0);
  });

  it('demi-lanceur + pact : le pact ne compte pas, la table de classe s applique', () => {
    // Un seul lanceur de la table unifiée (le paladin) ⇒ sa propre table.
    expect(
      slotCasterLevel([
        { level: 5, progression: 'half' },
        { level: 3, progression: 'pact' },
      ]),
    ).toBe(3);
  });

  it('non-lanceur pur → 0', () => {
    expect(slotCasterLevel([{ level: 5, progression: null }])).toBe(0);
  });
});

describe('casterLevel', () => {
  it('mono full caster compte 1:1', () => {
    expect(casterLevel([{ level: 5, progression: 'full' }])).toBe(5);
  });
  it('mono half caster (paladin/ranger) = floor(level/2)', () => {
    expect(casterLevel([{ level: 1, progression: 'half' }])).toBe(0);
    expect(casterLevel([{ level: 2, progression: 'half' }])).toBe(1);
    expect(casterLevel([{ level: 5, progression: 'half' }])).toBe(2);
  });
  it('mono third caster (arcane trickster/eldritch knight) = floor(level/3)', () => {
    expect(casterLevel([{ level: 2, progression: 'third' }])).toBe(0);
    expect(casterLevel([{ level: 3, progression: 'third' }])).toBe(1);
    expect(casterLevel([{ level: 7, progression: 'third' }])).toBe(2);
  });
  it('multi-class : somme des contributions par progression', () => {
    // 5 wizard (full=5) + 2 paladin (half=1) = 6
    expect(
      casterLevel([
        { level: 5, progression: 'full' },
        { level: 2, progression: 'half' },
      ]),
    ).toBe(6);
  });
  it('pact (warlock) est exclu de la table unifiée', () => {
    expect(casterLevel([{ level: 10, progression: 'pact' }])).toBe(0);
    // 3 wizard + 5 warlock → table unifiée = 3
    expect(
      casterLevel([
        { level: 3, progression: 'full' },
        { level: 5, progression: 'pact' },
      ]),
    ).toBe(3);
  });
  it('non-caster sans progression compte 0', () => {
    expect(casterLevel([{ level: 5, progression: null }])).toBe(0);
  });
});

describe('spellSlotsForCasterLevel', () => {
  it('niveau 0 ou négatif = aucun emplacement', () => {
    expect(spellSlotsForCasterLevel(0)).toEqual({
      1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0,
    });
    expect(spellSlotsForCasterLevel(-3)).toEqual({
      1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0,
    });
  });
  it('niveau 1 = 2 slots de niveau 1', () => {
    expect(spellSlotsForCasterLevel(1)[1]).toBe(2);
    expect(spellSlotsForCasterLevel(1)[2]).toBe(0);
  });
  it('niveau 5 full caster = 4/3/2', () => {
    const slots = spellSlotsForCasterLevel(5);
    expect(slots[1]).toBe(4);
    expect(slots[2]).toBe(3);
    expect(slots[3]).toBe(2);
    expect(slots[4]).toBe(0);
  });
  it('niveau 20 max table', () => {
    expect(spellSlotsForCasterLevel(20)).toEqual({
      1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 2, 8: 1, 9: 1,
    });
  });
  it('niveau > 20 clamp sur 20', () => {
    expect(spellSlotsForCasterLevel(30)).toEqual(spellSlotsForCasterLevel(20));
  });
});
