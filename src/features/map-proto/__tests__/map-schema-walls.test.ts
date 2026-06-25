import { describe, expect, it } from 'vitest';

import { mapMetaSchema, wallPolylineSchema } from '@/shared/types/map';

/**
 * Garde-fou de rétrocompatibilité : l'ajout de `walls` / `losEnabled` est
 * ADDITIF et OPTIONNEL — une carte créée avant cette capacité (sans ces champs)
 * doit toujours parser, sans bump de `schemaVersion`.
 */

const legacyMap = {
  id: 'donjon-legacy',
  name: 'Donjon hérité',
  imageUrl: null,
  gridSize: 70,
  feetPerSquare: 5,
  showGrid: true,
  fogEnabled: true,
  lightingEnabled: true,
  fogPolygons: [],
  lightSources: [],
  aoeTemplates: [],
  schemaVersion: 1 as const,
  createdAt: null,
  updatedAt: null,
  updatedBy: 'uid-1',
};

describe('mapMetaSchema — rétrocompat walls/losEnabled', () => {
  it('parse une carte héritée sans walls ni losEnabled', () => {
    const parsed = mapMetaSchema.parse(legacyMap);
    expect(parsed.walls).toBeUndefined();
    expect(parsed.losEnabled).toBeUndefined();
  });

  it('parse une carte avec walls + losEnabled', () => {
    const parsed = mapMetaSchema.parse({
      ...legacyMap,
      walls: [{ id: 'wall-0', points: [{ x: 0, y: 0 }, { x: 10, y: 0 }] }],
      losEnabled: true,
    });
    expect(parsed.walls).toHaveLength(1);
    expect(parsed.losEnabled).toBe(true);
  });
});

describe('wallPolylineSchema', () => {
  it('exige au moins 2 points', () => {
    expect(
      wallPolylineSchema.safeParse({ id: 'w', points: [{ x: 0, y: 0 }] }).success,
    ).toBe(false);
  });

  it('accepte une polyligne ≥ 2 points', () => {
    expect(
      wallPolylineSchema.safeParse({
        id: 'w',
        points: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
      }).success,
    ).toBe(true);
  });
});
