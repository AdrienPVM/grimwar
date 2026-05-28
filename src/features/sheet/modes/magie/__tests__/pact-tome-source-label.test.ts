import { describe, it, expect } from 'vitest';

import type { Character } from '@/shared/types/character';
import type { Spell } from '@/shared/types/content';

import {
  buildPactTomeSourceLabelMap,
  resolvePactTomeSpellEntries,
} from '../pact-tome-source-label';

/**
 * D13e-followup-grant-display — résolveur des sorts grantés par
 * l'invocation `pact-of-the-tome`. Couverture matricielle obligatoire (CLAUDE.md
 * « Couverture matricielle ») :
 *  - cat. 2 (identité du label visible) : tous les sorts portent
 *    « Pacte du grimoire » (terminologie WotC FR officielle).
 *  - cat. 4 (calcul de règles) : 3 cantrips + 2 rituels résolus = 5 entries.
 *  - cat. 5 (cohérence wizard → fiche) : les IDs persistés au wizard sont
 *    récupérés intégralement.
 *  - cat. 6 (cas-limites) : sort référencé inexistant dans le bundle (skip
 *    silencieux), classes multiples avec Warlock unique, dédoublonnage
 *    si même spell est listé en cantrip + ritual par erreur.
 */

const SPELLS_FIXTURE: Spell[] = [
  spellStub('detection-magie', 'Détection de la magie', 1, { ritual: true }),
  spellStub('alarme', 'Alarme', 1, { ritual: true }),
  spellStub('outils-de-chef', 'Outils du chef', 0),
  spellStub('lumiere', 'Lumière', 0),
  spellStub('illusion-mineure', 'Illusion mineure', 0),
];

describe('resolvePactTomeSpellEntries', () => {
  it('cat. 4 — 3 cantrips + 2 rituels = 5 entries résolues dans l\'ordre cantrips puis rituels', () => {
    const c = warlockL1WithPactTome({
      cantrips: ['outils-de-chef', 'lumiere', 'illusion-mineure'],
      rituals: ['detection-magie', 'alarme'],
    });
    const entries = resolvePactTomeSpellEntries(c, SPELLS_FIXTURE);
    expect(entries.map((e) => e.spell.id)).toEqual([
      'outils-de-chef',
      'lumiere',
      'illusion-mineure',
      'detection-magie',
      'alarme',
    ]);
  });

  it('cat. 2 — toutes les entries portent le label canonique « Pacte du grimoire »', () => {
    const c = warlockL1WithPactTome({
      cantrips: ['outils-de-chef'],
      rituals: ['detection-magie'],
    });
    const entries = resolvePactTomeSpellEntries(c, SPELLS_FIXTURE);
    expect(entries).toHaveLength(2);
    for (const e of entries) {
      expect(e.sourceLabel).toBe('Pacte du grimoire');
    }
  });

  it('cat. 6 — un slug inconnu du bundle est skippé silencieusement, pas de throw', () => {
    const c = warlockL1WithPactTome({
      cantrips: ['outils-de-chef', 'slug-inexistant-bidon'],
      rituals: ['detection-magie'],
    });
    const entries = resolvePactTomeSpellEntries(c, SPELLS_FIXTURE);
    expect(entries.map((e) => e.spell.id)).toEqual([
      'outils-de-chef',
      'detection-magie',
    ]);
  });

  it('cat. 6 — fiche Warlock sans pactTome (champs undefined ou listes vides) → 0 entries', () => {
    const c = warlockL1WithPactTome({ cantrips: [], rituals: [] });
    expect(resolvePactTomeSpellEntries(c, SPELLS_FIXTURE)).toEqual([]);

    const cMigrated = warlockL1WithPactTome({});
    // Champs absents (fiche V1 antérieure au chooser) → résolveur tolère.
    expect(resolvePactTomeSpellEntries(cMigrated, SPELLS_FIXTURE)).toEqual([]);
  });

  it('cat. 6 — dédoublonnage : même slug listé en cantrip ET ritual → entry unique', () => {
    // Cas accidentel : un build mal validé ferait passer le même slug dans les
    // deux listes ; on protège la couche d'affichage contre les doubles lignes.
    const c = warlockL1WithPactTome({
      cantrips: ['outils-de-chef'],
      rituals: ['outils-de-chef'],
    });
    const entries = resolvePactTomeSpellEntries(c, SPELLS_FIXTURE);
    expect(entries).toHaveLength(1);
    expect(entries[0]!.spell.id).toBe('outils-de-chef');
  });

  it('cat. 6 — multi-class Warlock + autre classe : seule la classe Warlock contribue', () => {
    const c = warlockL1WithPactTome({
      cantrips: ['outils-de-chef'],
      rituals: ['detection-magie'],
    });
    // Ajoute une classe Roublard qui n'a évidemment pas de pactTome — on
    // vérifie que la boucle gère sans crasher.
    c.classes.push({
      classId: 'rogue',
      subclassId: null,
      level: 1,
      clericDivineOrder: null,
      druidPrimalOrder: null,
      fighterFightingStyle: null,
      weaponMasteries: [],
      expertiseSkills: [],
      eldritchInvocations: [],
      wizardSpellbookL1: [],
    });
    c.totalLevel = 2;
    const entries = resolvePactTomeSpellEntries(c, SPELLS_FIXTURE);
    expect(entries.map((e) => e.spell.id)).toEqual([
      'outils-de-chef',
      'detection-magie',
    ]);
  });
});

