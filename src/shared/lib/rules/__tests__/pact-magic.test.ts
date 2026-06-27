import { describe, expect, it } from 'vitest';

import type { Character } from '@/shared/types/character';
import type { ClassEntity } from '@/shared/types/content';

import {
  characterPactMagic,
  pactClassLevel,
  pactMagicForLevel,
  readPactSlotState,
} from '../pact-magic';

import classesBundle from '../../../../../public/data/classes.json';

/**
 * Magie de pacte (SRD 5.2.1) — tests d'IDENTITÉ chiffrés : nombre EXACT
 * d'emplacements + niveau EXACT d'emplacement par niveau d'Occultiste, dérivés
 * sans dépendre d'un champ stocké (robuste à `classResources: {}`).
 */

const classCatalog = classesBundle as unknown as ClassEntity[];

/** Personnage minimal — les helpers ne lisent que `classes` + `classResources`. */
function warlock(
  level: number,
  classResources: Character['classResources'] = {},
): Character {
  return {
    classes: [{ classId: 'warlock', level } as Character['classes'][number]],
    classResources,
  } as unknown as Character;
}

describe('pactMagicForLevel (table SRD)', () => {
  it('L1 → 1 emplacement de niveau 1', () => {
    expect(pactMagicForLevel(1)).toEqual({ slotLevel: 1, count: 1 });
  });

  it('L2 → 2 emplacements de niveau 1', () => {
    expect(pactMagicForLevel(2)).toEqual({ slotLevel: 1, count: 2 });
  });

  it('L3 → 2 emplacements de niveau 2', () => {
    expect(pactMagicForLevel(3)).toEqual({ slotLevel: 2, count: 2 });
  });

  it('L5 → 2 emplacements de niveau 3', () => {
    expect(pactMagicForLevel(5)).toEqual({ slotLevel: 3, count: 2 });
  });

  it('L9 → 2 emplacements de niveau 5 (le niveau plafonne à 5)', () => {
    expect(pactMagicForLevel(9)).toEqual({ slotLevel: 5, count: 2 });
  });

  it('L11 → 3 emplacements de niveau 5', () => {
    expect(pactMagicForLevel(11)).toEqual({ slotLevel: 5, count: 3 });
  });

  it('L17 → 4 emplacements de niveau 5', () => {
    expect(pactMagicForLevel(17)).toEqual({ slotLevel: 5, count: 4 });
  });

  it('L20 → 4 emplacements de niveau 5', () => {
    expect(pactMagicForLevel(20)).toEqual({ slotLevel: 5, count: 4 });
  });

  it('niveau ≤ 0 → null', () => {
    expect(pactMagicForLevel(0)).toBeNull();
  });
});

describe('pactClassLevel', () => {
  it('somme le niveau des classes à progression pact', () => {
    expect(pactClassLevel(warlock(5), classCatalog)).toBe(5);
  });

  it('0 pour un personnage sans classe à pacte', () => {
    const cleric = {
      classes: [{ classId: 'cleric', level: 5 } as Character['classes'][number]],
      classResources: {},
    } as unknown as Character;
    expect(pactClassLevel(cleric, classCatalog)).toBe(0);
  });
});

describe('characterPactMagic', () => {
  it('dérive la magie de pacte d’un Occultiste L3', () => {
    expect(characterPactMagic(warlock(3), classCatalog)).toEqual({
      slotLevel: 2,
      count: 2,
    });
  });

  it('null pour un non-Occultiste', () => {
    const fighter = {
      classes: [{ classId: 'fighter', level: 5 } as Character['classes'][number]],
      classResources: {},
    } as unknown as Character;
    expect(characterPactMagic(fighter, classCatalog)).toBeNull();
  });
});

describe('readPactSlotState', () => {
  it('fiche fraîche (classResources vide) → emplacements pleins dérivés du niveau', () => {
    expect(readPactSlotState(warlock(5), classCatalog)).toEqual({
      current: 2,
      max: 2,
      slotLevel: 3,
    });
  });

  it('respecte le current stocké (1 emplacement dépensé)', () => {
    const ch = warlock(5, {
      'pact-magic-slots': { current: 1, max: 2, restoresOn: 'short' },
    });
    expect(readPactSlotState(ch, classCatalog)).toEqual({
      current: 1,
      max: 2,
      slotLevel: 3,
    });
  });

  it('clampe un current stocké supérieur au max dérivé', () => {
    const ch = warlock(1, {
      'pact-magic-slots': { current: 9, max: 9, restoresOn: 'short' },
    });
    // L1 dérive max=1 → current clampé à 1.
    expect(readPactSlotState(ch, classCatalog)).toEqual({
      current: 1,
      max: 1,
      slotLevel: 1,
    });
  });

  it('null pour un non-Occultiste', () => {
    const cleric = {
      classes: [{ classId: 'cleric', level: 5 } as Character['classes'][number]],
      classResources: {},
    } as unknown as Character;
    expect(readPactSlotState(cleric, classCatalog)).toBeNull();
  });
});
