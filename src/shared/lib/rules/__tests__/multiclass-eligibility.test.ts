import { describe, expect, it } from 'vitest';

import type { Character } from '@/shared/types/character';
import type { MulticlassPrerequisite } from '@/shared/types/content';

import { computeMulticlassEligibility } from '../multiclass-eligibility';

/**
 * JALON 2D.3 — TDD pour `computeMulticlassEligibility`.
 *
 * Couvre :
 *   - prerequisite `null` / `undefined` → toujours éligible (custom-content)
 *   - combinator `and` (Paladin FOR 13 ET CHA 13) avec 0/1/2 scores manquants
 *   - combinator `or` (Guerrier FOR 13 OU DEX 13) avec 0/1/2 scores manquants
 *   - cas simple (Druide SAG 13) — combinator `and` avec 1 seul score
 *   - shape du retour : `eligible` boolean + `unmetScores[]` avec `actual`
 *     pour rendu tooltip côté UI (économise un re-read côté FeatPicker)
 *
 * Source SRD 2024 (vérifiée 2D.2 dans `tests/srd-counters.test.ts`).
 */

function makeCharacter(abilities: Partial<Character['abilities']>): Character {
  return {
    abilities: {
      for: 10,
      dex: 10,
      con: 10,
      int: 10,
      sag: 10,
      cha: 10,
      ...abilities,
    },
    // Le helper ne lit QUE `abilities` — le reste est rempli en minimal pour le type.
  } as Character;
}

const PALADIN_PREREQ: MulticlassPrerequisite = {
  combinator: 'and',
  scores: [
    { ability: 'for', minimum: 13 },
    { ability: 'cha', minimum: 13 },
  ],
};

const FIGHTER_PREREQ: MulticlassPrerequisite = {
  combinator: 'or',
  scores: [
    { ability: 'for', minimum: 13 },
    { ability: 'dex', minimum: 13 },
  ],
};

const DRUID_PREREQ: MulticlassPrerequisite = {
  combinator: 'and',
  scores: [{ ability: 'sag', minimum: 13 }],
};

describe('computeMulticlassEligibility', () => {
  describe('prerequisite absent', () => {
    it('retourne eligible quand prerequisite est null (custom-content sans prereq)', () => {
      const character = makeCharacter({ for: 8 });
      const result = computeMulticlassEligibility(character, null);
      expect(result).toEqual({ eligible: true, unmetScores: [] });
    });

    it('retourne eligible quand prerequisite est undefined (fixture legacy)', () => {
      const character = makeCharacter({ for: 8 });
      const result = computeMulticlassEligibility(character, undefined);
      expect(result).toEqual({ eligible: true, unmetScores: [] });
    });
  });

  describe('combinator AND (Paladin : FOR 13 ET CHA 13)', () => {
    it('eligible quand FOR=13 ET CHA=13', () => {
      const character = makeCharacter({ for: 13, cha: 13 });
      const result = computeMulticlassEligibility(character, PALADIN_PREREQ);
      expect(result.eligible).toBe(true);
      expect(result.unmetScores).toEqual([]);
    });

    it('eligible quand FOR=18 ET CHA=14 (overshoot)', () => {
      const character = makeCharacter({ for: 18, cha: 14 });
      const result = computeMulticlassEligibility(character, PALADIN_PREREQ);
      expect(result.eligible).toBe(true);
    });

    it('NOT eligible quand FOR=12 (seul échec)', () => {
      const character = makeCharacter({ for: 12, cha: 14 });
      const result = computeMulticlassEligibility(character, PALADIN_PREREQ);
      expect(result.eligible).toBe(false);
      expect(result.unmetScores).toEqual([{ ability: 'for', minimum: 13, actual: 12 }]);
    });

    it('NOT eligible quand FOR=10 ET CHA=10 (deux échecs, list complète)', () => {
      const character = makeCharacter({ for: 10, cha: 10 });
      const result = computeMulticlassEligibility(character, PALADIN_PREREQ);
      expect(result.eligible).toBe(false);
      expect(result.unmetScores).toEqual([
        { ability: 'for', minimum: 13, actual: 10 },
        { ability: 'cha', minimum: 13, actual: 10 },
      ]);
    });
  });

  describe('combinator OR (Guerrier : FOR 13 OU DEX 13)', () => {
    it('eligible quand FOR=13 seul (DEX trop bas)', () => {
      const character = makeCharacter({ for: 13, dex: 10 });
      const result = computeMulticlassEligibility(character, FIGHTER_PREREQ);
      expect(result.eligible).toBe(true);
      expect(result.unmetScores).toEqual([]);
    });

    it('eligible quand DEX=13 seul (FOR trop bas)', () => {
      const character = makeCharacter({ for: 10, dex: 13 });
      const result = computeMulticlassEligibility(character, FIGHTER_PREREQ);
      expect(result.eligible).toBe(true);
      expect(result.unmetScores).toEqual([]);
    });

    it('eligible quand FOR=18 ET DEX=18 (deux suffisent)', () => {
      const character = makeCharacter({ for: 18, dex: 18 });
      const result = computeMulticlassEligibility(character, FIGHTER_PREREQ);
      expect(result.eligible).toBe(true);
    });

    it('NOT eligible quand FOR=10 ET DEX=10 (les deux échouent)', () => {
      const character = makeCharacter({ for: 10, dex: 10 });
      const result = computeMulticlassEligibility(character, FIGHTER_PREREQ);
      expect(result.eligible).toBe(false);
      // Sur OR refusé, on liste TOUS les scores pour que la tooltip explique
      // l'option offerte (« il faut FOR 13 OU DEX 13 »).
      expect(result.unmetScores).toEqual([
        { ability: 'for', minimum: 13, actual: 10 },
        { ability: 'dex', minimum: 13, actual: 10 },
      ]);
    });
  });

  describe('cas simple (Druide SAG 13)', () => {
    it('eligible quand SAG=13', () => {
      const character = makeCharacter({ sag: 13 });
      const result = computeMulticlassEligibility(character, DRUID_PREREQ);
      expect(result.eligible).toBe(true);
    });

    it('NOT eligible quand SAG=12', () => {
      const character = makeCharacter({ sag: 12 });
      const result = computeMulticlassEligibility(character, DRUID_PREREQ);
      expect(result.eligible).toBe(false);
      expect(result.unmetScores).toEqual([{ ability: 'sag', minimum: 13, actual: 12 }]);
    });
  });

  describe('shape de retour', () => {
    it('unmetScores inclut toujours `actual` pour le rendu tooltip', () => {
      const character = makeCharacter({ for: 8 });
      const result = computeMulticlassEligibility(character, {
        combinator: 'and',
        scores: [{ ability: 'for', minimum: 13 }],
      });
      expect(result.unmetScores[0]).toHaveProperty('actual', 8);
      expect(result.unmetScores[0]).toHaveProperty('minimum', 13);
      expect(result.unmetScores[0]).toHaveProperty('ability', 'for');
    });
  });
});
