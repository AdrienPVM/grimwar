import { describe, expect, it } from 'vitest';

import type { ClassEntity, Spell } from '@/shared/types/content';

import {
  candidatePreparableSpells,
  isPreparedCaster,
  preparationCap,
  PREPARED_CASTER_CLASS_IDS,
  togglePrepared,
} from '../spell-preparation';

import classesBundle from '../../../../../public/data/classes.json';
import spellsBundle from '../../../../../public/data/spells.json';

/**
 * Règles de préparation des sorts. Bundles SRD réels injectés → les plafonds et
 * comptes de pool sont des assertions de **vérité du contenu** (Cat. 3/4 du
 * cahier des charges) figées une fois contre le SRD 2024.
 */

const classes = classesBundle as unknown as ClassEntity[];
const spells = spellsBundle as unknown as Spell[];
const byId = new Map(classes.map((c) => [c.id, c]));

describe('isPreparedCaster', () => {
  it('Clerc, Druide, Paladin, Magicien préparent', () => {
    expect(isPreparedCaster('cleric')).toBe(true);
    expect(isPreparedCaster('druid')).toBe(true);
    expect(isPreparedCaster('paladin')).toBe(true);
    expect(isPreparedCaster('wizard')).toBe(true);
  });

  it('Barde, Ensorceleur, Rôdeur, Occultiste connaissent (pas de préparation)', () => {
    expect(isPreparedCaster('bard')).toBe(false);
    expect(isPreparedCaster('sorcerer')).toBe(false);
    expect(isPreparedCaster('ranger')).toBe(false);
    expect(isPreparedCaster('warlock')).toBe(false);
  });

  it('le set canonique est exactement les 4 préparateurs SRD 2024', () => {
    expect([...PREPARED_CASTER_CLASS_IDS].sort()).toEqual([
      'cleric',
      'druid',
      'paladin',
      'wizard',
    ]);
  });
});

describe('preparationCap (colonne « Prepared Spells » SRD 2024)', () => {
  it('Clerc/Druide/Magicien (full) : 4 au niveau 1, 9 au niveau 5', () => {
    expect(preparationCap(byId.get('cleric'), 1)).toBe(4);
    expect(preparationCap(byId.get('druid'), 1)).toBe(4);
    expect(preparationCap(byId.get('wizard'), 1)).toBe(4);
    expect(preparationCap(byId.get('cleric'), 5)).toBe(9);
  });

  it('Paladin (half) : 2 au niveau 1', () => {
    expect(preparationCap(byId.get('paladin'), 1)).toBe(2);
  });

  it('classe absente → 0', () => {
    expect(preparationCap(undefined, 1)).toBe(0);
  });

  it('niveau hors borne → 0', () => {
    expect(preparationCap(byId.get('cleric'), 0)).toBe(0);
    expect(preparationCap(byId.get('cleric'), 21)).toBe(0);
  });
});

describe('candidatePreparableSpells', () => {
  it('Clerc niveau max 1 : 15 sorts de niveau 1, aucun cantrip', () => {
    const pool = candidatePreparableSpells(spells, 'cleric', 1);
    expect(pool).toHaveLength(15);
    for (const s of pool) {
      expect(s.level).toBe(1);
      expect(s.classes).toContain('cleric');
    }
    expect(pool.some((s) => s.level === 0)).toBe(false);
  });

  it('Clerc niveau max 3 : sorts de niveau 1 à 3 (15 + 17 + 19 = 51)', () => {
    const pool = candidatePreparableSpells(spells, 'cleric', 3);
    expect(pool).toHaveLength(51);
    expect(pool.every((s) => s.level >= 1 && s.level <= 3)).toBe(true);
  });

  it('exclut les sorts d’une autre classe', () => {
    const pool = candidatePreparableSpells(spells, 'cleric', 9);
    expect(pool.every((s) => s.classes.includes('cleric'))).toBe(true);
  });

  it('maxLevel 0 → pool vide', () => {
    expect(candidatePreparableSpells(spells, 'cleric', 0)).toHaveLength(0);
  });

  it('trié par niveau puis nom FR', () => {
    const pool = candidatePreparableSpells(spells, 'druid', 2);
    for (let i = 1; i < pool.length; i += 1) {
      const prev = pool[i - 1]!;
      const cur = pool[i]!;
      const order =
        prev.level - cur.level ||
        prev.name.fr.localeCompare(cur.name.fr, 'fr');
      expect(order).toBeLessThanOrEqual(0);
    }
  });
});

describe('togglePrepared', () => {
  it('ajoute un sort absent sous le plafond', () => {
    expect(togglePrepared(['a'], 'b', 4)).toEqual(['a', 'b']);
  });

  it('retire un sort présent', () => {
    expect(togglePrepared(['a', 'b'], 'a', 4)).toEqual(['b']);
  });

  it('bloque l’ajout au plafond (liste inchangée)', () => {
    expect(togglePrepared(['a', 'b'], 'c', 2)).toEqual(['a', 'b']);
  });

  it('autorise toujours le retrait même au plafond', () => {
    expect(togglePrepared(['a', 'b'], 'a', 2)).toEqual(['b']);
  });

  it('ne mute pas la liste d’entrée', () => {
    const input = ['a'];
    togglePrepared(input, 'b', 4);
    expect(input).toEqual(['a']);
  });
});
