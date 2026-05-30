import { describe, expect, it } from 'vitest';

import {
  asiChoiceSchema,
  levelUpDraftSchema,
} from '../level-up-types';

/**
 * JALON 2C.1 — Durcissement Zod du brouillon ASI.
 *
 * Le SRD 5.2.1 dit : « When you reach 4th level… you can increase one ability
 * score by 2, or you can increase two ability scores by 1 each. » — donc la
 * somme des bonus est TOUJOURS 2, jamais 1, jamais 3.
 *
 * Avant 2C.1 : `abilityIncreases.min(1).max(2)` + `bonus: 1 | 2` autorisait
 * des shapes invalides comme `[{ability:'for', bonus:1}]` (sum=1) ou
 * `[{ability:'for', bonus:2}, {ability:'dex', bonus:2}]` (sum=4). Ces
 * brouillons passaient Zod et étaient rejetés tardivement par `applyLevelUp`
 * (« stat dépasse 20 » au pire, ou silencieusement appliqués au mieux).
 *
 * 2C.1 ajoute une `superRefine` qui rejette tout shape dont la somme ≠ 2,
 * et tout split sur la même caractéristique deux fois (le SRD parle de DEUX
 * caractéristiques différentes pour le split).
 *
 * Red-before-green vérifié : tests rouges contre le schéma actuel, verts
 * après ajout de la `superRefine`.
 */

describe('asiChoiceSchema — durcissement somme=2 (JALON 2C.1)', () => {
  it('accepte +2 sur une caractéristique', () => {
    const result = asiChoiceSchema.safeParse({
      kind: 'asi',
      abilityIncreases: [{ ability: 'for', bonus: 2 }],
    });
    expect(result.success).toBe(true);
  });

  it('accepte +1 sur deux caractéristiques distinctes', () => {
    const result = asiChoiceSchema.safeParse({
      kind: 'asi',
      abilityIncreases: [
        { ability: 'for', bonus: 1 },
        { ability: 'dex', bonus: 1 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('REJETTE sum=1 (un seul +1)', () => {
    const result = asiChoiceSchema.safeParse({
      kind: 'asi',
      abilityIncreases: [{ ability: 'for', bonus: 1 }],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(JSON.stringify(result.error.errors)).toMatch(/somme.*2/i);
    }
  });

  it('REJETTE sum=4 (deux +2)', () => {
    const result = asiChoiceSchema.safeParse({
      kind: 'asi',
      abilityIncreases: [
        { ability: 'for', bonus: 2 },
        { ability: 'dex', bonus: 2 },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('REJETTE +1/+1 sur la MÊME caractéristique', () => {
    const result = asiChoiceSchema.safeParse({
      kind: 'asi',
      abilityIncreases: [
        { ability: 'for', bonus: 1 },
        { ability: 'for', bonus: 1 },
      ],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(JSON.stringify(result.error.errors)).toMatch(/distinct/i);
    }
  });

  it('REJETTE +2 + +1 (mélange invalide qui sommerait à 3)', () => {
    const result = asiChoiceSchema.safeParse({
      kind: 'asi',
      abilityIncreases: [
        { ability: 'for', bonus: 2 },
        { ability: 'dex', bonus: 1 },
      ],
    });
    expect(result.success).toBe(false);
  });
});

describe('levelUpDraftSchema — propagation 2C.1', () => {
  it('rejette un draft avec asiOrFeat={kind:asi, sum=1}', () => {
    const result = levelUpDraftSchema.safeParse({
      classId: 'fighter',
      newClassLevel: 4,
      hpRoll: { kind: 'average' },
      asiOrFeat: {
        kind: 'asi',
        abilityIncreases: [{ ability: 'for', bonus: 1 }],
      },
    });
    expect(result.success).toBe(false);
  });

  it('accepte un draft ASI valide complet', () => {
    const result = levelUpDraftSchema.safeParse({
      classId: 'fighter',
      newClassLevel: 4,
      hpRoll: { kind: 'average' },
      asiOrFeat: {
        kind: 'asi',
        abilityIncreases: [
          { ability: 'for', bonus: 1 },
          { ability: 'con', bonus: 1 },
        ],
      },
    });
    expect(result.success).toBe(true);
  });
});
