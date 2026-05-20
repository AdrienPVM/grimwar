import { describe, expect, it } from 'vitest';

import {
  pointBuyValid,
  REFERENCE_BUILDS,
  standardArrayValid,
} from '../builds';

/**
 * Garde-fou (plan 05 §G.1).
 *
 * Pour chaque classe : le tuple `pointBuy` doit consommer exactement 27 points,
 * et le tuple `standardArray` doit être une permutation de [15, 14, 13, 12, 10, 8].
 *
 * Une régression sur l'un des 12 builds = la triple gate échoue.
 */
describe('reference builds', () => {
  // Cohérence interne du registre : chaque clé == son `classId`. La COUVERTURE
  // « registre ≡ bundle » (une 13ᵉ classe du bundle doit avoir un build) n'est
  // PLUS testée ici : l'ancienne liste de 12 ids codée en dur n'échouait pas sur
  // dérive (elle vérifiait la présence, jamais l'égalité). Elle est remplacée par
  // le garde-fou d'axe bundle-derivé de `tests/wizard-matrix/matrix.test.ts`
  // (« classes : clés REFERENCE_BUILDS ≡ ids classes.json »), qui échoue dur.
  it('clé ≡ classId pour chaque build (cohérence du registre)', () => {
    for (const [id, build] of Object.entries(REFERENCE_BUILDS)) {
      expect(build.classId).toBe(id);
    }
  });

  it.each(Object.entries(REFERENCE_BUILDS))(
    '%s : pointBuy somme à 27 et chaque valeur ∈ [8, 15]',
    (_id, build) => {
      expect(pointBuyValid(build)).toBe(true);
      for (const v of build.pointBuy) {
        expect(v).toBeGreaterThanOrEqual(8);
        expect(v).toBeLessThanOrEqual(15);
      }
    },
  );

  it.each(Object.entries(REFERENCE_BUILDS))(
    '%s : standardArray est une permutation de [15,14,13,12,10,8]',
    (_id, build) => {
      expect(standardArrayValid(build)).toBe(true);
    },
  );

  it.each(Object.entries(REFERENCE_BUILDS))(
    '%s : preferredSkills, cantrips et level1 sont en kebab-case',
    (_id, build) => {
      const kebab = /^[a-z0-9-]+$/;
      for (const s of build.preferredSkills) expect(s).toMatch(kebab);
      for (const s of build.preferredCantrips) expect(s).toMatch(kebab);
      for (const s of build.preferredLevel1Spells) expect(s).toMatch(kebab);
    },
  );
});
