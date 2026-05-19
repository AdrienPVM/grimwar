import { describe, expect, it } from 'vitest';

import type { Character, CharacterClassEntry } from '@/shared/types/character';

import {
  getFighterFightingStyle,
  getKnownWeaponMasteries,
} from '../weapon-mastery';

/**
 * Tests des helpers de lecture Weapon Mastery et Fighting Style (plan 13.9
 * commit 4a). Couvrent l'**invariant observable** : peu importe comment les
 * sous-choix sont stockés dans `classes[]`, le helper renvoie l'union (resp.
 * le 1er Fighter style) et l'absence totale.
 *
 * Itération exhaustive sur les chemins de combinaison (aucune classe / 1
 * classe / multi-class / sentinelle vide), pas d'échantillon arbitraire.
 */

function classEntry(
  partial: Partial<CharacterClassEntry> & Pick<CharacterClassEntry, 'classId'>,
): CharacterClassEntry {
  return {
    subclassId: null,
    level: 1,
    clericDivineOrder: null,
    druidPrimalOrder: null,
    fighterFightingStyle: null,
    weaponMasteries: [],
    expertiseSkills: [],
    eldritchInvocations: [],
    wizardSpellbookL1: [],
    ...partial,
  };
}

function characterWith(classes: CharacterClassEntry[]): Character {
  // Cast minimal — les helpers ne lisent que `classes[]`. Le reste du Character
  // reste hors scope pour ces tests purs.
  return { classes } as unknown as Character;
}

describe('getKnownWeaponMasteries', () => {
  it('renvoie un set vide si toutes les classes ont weaponMasteries = []', () => {
    const character = characterWith([
      classEntry({ classId: 'fighter', weaponMasteries: [] }),
    ]);
    expect(getKnownWeaponMasteries(character)).toEqual(new Set());
  });

  it('renvoie les 3 masteries du Guerrier mono-class', () => {
    const character = characterWith([
      classEntry({
        classId: 'fighter',
        weaponMasteries: ['longsword', 'greatsword', 'battleaxe'],
      }),
    ]);
    expect(getKnownWeaponMasteries(character)).toEqual(
      new Set(['longsword', 'greatsword', 'battleaxe']),
    );
  });

  it('multi-class : union sur toutes les classes (Roublard 2 / Guerrier 1)', () => {
    const character = characterWith([
      classEntry({
        classId: 'rogue',
        level: 2,
        weaponMasteries: ['rapier', 'shortsword'],
      }),
      classEntry({
        classId: 'fighter',
        level: 1,
        weaponMasteries: ['longsword', 'greatsword', 'battleaxe'],
      }),
    ]);
    expect(getKnownWeaponMasteries(character)).toEqual(
      new Set(['rapier', 'shortsword', 'longsword', 'greatsword', 'battleaxe']),
    );
  });

  it('multi-class avec recouvrement : Set dédoublonne', () => {
    const character = characterWith([
      classEntry({
        classId: 'rogue',
        weaponMasteries: ['shortsword', 'dagger'],
      }),
      classEntry({
        classId: 'fighter',
        weaponMasteries: ['shortsword', 'longsword'],
      }),
    ]);
    expect(getKnownWeaponMasteries(character)).toEqual(
      new Set(['shortsword', 'dagger', 'longsword']),
    );
  });
});

describe('getFighterFightingStyle', () => {
  it('renvoie null si aucune classe Guerrier', () => {
    const character = characterWith([
      classEntry({ classId: 'rogue', fighterFightingStyle: null }),
    ]);
    expect(getFighterFightingStyle(character)).toBeNull();
  });

  it('renvoie null si Guerrier sans style choisi (sentinelle)', () => {
    const character = characterWith([
      classEntry({ classId: 'fighter', fighterFightingStyle: null }),
    ]);
    expect(getFighterFightingStyle(character)).toBeNull();
  });

  it.each([
    'archery',
    'defense',
    'great-weapon-fighting',
    'two-weapon-fighting',
  ] as const)('Guerrier avec style=%s → renvoie le style', (style) => {
    const character = characterWith([
      classEntry({ classId: 'fighter', fighterFightingStyle: style }),
    ]);
    expect(getFighterFightingStyle(character)).toBe(style);
  });

  it('multi-class Guerrier-Magicien : renvoie le style du Guerrier', () => {
    const character = characterWith([
      classEntry({ classId: 'wizard', fighterFightingStyle: null }),
      classEntry({
        classId: 'fighter',
        fighterFightingStyle: 'defense',
      }),
    ]);
    expect(getFighterFightingStyle(character)).toBe('defense');
  });
});
