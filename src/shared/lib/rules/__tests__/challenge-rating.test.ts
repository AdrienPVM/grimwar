import { describe, expect, it } from 'vitest';

import { formatCr } from '../challenge-rating';

describe('formatCr — affichage du Facteur de puissance', () => {
  it('rend les FP fractionnaires SRD en fractions conventionnelles', () => {
    expect(formatCr(0.125)).toBe('1/8');
    expect(formatCr(0.25)).toBe('1/4');
    expect(formatCr(0.5)).toBe('1/2');
  });

  it('rend les FP entiers tels quels', () => {
    expect(formatCr(0)).toBe('0');
    expect(formatCr(1)).toBe('1');
    expect(formatCr(5)).toBe('5');
    expect(formatCr(30)).toBe('30');
  });
});
