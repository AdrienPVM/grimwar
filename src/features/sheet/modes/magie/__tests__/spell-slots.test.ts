import { describe, expect, it } from 'vitest';

import type { Character } from '@/shared/types/character';
import type { ClassEntity } from '@/shared/types/content';

import {
  characterCasterLevel,
  consumeSlot,
  deriveCasterEntries,
  expectedSpellSlots,
  hasPactProgression,
  restoreSlot,
  spellcastingClasses,
  unlockedSlotLevels,
} from '../spell-slots';

const stubClass = (id: string, progression: 'full' | 'half' | 'third' | 'pact' | null): ClassEntity => ({
  id,
  name: { fr: id.charAt(0).toUpperCase() + id.slice(1), en: id },
  hitDie: 'd6',
  primaryAbility: ['int'],
  saveProficiencies: ['int'],
  armorProficiencies: [],
  weaponProficiencies: [],
  toolProficiencies: [],
  skillChoices: { count: 0, from: [] },
  spellcasting: progression ? { ability: 'int', progression } : null,
  startingEquipment: { options: [{ items: [], coins: null }] },
  description: { fr: '', en: '' },
  features: [],
  source: 'srd-5.2.1',
});

const baseCharacter = (): Character => ({
  id: 'lyralei',
  name: 'Lyralei',
  status: 'alive',
  classes: [{ classId: 'wizard', subclassId: null, level: 5 }],
  totalLevel: 5,
  primaryClassId: 'wizard',
  ancestryId: 'elf',
  subancestryId: null,
  backgroundId: 'sage',
  experience: 0,
  alignment: 'NB',
  abilities: { for: 8, dex: 14, con: 12, int: 16, sag: 12, cha: 10 },
  saves: { for: false, dex: false, con: false, int: true, sag: true, cha: false },
  skills: {},
  hp: { current: 22, max: 22, temp: 0 },
  ac: 12,
  speed: 9,
  initiative: 2,
  hitDice: [{ classId: 'wizard', current: 5, max: 5, die: 'd6' }],
  deathSaves: { success: 0, fail: 0 },
  conditions: [],
  inspiration: false,
  exhaustion: 0,
  currentConcentration: null,
  classResources: {},
  spellSlots: {
    '1': { current: 4, max: 4 },
    '2': { current: 3, max: 3 },
    '3': { current: 2, max: 2 },
  },
  preparedSpells: { wizard: ['fireball', 'shield'] },
  knownSpells: { wizard: ['fireball', 'shield', 'magic-missile', 'mage-hand'] },
  spellcastingAbility: { wizard: 'int' },
  inventory: { items: [], coins: { cu: 0, ar: 0, el: 0, or: 0, pl: 0 }, weightCache: 0 },
  personality: { trait: '', ideal: '', bond: '', flaw: '', backstory: '' },
  featureUsage: {},
  extraProficiencies: { armor: [], weapons: [], tools: [], languages: [] },
  presentInCampaigns: [],
  homeCampaignId: null,
  stats: { totalRolls: 0, totalD20Sum: 0, crits: 0, fumbles: 0, skillUses: {} },
  portrait: { type: 'letter', value: 'L' },
  schemaVersion: 1,
  createdAt: null,
  updatedAt: null,
  updatedBy: 'lyralei',
});

const wizard = stubClass('wizard', 'full');
const paladin = stubClass('paladin', 'half');
const fighter = stubClass('fighter', null);
const warlock = stubClass('warlock', 'pact');

describe('deriveCasterEntries', () => {
  it('mappe les classes du perso vers leur progression depuis le catalogue', () => {
    const character = baseCharacter();
    character.classes = [
      { classId: 'wizard', subclassId: null, level: 5 },
      { classId: 'fighter', subclassId: null, level: 2 },
    ];
    const entries = deriveCasterEntries(character.classes, [wizard, fighter]);
    expect(entries).toEqual([
      { level: 5, progression: 'full' },
      { level: 2, progression: null },
    ]);
  });

  it('ignore les classes absentes du catalogue (chargement async)', () => {
    const character = baseCharacter();
    const entries = deriveCasterEntries(character.classes, []);
    expect(entries).toHaveLength(0);
  });
});

describe('characterCasterLevel', () => {
  it('mono Wizard 5 = 5', () => {
    const character = baseCharacter();
    expect(characterCasterLevel(character, [wizard])).toBe(5);
  });

  it('Wizard 5 + Paladin 2 = 6 (5 + floor(2/2))', () => {
    const character = baseCharacter();
    character.classes = [
      { classId: 'wizard', subclassId: null, level: 5 },
      { classId: 'paladin', subclassId: null, level: 2 },
    ];
    expect(characterCasterLevel(character, [wizard, paladin])).toBe(6);
  });

  it('Wizard 3 + Warlock 5 = 3 (pact exclu)', () => {
    const character = baseCharacter();
    character.classes = [
      { classId: 'wizard', subclassId: null, level: 3 },
      { classId: 'warlock', subclassId: null, level: 5 },
    ];
    expect(characterCasterLevel(character, [wizard, warlock])).toBe(3);
  });
});

