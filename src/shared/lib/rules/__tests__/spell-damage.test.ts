import { describe, expect, it } from 'vitest';

import { resolveSpellDamage } from '../spell-damage';
import type { Spell, SpellDamage } from '@/shared/types/content';

/**
 * Plan D1 — tests unitaires du moteur de résolution des dégâts de sort.
 *
 * Couverture des 3 patterns SRD CC :
 *   1. Cantrip char-level scaling (Fire Bolt, Sacred Flame…)
 *   2. Slot upcast (Fireball L3 → L5 = 10d6)
 *   3. Sort sans scaling / formule renvoyée brute
 *
 * Plus deux cas-limites :
 *   - Cantrip sans `cantripScaling` → formule tier 1 retournée
 *   - Upcast sans `atHigherLevels` → formule brute, pas de concat
 *   - perLevel mal formé → formule de base (garde contre concat invalide)
 */

const fireType = { fr: 'feu', en: 'Fire' };
const radType = { fr: 'radiants', en: 'Radiant' };

function makeEntry(over: Partial<SpellDamage> = {}): SpellDamage {
  return {
    formula: '1d10',
    type: 'fire',
    typeLabel: fireType,
    resolution: 'attack-roll',
    ...over,
  };
}

function makeSpell(level: number): Pick<Spell, 'level'> {
  return { level };
}

describe('resolveSpellDamage — cantrip char-level scaling', () => {
  const fireBolt = makeEntry({
    formula: '1d10',
    type: 'fire',
    typeLabel: fireType,
    resolution: 'attack-roll',
    cantripScaling: { tier5: '2d10', tier11: '3d10', tier17: '4d10' },
  });

  it('tier 1 (L1-4) retourne 1d10', () => {
    expect(
      resolveSpellDamage(fireBolt, makeSpell(0), { slotLevel: 0, casterLevel: 1 }).formula,
    ).toBe('1d10');
    expect(
      resolveSpellDamage(fireBolt, makeSpell(0), { slotLevel: 0, casterLevel: 4 }).formula,
    ).toBe('1d10');
  });

  it('tier 2 (L5-10) retourne 2d10', () => {
    expect(
      resolveSpellDamage(fireBolt, makeSpell(0), { slotLevel: 0, casterLevel: 5 }).formula,
    ).toBe('2d10');
    expect(
      resolveSpellDamage(fireBolt, makeSpell(0), { slotLevel: 0, casterLevel: 10 }).formula,
    ).toBe('2d10');
  });

  it('tier 3 (L11-16) retourne 3d10', () => {
    expect(
      resolveSpellDamage(fireBolt, makeSpell(0), { slotLevel: 0, casterLevel: 11 }).formula,
    ).toBe('3d10');
    expect(
      resolveSpellDamage(fireBolt, makeSpell(0), { slotLevel: 0, casterLevel: 16 }).formula,
    ).toBe('3d10');
  });

  it('tier 4 (L17-20) retourne 4d10', () => {
    expect(
      resolveSpellDamage(fireBolt, makeSpell(0), { slotLevel: 0, casterLevel: 17 }).formula,
    ).toBe('4d10');
    expect(
      resolveSpellDamage(fireBolt, makeSpell(0), { slotLevel: 0, casterLevel: 20 }).formula,
    ).toBe('4d10');
  });

  it('cantrip sans cantripScaling reste sur la formule brute à tout niveau', () => {
    const noScaling = makeEntry({ cantripScaling: undefined });
    expect(
      resolveSpellDamage(noScaling, makeSpell(0), { slotLevel: 0, casterLevel: 20 }).formula,
    ).toBe('1d10');
  });
});

describe('resolveSpellDamage — slot upcast (sort L1+)', () => {
  const fireball = makeEntry({
    formula: '8d6',
    type: 'fire',
    typeLabel: fireType,
    resolution: 'saving-throw',
    atHigherLevels: { perLevel: '+1d6' },
  });

  it('au niveau de base (L3) : formule brute 8d6', () => {
    expect(
      resolveSpellDamage(fireball, makeSpell(3), { slotLevel: 3, casterLevel: 5 }).formula,
    ).toBe('8d6');
  });

  it('upcast L5 (+2) → 8d6 + 2d6', () => {
    expect(
      resolveSpellDamage(fireball, makeSpell(3), { slotLevel: 5, casterLevel: 5 }).formula,
    ).toBe('8d6 + 2d6');
  });

  it('upcast L9 (+6) → 8d6 + 6d6', () => {
    expect(
      resolveSpellDamage(fireball, makeSpell(3), { slotLevel: 9, casterLevel: 17 }).formula,
    ).toBe('8d6 + 6d6');
  });

  it('upcast non-formule-simple (Magic Missile sans atHigherLevels) → formule brute', () => {
    const magicMissile = makeEntry({
      formula: '1d4+1',
      type: 'force',
      typeLabel: { fr: 'force', en: 'Force' },
      resolution: 'auto',
    });
    expect(
      resolveSpellDamage(magicMissile, makeSpell(1), {
        slotLevel: 5,
        casterLevel: 10,
      }).formula,
    ).toBe('1d4+1');
  });

  it('perLevel mal formé (« +X d6 ») → formule de base, pas de concat invalide', () => {
    const broken = makeEntry({
      formula: '8d6',
      atHigherLevels: { perLevel: '+X d6' }, // intentionnellement invalide
    });
    expect(
      resolveSpellDamage(broken, makeSpell(3), { slotLevel: 5, casterLevel: 5 }).formula,
    ).toBe('8d6');
  });
});

describe('resolveSpellDamage — métadonnées retournées', () => {
  it('preserve type, typeLabel, resolution, condition', () => {
    const guidingBolt = makeEntry({
      formula: '4d6',
      type: 'radiant',
      typeLabel: radType,
      resolution: 'attack-roll',
      atHigherLevels: { perLevel: '+1d6' },
      condition: { fr: 'avantage cible', en: 'advantage target' },
    });
    const resolved = resolveSpellDamage(guidingBolt, makeSpell(1), {
      slotLevel: 2,
      casterLevel: 5,
    });
    expect(resolved.formula).toBe('4d6 + 1d6');
    expect(resolved.type).toBe('radiant');
    expect(resolved.typeLabel).toEqual(radType);
    expect(resolved.resolution).toBe('attack-roll');
    expect(resolved.condition).toEqual({ fr: 'avantage cible', en: 'advantage target' });
  });
});
