import { describe, expect, it } from 'vitest';

import { easeOutTumble, tumbleFor } from '../tumble';

describe('tumbleFor', () => {
  it('est déterministe — une même graine donne une même culbute', () => {
    expect(tumbleFor(42)).toEqual(tumbleFor(42));
  });

  it('deux dés d’un même jet ne culbutent pas pareil', () => {
    expect(tumbleFor(7 * 31 + 0)).not.toEqual(tumbleFor(7 * 31 + 1));
  });

  it('produit toujours un axe unitaire et au moins deux tours', () => {
    for (let seed = 0; seed < 500; seed += 1) {
      const t = tumbleFor(seed);
      expect(Math.hypot(...t.axis)).toBeCloseTo(1, 9);
      expect(t.turns).toBeGreaterThanOrEqual(2);
      expect(t.durationMs).toBeGreaterThan(0);
      expect(t.delayMs).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('easeOutTumble', () => {
  /**
   * L'invariant qui garantit le chiffre.
   *
   * La rotation dessinée vaut `culbute(t) · pose`, et la culbute est
   * proportionnelle à `1 - easeOutTumble(t)`. Si la courbe n'atteignait 1 qu'à
   * la limite, il resterait au repos une rotation résiduelle : le dé
   * s'immobiliserait sur un chiffre légèrement de travers, voire sur la mauvaise
   * face pour un d20 dont les faces ne font que 41°.
   */
  it('vaut EXACTEMENT 1 en fin de course', () => {
    expect(easeOutTumble(1)).toBe(1);
  });

  it('part de zéro et croît sans jamais reculer', () => {
    expect(easeOutTumble(0)).toBe(0);
    let previous = -1;
    for (let i = 0; i <= 100; i += 1) {
      const v = easeOutTumble(i / 100);
      expect(v).toBeGreaterThanOrEqual(previous);
      previous = v;
    }
  });

  it('borne les entrées hors de [0, 1] au lieu de diverger', () => {
    expect(easeOutTumble(-3)).toBe(0);
    expect(easeOutTumble(9)).toBe(1);
  });
});