describe('buildPactTomeSourceLabelMap', () => {
  it('cat. 5 — map { spellId → label } construite depuis les entries', () => {
    const c = warlockL1WithPactTome({
      cantrips: ['outils-de-chef', 'lumiere'],
      rituals: ['detection-magie'],
    });
    const entries = resolvePactTomeSpellEntries(c, SPELLS_FIXTURE);
    const map = buildPactTomeSourceLabelMap(entries);
    expect(map.size).toBe(3);
    expect(map.get('outils-de-chef')).toBe('Pacte du grimoire');
    expect(map.get('lumiere')).toBe('Pacte du grimoire');
    expect(map.get('detection-magie')).toBe('Pacte du grimoire');
    expect(map.get('slug-inexistant')).toBeUndefined();
  });
});

// -- Helpers ----------------------------------------------------------------

function spellStub(
  id: string,
  fr: string,
  level: number,
  opts: { ritual?: boolean } = {},
): Spell {
  return {
    id,
    name: { fr, en: fr },
    level,
    school: 'evocation',
    castingTime: { fr: '1 action', en: '1 Action' },
    range: { fr: '9 m', en: '30 ft' },
    components: { v: true, s: false, m: false },
    duration: { fr: '1 minute', en: '1 Minute' },
    concentration: false,
    ritual: opts.ritual ?? false,
    description: { fr: '', en: '' },
    atHigherLevels: null,
    classes: ['warlock', 'wizard'],
    source: 'srd-5.2.1',
  };
}

function warlockL1WithPactTome(p: {
  cantrips?: string[];
  rituals?: string[];
}): Character {
  return {
    id: 'test',
    name: 'Test',
    status: 'alive',
    classes: [
      {
        classId: 'warlock',
        subclassId: null,
        level: 1,
        clericDivineOrder: null,
        druidPrimalOrder: null,
        fighterFightingStyle: null,
        weaponMasteries: [],
        expertiseSkills: [],
        eldritchInvocations: ['pact-of-the-tome'],
        wizardSpellbookL1: [],
        ...(p.cantrips !== undefined ? { pactTomeCantrips: p.cantrips } : {}),
        ...(p.rituals !== undefined ? { pactTomeRituals: p.rituals } : {}),
      },
    ],
    totalLevel: 1,
    primaryClassId: 'warlock',
    ancestryId: 'human',
    ancestrySubChoices: {
      dragonAncestry: null,
      tieflingLegacy: null,
      elfLineage: null,
      gnomeLineage: null,
      goliathAncestry: null,
      ancestryCastingAbility: null,
      ancestryExtraSkill: null,
      ancestrySize: 'medium',
    },
    backgroundId: 'sage',
    extraLanguages: [],
    experience: 0,
    alignment: 'NB',
    abilities: { for: 10, dex: 12, con: 12, int: 10, sag: 10, cha: 16 },
    saves: { for: false, dex: false, con: false, int: false, sag: true, cha: true },
    skills: {},
    hp: { current: 8, max: 8, temp: 0 },
    ac: 11,
    speed: 30,
    initiative: 1,
    hitDice: [{ classId: 'warlock', current: 1, max: 1, die: 'd8' }],
    deathSaves: { success: 0, fail: 0 },
    conditions: [],
    inspiration: false,
    exhaustion: 0,
    currentConcentration: null,
    classResources: {},
    spellSlots: {},
    preparedSpells: {},
    knownSpells: { warlock: [] },
    spellcastingAbility: { warlock: 'cha' },
    inventory: { items: [], coins: { cu: 0, ar: 0, el: 0, or: 0, pl: 0 }, weightCache: 0 },
    personality: { trait: '', ideal: '', bond: '', flaw: '', backstory: '' },
    featureUsage: {},
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
