import { describe, expect, it } from 'vitest';

import type { Character, CharacterClassEntry } from '@/shared/types/character';
import type { Item } from '@/shared/types/content';

import {
  getEligibleWeaponMasteryIds,
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

/**
 * JALON 2A.5 — Le filtre d'éligibilité Weapon Mastery est désormais
 * data-driven (champ `weaponMasteryEligibility` sur `ClassEntity`). Le code
 * n'a plus aucune connaissance des classIds SRD : il dispatch sur l'enum
 * `WeaponMasteryEligibility`. Ces tests fixent les deux semantiques SRD et
 * la dégradation gracieuse pour `null/undefined`.
 *
 * Fixtures réduites à l'essentiel : un panaché d'armes simple/martiale avec
 * et sans `masteryProperty`, et avec/sans Finesse/Light. Pas de bundle
 * complet — on isole la règle.
 */
const masteryItems: readonly Item[] = [
  {
    id: 'longsword',
    name: { fr: 'Épée longue', en: 'Longsword' },
    category: 'weapon',
    cost: null,
    weight: 1.5,
    description: null,
    properties: ['martial-melee', 'Versatile'],
    masteryProperty: 'sap',
    source: 'srd-5.2.1',
  },
  {
    id: 'rapier',
    name: { fr: 'Rapière', en: 'Rapier' },
    category: 'weapon',
    cost: null,
    weight: 1,
    description: null,
    properties: ['martial-melee', 'Finesse'],
    masteryProperty: 'vex',
    source: 'srd-5.2.1',
  },
  {
    id: 'shortsword',
    name: { fr: 'Épée courte', en: 'Shortsword' },
    category: 'weapon',
    cost: null,
    weight: 1,
    description: null,
    properties: ['martial-melee', 'Finesse', 'Light'],
    masteryProperty: 'vex',
    source: 'srd-5.2.1',
  },
  {
    id: 'dagger',
    name: { fr: 'Dague', en: 'Dagger' },
    category: 'weapon',
    cost: null,
    weight: 0.5,
    description: null,
    properties: ['simple-melee', 'Finesse', 'Light'],
    masteryProperty: 'nick',
    source: 'srd-5.2.1',
  },
  {
    id: 'mace',
    name: { fr: 'Masse d’armes', en: 'Mace' },
    category: 'weapon',
    cost: null,
    weight: 2,
    description: null,
    properties: ['simple-melee'],
    masteryProperty: 'sap',
    source: 'srd-5.2.1',
  },
  // arme sans masteryProperty — doit être filtrée en tête (.filter category=weapon && masteryProperty)
  {
    id: 'club',
    name: { fr: 'Gourdin', en: 'Club' },
    category: 'weapon',
    cost: null,
    weight: 1,
    description: null,
    properties: ['simple-melee', 'Light'],
    source: 'srd-5.2.1',
  },
];

describe('getEligibleWeaponMasteryIds — data-driven (JALON 2A.5)', () => {
  it('eligibility=null → tableau vide (classes sans Weapon Mastery L1)', () => {
    expect(getEligibleWeaponMasteryIds(null, masteryItems, 'fr')).toEqual([]);
  });

  it('eligibility=undefined → tableau vide (champ omis dans bundle)', () => {
    expect(getEligibleWeaponMasteryIds(undefined, masteryItems, 'fr')).toEqual([]);
  });

  it('all-proficient : toutes les armes avec masteryProperty (filtre le gourdin sans mastery)', () => {
    const result = getEligibleWeaponMasteryIds('all-proficient', masteryItems, 'fr');
    const ids = result.map((it) => it.id).sort();
    expect(ids).toEqual(['dagger', 'longsword', 'mace', 'rapier', 'shortsword']);
  });

  it('rogue-finesse-light : armes simples + martiales Finesse/Light, exclut Épée longue (martiale non-Finesse non-Light)', () => {
    const result = getEligibleWeaponMasteryIds(
      'rogue-finesse-light',
      masteryItems,
      'fr',
    );
    const ids = result.map((it) => it.id).sort();
    // dagger (simple-melee), mace (simple-melee), rapier (martial+Finesse),
    // shortsword (martial+Finesse+Light). longsword exclue (martiale sans
    // Finesse/Light). club exclue (pas de masteryProperty).
    expect(ids).toEqual(['dagger', 'mace', 'rapier', 'shortsword']);
  });

  it('tri stable par nom localisé FR', () => {
    const result = getEligibleWeaponMasteryIds('all-proficient', masteryItems, 'fr');
    const names = result.map((it) => it.name.fr);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'fr')));
  });
});
