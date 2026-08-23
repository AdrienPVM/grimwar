import { describe, expect, it } from 'vitest';

import type { Character, CharacterClassEntry } from '@/shared/types/character';
import { createEmptyClassSubChoices } from '@/shared/types/character';
import type { ClassEntity } from '@/shared/types/content';

/** Helper local : entrée `classes[]` minimale avec sentinelles v2 (plan 13.7). */
const mkClassEntry = (classId: string, level: number): CharacterClassEntry => ({
  classId,
  subclassId: null,
  level,
  ...createEmptyClassSubChoices(),
});

import {
  characterCasterLevel,
  consumeSlot,
  deriveCasterEntries,
  expectedSpellSlots,
  fullSpellSlots,
  hasPactProgression,
  reconcileSpellSlots,
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
  weaponMasteryCount: 0,
  source: 'srd-5.2.1',
});

const baseCharacter = (): Character => ({
  id: 'lyralei',
  name: 'Lyralei',
  status: 'alive',
  classes: [
    {
      classId: 'wizard',
      subclassId: null,
      level: 5,
      clericDivineOrder: null,
      druidPrimalOrder: null,
      fighterFightingStyle: null,
      weaponMasteries: [],
      expertiseSkills: [],
      eldritchInvocations: [],
      wizardSpellbookL1: [],
    },
  ],
  totalLevel: 5,
  primaryClassId: 'wizard',
  ancestryId: 'elf',
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
  backgroundId: 'sage',
  extraLanguages: [],
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
  schemaVersion: 2,
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
      mkClassEntry('wizard', 5),
      mkClassEntry('fighter', 2),
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
      mkClassEntry('wizard', 5),
      mkClassEntry('paladin', 2),
    ];
    expect(characterCasterLevel(character, [wizard, paladin])).toBe(6);
  });

  it('Wizard 3 + Warlock 5 = 3 (pact exclu)', () => {
    const character = baseCharacter();
    character.classes = [
      mkClassEntry('wizard', 3),
      mkClassEntry('warlock', 5),
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

describe('fullSpellSlots (D28 — init à la création)', () => {
  it('Wizard 5 → 4/3/2 pleins (current === max)', () => {
    const slots = fullSpellSlots([mkClassEntry('wizard', 5)], [wizard]);
    expect(slots).toEqual({
      '1': { current: 4, max: 4 },
      '2': { current: 3, max: 3 },
      '3': { current: 2, max: 2 },
    });
  });

  it('Wizard 1 (caster fresh) → un seul niveau, 2/2 pleins', () => {
    const slots = fullSpellSlots([mkClassEntry('wizard', 1)], [wizard]);
    expect(slots).toEqual({ '1': { current: 2, max: 2 } });
  });

  // D30 — CORRIGE l'attente initiale de D28 (« demi-lanceur L1 → {} »), qui
  // appliquait la règle 2014. Le SRD 5.2.1 donne l'Incantation au niveau 1 aux
  // demi-lanceurs : table Paladin `SRD_CC_v5.2.1.txt` L5145 → « 1 … 2 2———— »
  // (2 sorts préparés, 2 emplacements de niveau 1).
  it('Paladin 1 (demi-lanceur niveau 1) → 2/2 au niveau 1 (SRD 5.2.1)', () => {
    const slots = fullSpellSlots([mkClassEntry('paladin', 1)], [paladin]);
    expect(slots).toEqual({ '1': { current: 2, max: 2 } });
  });

  it('Paladin 2 (demi-lanceur) → 2/2 au niveau 1', () => {
    const slots = fullSpellSlots([mkClassEntry('paladin', 2)], [paladin]);
    expect(slots).toEqual({ '1': { current: 2, max: 2 } });
  });

  it('Paladin 5 (demi-lanceur mono-classe) → 4/4 niv.1 + 2/2 niv.2 (SRD 5.2.1)', () => {
    // Avant D30 : floor(5/2)=2 → { 1: 3/3 } — un niveau de sort entier manquant.
    const slots = fullSpellSlots([mkClassEntry('paladin', 5)], [paladin]);
    expect(slots).toEqual({
      '1': { current: 4, max: 4 },
      '2': { current: 2, max: 2 },
    });
  });

  it('Fighter (non-lanceur) → {}', () => {
    expect(fullSpellSlots([mkClassEntry('fighter', 5)], [fighter])).toEqual({});
  });

  it('Warlock pur (pact hors table unifiée) → {}', () => {
    expect(fullSpellSlots([mkClassEntry('warlock', 3)], [warlock])).toEqual({});
  });

  it('catalogue vide (contenu pas encore chargé) → {}', () => {
    expect(fullSpellSlots([mkClassEntry('wizard', 5)], [])).toEqual({});
  });
});

describe('reconcileSpellSlots (D28 — réconciliation on-load)', () => {
  it('fiche caster avec spellSlots={} → remplit à plein la table attendue', () => {
    const character = baseCharacter();
    character.spellSlots = {};
    const patch = reconcileSpellSlots(character, [wizard]);
    expect(patch).toEqual({
      '1': { current: 4, max: 4 },
      '2': { current: 3, max: 3 },
      '3': { current: 2, max: 2 },
    });
  });

  it('fiche déjà correcte → null (no-op, pas d\'écriture inutile)', () => {
    const character = baseCharacter(); // spellSlots déjà 4/3/2
    expect(reconcileSpellSlots(character, [wizard])).toBeNull();
  });

  it('préserve la consommation en cours d\'un niveau déjà initialisé', () => {
    const character = baseCharacter();
    // Niveau 1 partiellement consommé, niveau 2 et 3 corrects.
    character.spellSlots = {
      '1': { current: 1, max: 4 },
      '2': { current: 3, max: 3 },
      '3': { current: 2, max: 2 },
    };
    // Tous les niveaux attendus ont max > 0 → aucun à remplir → no-op.
    expect(reconcileSpellSlots(character, [wizard])).toBeNull();
  });

  it('remplit uniquement les niveaux manquants/à max 0, sans toucher les autres', () => {
    const character = baseCharacter();
    character.spellSlots = {
      '1': { current: 0, max: 4 }, // déjà init et consommé → préservé
      '2': { current: 0, max: 0 }, // max 0 → à remplir
      // niveau 3 absent → à remplir
    };
    const patch = reconcileSpellSlots(character, [wizard]);
    expect(patch).toEqual({
      '1': { current: 0, max: 4 }, // intact
      '2': { current: 3, max: 3 }, // rempli
      '3': { current: 2, max: 2 }, // rempli
    });
  });

  it('non-lanceur → null', () => {
    const character = baseCharacter();
    character.classes = [mkClassEntry('fighter', 5)];
    character.spellSlots = {};
    expect(reconcileSpellSlots(character, [fighter])).toBeNull();
  });

  it('catalogue pas encore chargé → null (rien à réconcilier sans la table)', () => {
    const character = baseCharacter();
    character.spellSlots = {};
    expect(reconcileSpellSlots(character, [])).toBeNull();
  });
});

describe('unlockedSlotLevels', () => {
  it('liste les niveaux > 0 dans la table OU sur la fiche', () => {
    const character = baseCharacter();
    expect(unlockedSlotLevels(character, [wizard])).toEqual([1, 2, 3]);
  });

  it('inclut un niveau présent sur la fiche mais pas dans la table (cas custom)', () => {
    const character = baseCharacter();
    character.classes = [mkClassEntry('fighter', 2)];
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
    character.classes = [mkClassEntry('warlock', 3)];
    expect(hasPactProgression(character, [warlock])).toBe(true);
  });

  it('true pour un multi-class Wizard + Warlock', () => {
    const character = baseCharacter();
    character.classes = [
      mkClassEntry('wizard', 3),
      mkClassEntry('warlock', 2),
    ];
    expect(hasPactProgression(character, [wizard, warlock])).toBe(true);
  });

  it('false pour un Wizard pur', () => {
    const character = baseCharacter();
    expect(hasPactProgression(character, [wizard])).toBe(false);
  });

  it('false si le catalogue ne contient pas encore la classe (chargement async)', () => {
    const character = baseCharacter();
    character.classes = [mkClassEntry('warlock', 3)];
    expect(hasPactProgression(character, [])).toBe(false);
  });
});

describe('spellcastingClasses', () => {
  it('retourne uniquement les classes lanceuses du perso avec l\'ability résolue', () => {
    const character = baseCharacter();
    character.classes = [
      mkClassEntry('wizard', 5),
      mkClassEntry('fighter', 2),
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
