import { describe, expect, it } from 'vitest';

import type { CharacterClassEntry, FightingStyle } from '@/shared/types/character';

import {
  computeInvocationAcBonus,
  getInvocationEntry,
  getKnownInvocationSlugs,
} from '../eldritch-invocations';

/**
 * D13a — Armor of Shadows. Tests du registre + du calcul du bonus AC pour
 * l'invocation passive. Couvre :
 *  - cat. 3 (fidélité bundle / registre) : les 5 slugs L1 connus du registre.
 *  - cat. 4 (calcul de règle) : Mage Armor +3 SSI pas d'armure portée.
 *  - cat. 6 (intersections) : bouclier seul ne veto pas ; multi-classe
 *    (Warlock × Fighter) propage le bonus ; slug dupliqué = 1 bonus.
 */

function makeClass(opts: {
  classId: string;
  invocations?: readonly string[];
  fightingStyle?: FightingStyle | null;
}): CharacterClassEntry {
  return {
    classId: opts.classId,
    subclassId: null,
    level: 1,
    clericDivineOrder: null,
    druidPrimalOrder: null,
    fighterFightingStyle: opts.fightingStyle ?? null,
    weaponMasteries: [],
    expertiseSkills: [],
    eldritchInvocations: [...(opts.invocations ?? [])],
    wizardSpellbookL1: [],
  };
}

describe('eldritch-invocations registry', () => {
  it('cat. 3 — les 5 invocations L1 SRD 5.2.1 sont connues du registre', () => {
    const l1Slugs = [
      'armor-of-shadows',
      'eldritch-mind',
      'pact-of-the-blade',
      'pact-of-the-chain',
      'pact-of-the-tome',
    ];
    for (const slug of l1Slugs) {
      expect(getInvocationEntry(slug), `${slug} absent du registre`).not.toBeNull();
    }
  });

  it('armor-of-shadows a un effet passive-mage-armor avec bonus +3 + requiresUnarmored', () => {
    const entry = getInvocationEntry('armor-of-shadows');
    expect(entry).not.toBeNull();
    expect(entry?.effect?.kind).toBe('passive-mage-armor');
    if (entry?.effect?.kind === 'passive-mage-armor') {
      expect(entry.effect.bonus).toBe(3);
      expect(entry.effect.requiresUnarmored).toBe(true);
    }
  });

  it('les 4 autres invocations L1 sont au registre mais sans effet câblé (D13b-e)', () => {
    for (const slug of ['eldritch-mind', 'pact-of-the-blade', 'pact-of-the-chain', 'pact-of-the-tome']) {
      const entry = getInvocationEntry(slug);
      expect(entry?.effect, `${slug} ne doit pas avoir d'effet runtime câblé en D13a`).toBeNull();
    }
  });

  it('slug inconnu → null (anti-régression : ne crash pas la fiche sur seed corrompu)', () => {
    expect(getInvocationEntry('invocation-fantome-inexistante')).toBeNull();
  });
});

describe('getKnownInvocationSlugs', () => {
  it('aplatit les invocations connues sur toutes les entrées classes[]', () => {
    const classes: CharacterClassEntry[] = [
      makeClass({ classId: 'warlock', invocations: ['armor-of-shadows', 'eldritch-mind'] }),
      makeClass({ classId: 'fighter', fightingStyle: 'defense' }),
    ];
    const slugs = getKnownInvocationSlugs(classes);
    expect(slugs).toContain('armor-of-shadows');
    expect(slugs).toContain('eldritch-mind');
    expect(slugs).toHaveLength(2);
  });

  it('filtre les slugs inconnus du registre (anti-crash + déduplication)', () => {
    const classes: CharacterClassEntry[] = [
      makeClass({
        classId: 'warlock',
        invocations: ['armor-of-shadows', 'invocation-fantome', 'armor-of-shadows'],
      }),
    ];
    const slugs = getKnownInvocationSlugs(classes);
    expect(slugs).toEqual(['armor-of-shadows']);
  });

  it('aucune classe avec invocation → tableau vide', () => {
    const classes: CharacterClassEntry[] = [makeClass({ classId: 'wizard' })];
    expect(getKnownInvocationSlugs(classes)).toEqual([]);
  });
});

describe('computeInvocationAcBonus', () => {
  it('cat. 4 — Warlock armor-of-shadows + pas d\'armure → +3', () => {
    const bonus = computeInvocationAcBonus({
      classes: [makeClass({ classId: 'warlock', invocations: ['armor-of-shadows'] })],
      hasEquippedBodyArmor: false,
    });
    expect(bonus).toBe(3);
  });

  it('cat. 4 — Warlock armor-of-shadows + armure portée → 0 (Mage Armor veto)', () => {
    const bonus = computeInvocationAcBonus({
      classes: [makeClass({ classId: 'warlock', invocations: ['armor-of-shadows'] })],
      hasEquippedBodyArmor: true,
    });
    expect(bonus).toBe(0);
  });

  it('cat. 6 — Warlock sans armor-of-shadows + pas d\'armure → 0 (registre filtre)', () => {
    const bonus = computeInvocationAcBonus({
      classes: [makeClass({ classId: 'warlock', invocations: ['eldritch-mind'] })],
      hasEquippedBodyArmor: false,
    });
    expect(bonus).toBe(0);
  });

  it('cat. 6 — multi-classe Warlock·armor-of-shadows × Fighter sans armure → +3 (multi-class propagation)', () => {
    const bonus = computeInvocationAcBonus({
      classes: [
        makeClass({ classId: 'fighter', fightingStyle: 'defense' }),
        makeClass({ classId: 'warlock', invocations: ['armor-of-shadows'] }),
      ],
      hasEquippedBodyArmor: false,
    });
    expect(bonus).toBe(3);
  });

  it('cat. 6 — slug dupliqué dans le seed → +3 (pas de double application)', () => {
    const bonus = computeInvocationAcBonus({
      classes: [
        makeClass({
          classId: 'warlock',
          invocations: ['armor-of-shadows', 'armor-of-shadows'],
        }),
      ],
      hasEquippedBodyArmor: false,
    });
    expect(bonus).toBe(3);
  });

  it('cat. 6 — non-Warlock avec eldritchInvocations[] vide → 0 (cas nominal)', () => {
    const bonus = computeInvocationAcBonus({
      classes: [makeClass({ classId: 'wizard' })],
      hasEquippedBodyArmor: false,
    });
    expect(bonus).toBe(0);
  });
});
