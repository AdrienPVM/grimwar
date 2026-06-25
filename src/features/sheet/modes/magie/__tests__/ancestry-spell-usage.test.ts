import { describe, expect, it } from 'vitest';

import type { Character } from '@/shared/types/character';
import type { Ancestry } from '@/shared/types/content';

import {
  ancestrySpellUsageKey,
  remainingAncestrySpellUses,
  resolveAncestrySpellUsage,
} from '../ancestry-spell-usage';

import ancestriesBundle from '../../../../../../public/data/ancestries.json';

/**
 * D12b — résolution du quota d'usage des sorts d'ascendance. Cat. 4 (calcul
 * chiffré contre la règle SRD) : `long-rest` → 1 usage ; `pb-per-rest` → bonus
 * de maîtrise usages ; `at-will`/absent → pas de compteur. Les valeurs sont
 * lues du bundle SRD réel (pas de stub), donc le test fige aussi la donnée
 * D12a (spellUsages Tieffelin / Elfe / Gnome).
 */

function ancestry(id: string): Ancestry {
  const found = (ancestriesBundle as Ancestry[]).find((a) => a.id === id);
  if (!found) throw new Error(`[ancestry-spell-usage] ascendance ${id} absente du bundle`);
  return found;
}

describe('ancestrySpellUsageKey', () => {
  it('préfixe la clé par `ancestry-spell:`', () => {
    expect(ancestrySpellUsageKey('tenebres')).toBe('ancestry-spell:tenebres');
  });
});

describe('resolveAncestrySpellUsage', () => {
  it('Tieffelin — sort L3 `long-rest` → 1 usage / repos long', () => {
    const spec = resolveAncestrySpellUsage(ancestry('tiefling'), 'represailles-infernales', 5);
    expect(spec).toEqual({
      key: 'ancestry-spell:represailles-infernales',
      cadence: 'long-rest',
      max: 1,
      restoresOn: 'long',
    });
  });

  it('Elfe — sort L5 `long-rest` → 1 usage / repos long', () => {
    const spec = resolveAncestrySpellUsage(ancestry('elf'), 'tenebres', 5);
    expect(spec?.max).toBe(1);
    expect(spec?.cadence).toBe('long-rest');
  });

  it('Gnome des forêts — `pb-per-rest` → max = bonus de maîtrise (L1 → 2, L5 → 3, L9 → 4)', () => {
    const gnome = ancestry('gnome');
    expect(resolveAncestrySpellUsage(gnome, 'communication-avec-les-animaux', 1)?.max).toBe(2);
    expect(resolveAncestrySpellUsage(gnome, 'communication-avec-les-animaux', 5)?.max).toBe(3);
    expect(resolveAncestrySpellUsage(gnome, 'communication-avec-les-animaux', 9)?.max).toBe(4);
  });

  it('cantrip / sort absent du record spellUsages → null (à volonté, aucun compteur)', () => {
    // `trait-de-feu` est le cantrip Infernal — at-will, omis du record.
    expect(resolveAncestrySpellUsage(ancestry('tiefling'), 'trait-de-feu', 5)).toBeNull();
    expect(resolveAncestrySpellUsage(ancestry('tiefling'), 'sort-inconnu', 5)).toBeNull();
  });
});

describe('remainingAncestrySpellUses', () => {
  const spec = {
    key: 'ancestry-spell:tenebres',
    cadence: 'long-rest' as const,
    max: 1,
    restoresOn: 'long' as const,
  };

  function charWith(featureUsage: Character['featureUsage']): Character {
    return { featureUsage } as unknown as Character;
  }

  it('jamais consommé → plein par défaut (init paresseuse)', () => {
    expect(remainingAncestrySpellUses(charWith({}), spec)).toBe(1);
  });

  it('déjà consommé → lit `current` du compteur stocké', () => {
    const c = charWith({ 'ancestry-spell:tenebres': { current: 0, max: 1, restoresOn: 'long' } });
    expect(remainingAncestrySpellUses(c, spec)).toBe(0);
  });
});
