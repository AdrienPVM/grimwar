import { describe, expect, it } from 'vitest';

import type { CharacterClassEntry, FightingStyle } from '@/shared/types/character';

import {
  computeInvocationAcBonus,
  getInvocationEntry,
  getKnownInvocationSlugs,
  hasConcentrationAdvantage,
  hasPactOfTheBlade,
  hasPactOfTheChain,
  hasPactOfTheTome,
} from '../eldritch-invocations';

/**
 * D13a + D13b + D13c — Armor of Shadows + Eldritch Mind + Pact of the Blade.
 * Tests du registre + des helpers de dérivation (AC bonus + concentration
 * advantage + pact-of-the-blade feature). Couvre :
 *  - cat. 3 (fidélité bundle / registre) : les 5 slugs L1 connus du registre.
 *  - cat. 4 (calcul de règle) : Mage Armor +3 SSI pas d'armure portée ;
 *    `hasConcentrationAdvantage` retourne `true` SSI Eldritch Mind présent ;
 *    `hasPactOfTheBlade` retourne `true` SSI Pact of the Blade présent.
 *  - cat. 6 (intersections) : bouclier seul ne veto pas l'AC ; multi-classe
 *    (Warlock × Fighter) propage les bonus ; slug dupliqué = 1 bonus ;
 *    chaque effet est ORTHOGONAL aux autres (Eldritch Mind n'affecte ni
 *    l'AC ni la feature Blade, etc.).
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

  it('eldritch-mind a un effet passive-concentration-advantage avec target=concentration-save', () => {
    const entry = getInvocationEntry('eldritch-mind');
    expect(entry).not.toBeNull();
    expect(entry?.effect?.kind).toBe('passive-concentration-advantage');
    if (entry?.effect?.kind === 'passive-concentration-advantage') {
      expect(entry.effect.target).toBe('concentration-save');
    }
  });

  it('pact-of-the-blade a un effet feature-pact-weapon (Cha + simple/martial melee + 4 types de dégâts)', () => {
    const entry = getInvocationEntry('pact-of-the-blade');
    expect(entry).not.toBeNull();
    expect(entry?.effect?.kind).toBe('feature-pact-weapon');
    if (entry?.effect?.kind === 'feature-pact-weapon') {
      expect(entry.effect.attackAbility).toBe('cha');
      expect(entry.effect.bondedWeaponCategories).toEqual([
        'simple-melee',
        'martial-melee',
      ]);
      expect(entry.effect.damageTypeChoices).toEqual([
        'necrotic',
        'psychic',
        'radiant',
        'normal',
      ]);
      expect(entry.effect.actionType).toBe('bonus-action');
    }
  });

  it('pact-of-the-chain a un effet feature-pact-chain-familiar (Find Familiar gratuit + 7 formes spéciales SRD)', () => {
    const entry = getInvocationEntry('pact-of-the-chain');
    expect(entry).not.toBeNull();
    expect(entry?.effect?.kind).toBe('feature-pact-chain-familiar');
    if (entry?.effect?.kind === 'feature-pact-chain-familiar') {
      expect(entry.effect.grantedSpellId).toBe('find-familiar');
      // D13d-followup-summary résolu 2026-05-28 : 7 formes SRD 5.2.1
      // (slugs EN-normalisés du registre).
      expect(entry.effect.specialForms).toEqual([
        'imp',
        'pseudodragon',
        'quasit',
        'skeleton',
        'sphinx-of-wonder',
        'sprite',
        'venomous-snake',
      ]);
      expect(entry.effect.actionType).toBe('magic-action');
      expect(entry.effect.noSlotRequired).toBe(true);
    }
  });

  it('pact-of-the-tome a un effet feature-pact-tome-grant (3 cantrips + 2 rituels L1 + focus)', () => {
    const entry = getInvocationEntry('pact-of-the-tome');
    expect(entry).not.toBeNull();
    expect(entry?.effect?.kind).toBe('feature-pact-tome-grant');
    if (entry?.effect?.kind === 'feature-pact-tome-grant') {
      expect(entry.effect.cantripsGranted).toBe(3);
      expect(entry.effect.ritualsGranted).toBe(2);
      expect(entry.effect.ritualSpellLevel).toBe(1);
      expect(entry.effect.spellSource).toBe('any-class');
      expect(entry.effect.providesSpellcastingFocus).toBe(true);
    }
  });

  it('séquence D13a-e CLOSE — chacun des 5 slugs L1 a un effet câblé non-null', () => {
    const l1Slugs = [
      'armor-of-shadows',
      'eldritch-mind',
      'pact-of-the-blade',
      'pact-of-the-chain',
      'pact-of-the-tome',
    ];
    for (const slug of l1Slugs) {
      const entry = getInvocationEntry(slug);
      expect(entry?.effect, `${slug} doit avoir un effet câblé (séquence D13a-e close)`).not.toBeNull();
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

  it('cat. 6 — Warlock eldritch-mind seul → 0 AC (orthogonal à AC)', () => {
    const bonus = computeInvocationAcBonus({
      classes: [makeClass({ classId: 'warlock', invocations: ['eldritch-mind'] })],
      hasEquippedBodyArmor: false,
    });
    expect(bonus).toBe(0);
  });
});

describe('hasConcentrationAdvantage', () => {
  it('cat. 4 — Warlock eldritch-mind → true', () => {
    const result = hasConcentrationAdvantage([
      makeClass({ classId: 'warlock', invocations: ['eldritch-mind'] }),
    ]);
    expect(result).toBe(true);
  });

  it('cat. 4 — Warlock sans eldritch-mind → false', () => {
    const result = hasConcentrationAdvantage([
      makeClass({ classId: 'warlock', invocations: ['armor-of-shadows'] }),
    ]);
    expect(result).toBe(false);
  });

  it('cat. 6 — non-Warlock (Wizard pure) → false (registre filtre)', () => {
    const result = hasConcentrationAdvantage([makeClass({ classId: 'wizard' })]);
    expect(result).toBe(false);
  });

  it('cat. 6 — multi-classe Warlock·eldritch-mind × Fighter → true', () => {
    const result = hasConcentrationAdvantage([
      makeClass({ classId: 'fighter', fightingStyle: 'defense' }),
      makeClass({ classId: 'warlock', invocations: ['eldritch-mind'] }),
    ]);
    expect(result).toBe(true);
  });

  it('cat. 6 — slug dupliqué → toujours true (booléen, pas de cumul)', () => {
    const result = hasConcentrationAdvantage([
      makeClass({
        classId: 'warlock',
        invocations: ['eldritch-mind', 'eldritch-mind'],
      }),
    ]);
    expect(result).toBe(true);
  });

  it('cat. 6 — Warlock armor-of-shadows seul → false (orthogonal à Concentration)', () => {
    const result = hasConcentrationAdvantage([
      makeClass({ classId: 'warlock', invocations: ['armor-of-shadows'] }),
    ]);
    expect(result).toBe(false);
  });

  it('cat. 6 — slug inconnu → false (anti-crash + ignoré)', () => {
    const result = hasConcentrationAdvantage([
      makeClass({ classId: 'warlock', invocations: ['invocation-fantome'] }),
    ]);
    expect(result).toBe(false);
  });
});

describe('hasPactOfTheBlade', () => {
  it('cat. 4 — Warlock pact-of-the-blade → true', () => {
    const result = hasPactOfTheBlade([
      makeClass({ classId: 'warlock', invocations: ['pact-of-the-blade'] }),
    ]);
    expect(result).toBe(true);
  });

  it('cat. 4 — Warlock sans pact-of-the-blade → false', () => {
    const result = hasPactOfTheBlade([
      makeClass({ classId: 'warlock', invocations: ['armor-of-shadows'] }),
    ]);
    expect(result).toBe(false);
  });

  it('cat. 6 — non-Warlock (Wizard pure) → false (registre filtre)', () => {
    const result = hasPactOfTheBlade([makeClass({ classId: 'wizard' })]);
    expect(result).toBe(false);
  });

  it('cat. 6 — multi-classe Warlock·pact-of-the-blade × Fighter → true', () => {
    const result = hasPactOfTheBlade([
      makeClass({ classId: 'fighter', fightingStyle: 'defense' }),
      makeClass({ classId: 'warlock', invocations: ['pact-of-the-blade'] }),
    ]);
    expect(result).toBe(true);
  });

  it('cat. 6 — Warlock eldritch-mind + armor-of-shadows seuls → false (orthogonal)', () => {
    const result = hasPactOfTheBlade([
      makeClass({
        classId: 'warlock',
        invocations: ['eldritch-mind', 'armor-of-shadows'],
      }),
    ]);
    expect(result).toBe(false);
  });

  it('cat. 6 — slug inconnu → false (anti-crash + ignoré)', () => {
    const result = hasPactOfTheBlade([
      makeClass({ classId: 'warlock', invocations: ['invocation-fantome'] }),
    ]);
    expect(result).toBe(false);
  });
});

describe('hasPactOfTheChain', () => {
  it('cat. 4 — Warlock pact-of-the-chain → true', () => {
    const result = hasPactOfTheChain([
      makeClass({ classId: 'warlock', invocations: ['pact-of-the-chain'] }),
    ]);
    expect(result).toBe(true);
  });

  it('cat. 4 — Warlock sans pact-of-the-chain → false', () => {
    const result = hasPactOfTheChain([
      makeClass({ classId: 'warlock', invocations: ['pact-of-the-blade'] }),
    ]);
    expect(result).toBe(false);
  });

  it('cat. 6 — non-Warlock → false', () => {
    const result = hasPactOfTheChain([makeClass({ classId: 'wizard' })]);
    expect(result).toBe(false);
  });

  it('cat. 6 — multi-classe Warlock·pact-of-the-chain × Fighter → true', () => {
    const result = hasPactOfTheChain([
      makeClass({ classId: 'fighter', fightingStyle: 'defense' }),
      makeClass({ classId: 'warlock', invocations: ['pact-of-the-chain'] }),
    ]);
    expect(result).toBe(true);
  });

  it('cat. 6 — slug inconnu → false (anti-crash)', () => {
    const result = hasPactOfTheChain([
      makeClass({ classId: 'warlock', invocations: ['invocation-fantome'] }),
    ]);
    expect(result).toBe(false);
  });
});

describe('hasPactOfTheTome', () => {
  it('cat. 4 — Warlock pact-of-the-tome → true', () => {
    const result = hasPactOfTheTome([
      makeClass({ classId: 'warlock', invocations: ['pact-of-the-tome'] }),
    ]);
    expect(result).toBe(true);
  });

  it('cat. 4 — Warlock sans pact-of-the-tome → false', () => {
    const result = hasPactOfTheTome([
      makeClass({ classId: 'warlock', invocations: ['pact-of-the-blade'] }),
    ]);
    expect(result).toBe(false);
  });

  it('cat. 6 — non-Warlock → false', () => {
    const result = hasPactOfTheTome([makeClass({ classId: 'wizard' })]);
    expect(result).toBe(false);
  });

  it('cat. 6 — multi-classe Warlock·pact-of-the-tome × Fighter → true', () => {
    const result = hasPactOfTheTome([
      makeClass({ classId: 'fighter', fightingStyle: 'defense' }),
      makeClass({ classId: 'warlock', invocations: ['pact-of-the-tome'] }),
    ]);
    expect(result).toBe(true);
  });

  it('cat. 6 — slug inconnu → false (anti-crash)', () => {
    const result = hasPactOfTheTome([
      makeClass({ classId: 'warlock', invocations: ['invocation-fantome'] }),
    ]);
    expect(result).toBe(false);
  });
});

describe('orthogonalité des effets (cat. 6 — intersections)', () => {
  // Quintuple combo Warlock idéal pour D13a+b+c+d+e — vérifie qu'aucun
  // effet ne pollue les autres helpers (séquence D13a-e CLOSE).
  it('Warlock avec les 5 invocations câblées → +3 AC, advantage concentration, 3 pacts détectés', () => {
    const classes = [
      makeClass({
        classId: 'warlock',
        invocations: [
          'armor-of-shadows',
          'eldritch-mind',
          'pact-of-the-blade',
          'pact-of-the-chain',
          'pact-of-the-tome',
        ],
      }),
    ];
    expect(
      computeInvocationAcBonus({ classes, hasEquippedBodyArmor: false }),
    ).toBe(3);
    expect(hasConcentrationAdvantage(classes)).toBe(true);
    expect(hasPactOfTheBlade(classes)).toBe(true);
    expect(hasPactOfTheChain(classes)).toBe(true);
    expect(hasPactOfTheTome(classes)).toBe(true);
  });

  it('Pact of the Blade ne contribue pas au bonus AC', () => {
    const classes = [
      makeClass({ classId: 'warlock', invocations: ['pact-of-the-blade'] }),
    ];
    expect(
      computeInvocationAcBonus({ classes, hasEquippedBodyArmor: false }),
    ).toBe(0);
  });

  it('Pact of the Blade ne contribue pas à l\'avantage Concentration', () => {
    const classes = [
      makeClass({ classId: 'warlock', invocations: ['pact-of-the-blade'] }),
    ];
    expect(hasConcentrationAdvantage(classes)).toBe(false);
  });

  it('Pact of the Chain ne contribue ni à l\'AC, ni à la Concentration, ni à la feature Blade', () => {
    const classes = [
      makeClass({ classId: 'warlock', invocations: ['pact-of-the-chain'] }),
    ];
    expect(
      computeInvocationAcBonus({ classes, hasEquippedBodyArmor: false }),
    ).toBe(0);
    expect(hasConcentrationAdvantage(classes)).toBe(false);
    expect(hasPactOfTheBlade(classes)).toBe(false);
  });

  it('Pact of the Tome ne contribue ni à l\'AC, ni à la Concentration, ni aux features Blade/Chain', () => {
    const classes = [
      makeClass({ classId: 'warlock', invocations: ['pact-of-the-tome'] }),
    ];
    expect(
      computeInvocationAcBonus({ classes, hasEquippedBodyArmor: false }),
    ).toBe(0);
    expect(hasConcentrationAdvantage(classes)).toBe(false);
    expect(hasPactOfTheBlade(classes)).toBe(false);
    expect(hasPactOfTheChain(classes)).toBe(false);
  });
});
