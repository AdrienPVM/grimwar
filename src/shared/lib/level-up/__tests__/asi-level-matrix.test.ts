import { describe, expect, it } from 'vitest';

import classesBundle from '../../../../../public/data/classes.json';
import type { CharacterClassEntry } from '@/shared/types/character';
import { ClassSchema, type ClassEntity } from '@/shared/types/content';

import { levelUpChoices } from '../level-up-choices';

/**
 * JALON 2C.2 — Matrice ASI : `levelUpChoices` doit déclencher l'étape
 * `asi-or-feat` aux niveaux corrects pour chacune des 12 classes SRD 5.2.1.
 *
 * Standard SRD : L4, L8, L12, L16, L19 pour TOUTES les classes (5 ASIs).
 * Exceptions :
 *  - Fighter : +1 ASI à L6 et L14 (7 ASIs total).
 *  - Rogue   : +1 ASI à L10 (6 ASIs total).
 *
 * Cette matrice est l'invariant qu'on veut garder : si un bundle régresse
 * (suppression d'une feature ASI L16, typo en nom EN/FR), le test rougit.
 *
 * Source de vérité : `public/data/classes.json` (SRD CC 5.2.1, déjà figé via
 * `srd-counters.test.ts > Hardening D`). On charge le bundle direct comme
 * dans les tests d'intégrité disque — le runtime cache (Dexie) est tracé
 * par `content-loader-cache-reparse.test.ts` séparément.
 */

const CLASSES = (classesBundle as unknown[]).map((c) => ClassSchema.parse(c));

interface AsiCase {
  classId: string;
  expectedAsiLevels: readonly number[];
}

const ASI_MATRIX: readonly AsiCase[] = [
  { classId: 'barbarian', expectedAsiLevels: [4, 8, 12, 16, 19] },
  { classId: 'bard', expectedAsiLevels: [4, 8, 12, 16, 19] },
  { classId: 'cleric', expectedAsiLevels: [4, 8, 12, 16, 19] },
  { classId: 'druid', expectedAsiLevels: [4, 8, 12, 16, 19] },
  { classId: 'fighter', expectedAsiLevels: [4, 6, 8, 12, 14, 16, 19] },
  { classId: 'monk', expectedAsiLevels: [4, 8, 12, 16, 19] },
  { classId: 'paladin', expectedAsiLevels: [4, 8, 12, 16, 19] },
  { classId: 'ranger', expectedAsiLevels: [4, 8, 12, 16, 19] },
  { classId: 'rogue', expectedAsiLevels: [4, 8, 10, 12, 16, 19] },
  { classId: 'sorcerer', expectedAsiLevels: [4, 8, 12, 16, 19] },
  { classId: 'warlock', expectedAsiLevels: [4, 8, 12, 16, 19] },
  { classId: 'wizard', expectedAsiLevels: [4, 8, 12, 16, 19] },
];

function findDef(classId: string): ClassEntity {
  const def = CLASSES.find((c) => c.id === classId);
  if (!def) throw new Error(`[asi-matrix] class "${classId}" absente du bundle`);
  return def;
}

function makeEntry(classId: string, level: number): CharacterClassEntry {
  return {
    classId,
    subclassId: level >= 3 ? 'fake-sub' : null,
    level,
    clericDivineOrder: null,
    druidPrimalOrder: null,
    fighterFightingStyle: null,
    weaponMasteries: [],
    expertiseSkills: [],
    eldritchInvocations: [],
    wizardSpellbookL1: [],
  };
}

describe('matrice ASI 12 classes × niveaux SRD 5.2.1 (JALON 2C.2)', () => {
  for (const { classId, expectedAsiLevels } of ASI_MATRIX) {
    it(`${classId} : ASI à exactement ${expectedAsiLevels.join('/')}`, () => {
      const def = findDef(classId);
      const observed: number[] = [];
      for (let target = 2; target <= 20; target++) {
        const entry = makeEntry(classId, target - 1);
        const steps = levelUpChoices({
          classEntry: entry,
          classDefinition: def,
          newClassLevel: target,
        });
        if (steps.some((s) => s.kind === 'asi-or-feat')) {
          observed.push(target);
        }
      }
      expect(observed).toEqual([...expectedAsiLevels]);
    });
  }

  it('aucune classe ne propose ASI à L1, L2, L3 (les sous-choix viennent ailleurs)', () => {
    for (const { classId } of ASI_MATRIX) {
      const def = findDef(classId);
      for (const lvl of [2, 3] as const) {
        const steps = levelUpChoices({
          classEntry: makeEntry(classId, lvl - 1),
          classDefinition: def,
          newClassLevel: lvl,
        });
        expect(
          steps.find((s) => s.kind === 'asi-or-feat'),
          `${classId} L${lvl} ne devrait PAS exposer ASI`,
        ).toBeUndefined();
      }
    }
  });
});