describe('expectedSpellSlots', () => {
  it('Wizard 5 → 4/3/2', () => {
    const slots = expectedSpellSlots(baseCharacter(), [wizard]);
    expect(slots[1]).toBe(4);
    expect(slots[2]).toBe(3);
    expect(slots[3]).toBe(2);
    expect(slots[4]).toBe(0);
  });
});

describe('unlockedSlotLevels', () => {
  it('liste les niveaux > 0 dans la table OU sur la fiche', () => {
    const character = baseCharacter();
    expect(unlockedSlotLevels(character, [wizard])).toEqual([1, 2, 3]);
  });

  it('inclut un niveau présent sur la fiche mais pas dans la table (cas custom)', () => {
    const character = baseCharacter();
    character.classes = [{ classId: 'fighter', subclassId: null, level: 2 }];
    character.totalLevel = 2;
    character.primaryClassId = 'fighter';
    character.spellSlots = { '1': { current: 0, max: 1 } };
    expect(unlockedSlotLevels(character, [fighter])).toEqual([1]);
  });
});

describe('consumeSlot', () => {
  it('décrémente d\'1 et clamp à 0 (retourne null si 0)', () => {
    const slots = { '1': { current: 4, max: 4 }, '2': { current: 0, max: 3 } };
    const next = consumeSlot(slots, 1);
    expect(next).not.toBeNull();
    expect(next!['1']).toEqual({ current: 3, max: 4 });
    expect(next!['2']).toEqual({ current: 0, max: 3 });
  });

  it('retourne null si current = 0', () => {
    const slots = { '2': { current: 0, max: 3 } };
    expect(consumeSlot(slots, 2)).toBeNull();
  });

  it('retourne null si le niveau n\'existe pas', () => {
    const slots = { '1': { current: 1, max: 1 } };
    expect(consumeSlot(slots, 5)).toBeNull();
  });

  it('ne mute pas le record original', () => {
    const slots = { '1': { current: 4, max: 4 } };
    const next = consumeSlot(slots, 1);
    expect(slots['1']!.current).toBe(4);
    expect(next!['1']!.current).toBe(3);
  });
});

describe('restoreSlot', () => {
  it('incrémente d\'1 et clamp à max', () => {
    const slots = { '1': { current: 2, max: 4 } };
    const next = restoreSlot(slots, 1);
    expect(next!['1']).toEqual({ current: 3, max: 4 });
  });

  it('retourne null si déjà au max', () => {
    const slots = { '1': { current: 4, max: 4 } };
    expect(restoreSlot(slots, 1)).toBeNull();
  });
});

describe('hasPactProgression', () => {
  it('true pour un Warlock pur', () => {
    const character = baseCharacter();
    character.classes = [{ classId: 'warlock', subclassId: null, level: 3 }];
    expect(hasPactProgression(character, [warlock])).toBe(true);
  });

  it('true pour un multi-class Wizard + Warlock', () => {
    const character = baseCharacter();
    character.classes = [
      { classId: 'wizard', subclassId: null, level: 3 },
      { classId: 'warlock', subclassId: null, level: 2 },
    ];
    expect(hasPactProgression(character, [wizard, warlock])).toBe(true);
  });

  it('false pour un Wizard pur', () => {
    const character = baseCharacter();
    expect(hasPactProgression(character, [wizard])).toBe(false);
  });

  it('false si le catalogue ne contient pas encore la classe (chargement async)', () => {
    const character = baseCharacter();
    character.classes = [{ classId: 'warlock', subclassId: null, level: 3 }];
    expect(hasPactProgression(character, [])).toBe(false);
  });
});

describe('spellcastingClasses', () => {
  it('retourne uniquement les classes lanceuses du perso avec l\'ability résolue', () => {
    const character = baseCharacter();
    character.classes = [
      { classId: 'wizard', subclassId: null, level: 5 },
      { classId: 'fighter', subclassId: null, level: 2 },
    ];
    const out = spellcastingClasses(character, [wizard, fighter], (n) => n.fr);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      classId: 'wizard',
      ability: 'int',
      progression: 'full',
    });
  });

  it('override : utilise l\'ability sur character.spellcastingAbility si fixée', () => {
    const character = baseCharacter();
    character.spellcastingAbility = { wizard: 'cha' };
    const out = spellcastingClasses(character, [wizard], (n) => n.fr);
    expect(out[0]!.ability).toBe('cha');
  });

  it('skip si l\'ability est explicitement null (sort encore non choisi)', () => {
    const character = baseCharacter();
    character.spellcastingAbility = { wizard: null };
    // Fallback à l'ability du catalogue (int) — null sur le perso veut dire
    // "non précisé", on retombe sur la valeur SRD du content.
    const out = spellcastingClasses(character, [wizard], (n) => n.fr);
    expect(out[0]!.ability).toBe('int');
  });
});
