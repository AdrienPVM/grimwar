import { describe, expect, it } from 'vitest';

import {
  needsV1ToV2Upgrade,
  upgradeCharacterV1ToV2,
} from '../upgrade-character-v1-to-v2';
import {
  EMPTY_ANCESTRY_SUB_CHOICES,
  createEmptyClassSubChoices,
} from '@/shared/types/character';

/**
 * Plan 13.7 §0.2 — migration lazy v1 → v2.
 *
 * Red-before-green : ces tests ont été vus échouer (helper inexistant) avant
 * d'être verts au commit "feat(schema): character v2".
 */
describe('upgradeCharacterV1ToV2', () => {
  it('détecte qu\'un doc v1 a besoin d\'upgrade', () => {
    expect(needsV1ToV2Upgrade({ schemaVersion: 1 })).toBe(true);
  });

  it('détecte qu\'un doc v2 n\'a pas besoin d\'upgrade', () => {
    expect(needsV1ToV2Upgrade({ schemaVersion: 2 })).toBe(false);
  });

  it('ne détecte rien sur un null/undefined', () => {
    expect(needsV1ToV2Upgrade(null)).toBe(false);
    expect(needsV1ToV2Upgrade(undefined)).toBe(false);
  });

  it('upgrade un doc v1 minimal vers v2 en injectant les sentinelles', () => {
    const v1 = {
      id: 'pj-1',
      name: 'Lyralei',
      schemaVersion: 1,
      ancestryId: 'elf',
      subancestryId: null,
      classes: [{ classId: 'rogue', subclassId: null, level: 1 }],
    };
    const v2 = upgradeCharacterV1ToV2(v1) as Record<string, unknown>;

    expect(v2.schemaVersion).toBe(2);
    expect(v2.ancestrySubChoices).toEqual(EMPTY_ANCESTRY_SUB_CHOICES);
    expect(v2.extraLanguages).toEqual([]);
    expect('subancestryId' in v2).toBe(false);

    const classes = v2.classes as Array<Record<string, unknown>>;
    expect(classes).toHaveLength(1);
    expect(classes[0]).toMatchObject({
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
  });

  it('préserve les valeurs déjà présentes sur les entrées `classes[]`', () => {
    const v1 = {
      schemaVersion: 1,
      classes: [
        {
          classId: 'fighter',
          subclassId: null,
          level: 1,
          fighterFightingStyle: 'archery',
          weaponMasteries: ['longsword', 'longbow'],
        },
      ],
    };
    const v2 = upgradeCharacterV1ToV2(v1) as Record<string, unknown>;
    const classes = v2.classes as Array<Record<string, unknown>>;
    expect(classes[0]?.fighterFightingStyle).toBe('archery');
    expect(classes[0]?.weaponMasteries).toEqual(['longsword', 'longbow']);
  });

  it('est idempotent — un doc v2 traverse inchangé', () => {
    const v2 = {
      schemaVersion: 2,
      classes: [{ classId: 'rogue', level: 1, weaponMasteries: ['dagger'] }],
      ancestrySubChoices: { ...EMPTY_ANCESTRY_SUB_CHOICES, elfLineage: 'drow' },
    };
    const result = upgradeCharacterV1ToV2(v2);
    expect(result).toBe(v2);
  });

  it('ne casse pas un doc sans `classes[]` (cas tordu)', () => {
    const v1 = { schemaVersion: 1, ancestryId: 'elf' };
    const v2 = upgradeCharacterV1ToV2(v1) as Record<string, unknown>;
    expect(v2.schemaVersion).toBe(2);
    expect(v2.ancestrySubChoices).toEqual(EMPTY_ANCESTRY_SUB_CHOICES);
  });

  it('retourne raw inchangé pour une version inconnue', () => {
    const weird = { schemaVersion: 99 };
    expect(upgradeCharacterV1ToV2(weird)).toBe(weird);
  });

  it('exporte les sentinelles correctement typées pour usage externe', () => {
    expect(EMPTY_ANCESTRY_SUB_CHOICES.dragonAncestry).toBeNull();
    expect(createEmptyClassSubChoices().weaponMasteries).toEqual([]);
  });
});
