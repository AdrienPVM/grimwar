import { describe, expect, it } from 'vitest';

import type { AbilityCode, Character } from '@/shared/types/character';
import type { FeatPrerequisite } from '@/shared/types/content';

import { computeFeatAvailability } from '../feat-availability';

/**
 * Fixture minimale d'un Character pour pure-function testing.
 * Surclasse uniquement les champs utilisés par `computeFeatAvailability`
 * (totalLevel, abilities, spellcastingAbility) — le reste est sentinelle.
 *
 * On ne passe pas par CharacterSchema.parse (le schéma full requiert ~30
 * champs sans rapport avec ce test). Les types Character + AbilityCode sont
 * suffisants pour garantir la cohérence à compile-time.
 */
function makeCharacter(opts: {
  totalLevel: number;
  abilities?: Partial<Record<AbilityCode, number>>;
  spellcastingAbility?: Record<string, 'int' | 'sag' | 'cha' | null>;
}): Character {
  const abilities = {
    for: 10,
    dex: 10,
    con: 10,
    int: 10,
    sag: 10,
    cha: 10,
    ...opts.abilities,
  };
  return {
    totalLevel: opts.totalLevel,
    abilities,
    spellcastingAbility: opts.spellcastingAbility ?? {},
  } as unknown as Character;
}

describe('computeFeatAvailability', () => {
  describe('zéro prérequis', () => {
    it('available=true quand prerequisites est undefined', () => {
      const fighter = makeCharacter({ totalLevel: 4 });
      const result = computeFeatAvailability(fighter, undefined);
      expect(result.available).toBe(true);
      expect(result.unmetPrerequisites).toEqual([]);
    });

    it('available=true quand prerequisites est []', () => {
      const fighter = makeCharacter({ totalLevel: 4 });
      const result = computeFeatAvailability(fighter, []);
      expect(result.available).toBe(true);
      expect(result.unmetPrerequisites).toEqual([]);
    });
  });

  describe("prérequis character-level (ASI L4)", () => {
    const asi: FeatPrerequisite[] = [{ kind: 'character-level', minimum: 4 }];

    it("rouge : Fighter L3 ne peut PAS prendre l'ASI", () => {
      const fighter = makeCharacter({ totalLevel: 3 });
      const result = computeFeatAvailability(fighter, asi);
      expect(result.available).toBe(false);
      expect(result.unmetPrerequisites).toEqual(asi);
    });

    it("vert : Fighter L4 peut prendre l'ASI", () => {
      const fighter = makeCharacter({ totalLevel: 4 });
      const result = computeFeatAvailability(fighter, asi);
      expect(result.available).toBe(true);
      expect(result.unmetPrerequisites).toEqual([]);
    });

    it('vert : Fighter L19 peut prendre un feat Level 19+', () => {
      const fighter = makeCharacter({ totalLevel: 19 });
      const result = computeFeatAvailability(fighter, [
        { kind: 'character-level', minimum: 19 },
      ]);
      expect(result.available).toBe(true);
    });
  });

  describe('prérequis ability-score (Lutteur FOR 13)', () => {
    const forThirteen: FeatPrerequisite[] = [
      { kind: 'ability-score', ability: 'for', minimum: 13 },
    ];

    it('rouge : perso FOR 12 ne satisfait pas FOR 13', () => {
      const wizard = makeCharacter({ totalLevel: 4, abilities: { for: 12 } });
      const result = computeFeatAvailability(wizard, forThirteen);
      expect(result.available).toBe(false);
      expect(result.unmetPrerequisites).toEqual(forThirteen);
    });

    it('vert : perso FOR 13 satisfait FOR 13 (borne exacte)', () => {
      const fighter = makeCharacter({ totalLevel: 4, abilities: { for: 13 } });
      const result = computeFeatAvailability(fighter, forThirteen);
      expect(result.available).toBe(true);
    });
  });

  describe('prérequis spellcasting (Boon of Spell Recall)', () => {
    const spell: FeatPrerequisite[] = [{ kind: 'spellcasting' }];

    it('rouge : Fighter L19 sans spellcasting bloqué', () => {
      const fighter = makeCharacter({
        totalLevel: 19,
        spellcastingAbility: { fighter: null },
      });
      const result = computeFeatAvailability(fighter, spell);
      expect(result.available).toBe(false);
      expect(result.unmetPrerequisites).toEqual(spell);
    });

    it('vert : Wizard L19 avec spellcasting passe', () => {
      const wizard = makeCharacter({
        totalLevel: 19,
        spellcastingAbility: { wizard: 'int' },
      });
      const result = computeFeatAvailability(wizard, spell);
      expect(result.available).toBe(true);
    });

    it("vert : multi-classe Fighter/Wizard L19 — un seul caster suffit", () => {
      const fighterWizard = makeCharacter({
        totalLevel: 19,
        spellcastingAbility: { fighter: null, wizard: 'int' },
      });
      const result = computeFeatAvailability(fighterWizard, spell);
      expect(result.available).toBe(true);
    });

    it('rouge : spellcastingAbility vide (perso pré-init) bloqué', () => {
      const blank = makeCharacter({ totalLevel: 19, spellcastingAbility: {} });
      const result = computeFeatAvailability(blank, spell);
      expect(result.available).toBe(false);
    });
  });

  describe('AND strict combinatoire (Lutteur = Level 4+ AND FOR 13+)', () => {
    const lutteur: FeatPrerequisite[] = [
      { kind: 'character-level', minimum: 4 },
      { kind: 'ability-score', ability: 'for', minimum: 13 },
    ];

    it('rouge : L3 + FOR 15 → level fail (FOR satisfait, mais level non)', () => {
      const c = makeCharacter({ totalLevel: 3, abilities: { for: 15 } });
      const result = computeFeatAvailability(c, lutteur);
      expect(result.available).toBe(false);
      expect(result.unmetPrerequisites).toEqual([
        { kind: 'character-level', minimum: 4 },
      ]);
    });

    it('rouge : L4 + FOR 12 → ability fail (level satisfait, mais FOR non)', () => {
      const c = makeCharacter({ totalLevel: 4, abilities: { for: 12 } });
      const result = computeFeatAvailability(c, lutteur);
      expect(result.available).toBe(false);
      expect(result.unmetPrerequisites).toEqual([
        { kind: 'ability-score', ability: 'for', minimum: 13 },
      ]);
    });

    it('rouge : L3 + FOR 10 → les DEUX fail (unmetPrerequisites contient les 2)', () => {
      const c = makeCharacter({ totalLevel: 3, abilities: { for: 10 } });
      const result = computeFeatAvailability(c, lutteur);
      expect(result.available).toBe(false);
      expect(result.unmetPrerequisites).toEqual(lutteur);
    });

    it('vert : L4 + FOR 13 → AND satisfait', () => {
      const c = makeCharacter({ totalLevel: 4, abilities: { for: 13 } });
      const result = computeFeatAvailability(c, lutteur);
      expect(result.available).toBe(true);
    });
  });

  describe('class-feature (placeholder JALON 3)', () => {
    it('rouge conservateur : aucun feat SRD ne déclenche, mais le kind est bloqué par défaut', () => {
      const c = makeCharacter({ totalLevel: 4 });
      const prereq: FeatPrerequisite[] = [
        { kind: 'class-feature', featureNameEn: 'Fighting Style' },
      ];
      const result = computeFeatAvailability(c, prereq);
      expect(result.available).toBe(false);
      expect(result.unmetPrerequisites).toEqual(prereq);
    });
  });
});
