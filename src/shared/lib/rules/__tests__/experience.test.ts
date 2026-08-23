import { describe, expect, it } from 'vitest';

import { proficiencyBonus } from '../multiclass';
import { levelFromXp, MAX_LEVEL, xpForLevel, xpProgress } from '../experience';

/**
 * M45 — table d'XP. VÉRITÉ DU CONTENU catégorie 3 : les 20 seuils sont figés
 * ici après vérification UNE fois contre l'extraction SRD 5.2.1 (table
 * « Character Advancement », `SRD_CC_v5.2.1.txt` lignes 2382-2402). Toute
 * dérive de la table casse ce test, et non un écran.
 *
 * Catégorie 4 également : les assertions portent sur le NOMBRE attendu, pas sur
 * « c'est positif ».
 */

/** Les 20 seuils SRD, dans l'ordre des niveaux 1 → 20. */
const SRD_THRESHOLDS: readonly [number, number][] = [
  [1, 0],
  [2, 300],
  [3, 900],
  [4, 2700],
  [5, 6500],
  [6, 14000],
  [7, 23000],
  [8, 34000],
  [9, 48000],
  [10, 64000],
  [11, 85000],
  [12, 100000],
  [13, 120000],
  [14, 140000],
  [15, 165000],
  [16, 195000],
  [17, 225000],
  [18, 265000],
  [19, 305000],
  [20, 355000],
];

describe('xpForLevel — fidélité SRD', () => {
  it.each(SRD_THRESHOLDS)('niveau %i → %i XP', (level, xp) => {
    expect(xpForLevel(level)).toBe(xp);
  });

  it('borne les niveaux hors table au lieu de lever', () => {
    expect(xpForLevel(0)).toBe(0);
    expect(xpForLevel(-3)).toBe(0);
    expect(xpForLevel(99)).toBe(355000);
  });

  it('les seuils sont strictement croissants (aucun palier plat)', () => {
    for (let level = 2; level <= MAX_LEVEL; level += 1) {
      expect(xpForLevel(level)).toBeGreaterThan(xpForLevel(level - 1));
    }
  });
});

describe('levelFromXp', () => {
  it('un total EXACTEMENT au seuil fait franchir le niveau', () => {
    // Le SRD dit « equals or exceeds » — 300 pile donne bien le niveau 2.
    expect(levelFromXp(300)).toBe(2);
    expect(levelFromXp(299)).toBe(1);
  });

  it('0 XP → niveau 1 (et non 0)', () => {
    expect(levelFromXp(0)).toBe(1);
  });

  it('un total négatif est traité comme 0', () => {
    expect(levelFromXp(-500)).toBe(1);
  });

  it('au-delà du dernier seuil, plafonne à 20', () => {
    expect(levelFromXp(355000)).toBe(20);
    expect(levelFromXp(999999)).toBe(20);
  });

  it('reste cohérent avec le bonus de maîtrise de la même table SRD', () => {
    // La table « Character Advancement » porte les deux colonnes ; elles ne
    // doivent pas diverger entre les deux modules qui les implémentent.
    expect(proficiencyBonus(levelFromXp(6500))).toBe(3); // niveau 5 → +3
    expect(proficiencyBonus(levelFromXp(100000))).toBe(4); // niveau 12 → +4
    expect(proficiencyBonus(levelFromXp(355000))).toBe(6); // niveau 20 → +6
  });
});

describe('xpProgress', () => {
  it('milieu de palier → seuils encadrants et reste exacts', () => {
    // 4 600 XP : niveau 4 (seuil 2 700), prochain palier à 6 500.
    const p = xpProgress(4600);
    expect(p.level).toBe(4);
    expect(p.currentThreshold).toBe(2700);
    expect(p.nextThreshold).toBe(6500);
    expect(p.toNext).toBe(1900);
    // (4600 − 2700) / (6500 − 2700) = 0,5
    expect(p.ratio).toBeCloseTo(0.5, 5);
  });

  it('pile sur un seuil → ratio 0 et palier entier restant', () => {
    const p = xpProgress(900);
    expect(p.level).toBe(3);
    expect(p.ratio).toBe(0);
    expect(p.toNext).toBe(1800); // 2700 − 900
  });

  it('niveau 20 → plus de palier suivant, jauge pleine', () => {
    const p = xpProgress(400000);
    expect(p.level).toBe(20);
    expect(p.nextThreshold).toBeNull();
    expect(p.toNext).toBeNull();
    expect(p.ratio).toBe(1);
  });

  it('0 XP → début du niveau 1, 300 XP à parcourir', () => {
    const p = xpProgress(0);
    expect(p.level).toBe(1);
    expect(p.toNext).toBe(300);
    expect(p.ratio).toBe(0);
  });
});
