import { describe, expect, it } from 'vitest';

import { feetToMeters, formatMetersValue, metersToFeet } from '../distance';

describe('distance — feetToMeters', () => {
  it('convertit les vitesses SRD usuelles (×0,3 = /5 ×1,5)', () => {
    // Valeurs SRD réelles d'ancestries.json : 30 ft = 9 m, 35 ft = 10,5 m.
    expect(feetToMeters(30)).toBe(9);
    expect(feetToMeters(35)).toBe(10.5);
    expect(feetToMeters(25)).toBe(7.5);
  });

  it('identité avec le bundle SRD FR (« 30 feet » → 9 m)', () => {
    // Le bundle spells.json rend déjà « 30 feet » en « 9 m » ; même facteur.
    expect(feetToMeters(0)).toBe(0);
    expect(feetToMeters(60)).toBe(18);
    expect(feetToMeters(5)).toBe(1.5);
  });
});

describe('distance — formatMetersValue', () => {
  it('rend les entiers nus (sans décimale)', () => {
    // 30 ft → « 9 » (et NON « 30 », le bug feet-affiché-comme-mètres).
    expect(formatMetersValue(30)).toBe('9');
    expect(formatMetersValue(60)).toBe('18');
    expect(formatMetersValue(0)).toBe('0');
  });

  it('rend les fractions avec la virgule décimale française', () => {
    expect(formatMetersValue(35)).toBe('10,5');
    expect(formatMetersValue(25)).toBe('7,5');
    expect(formatMetersValue(5)).toBe('1,5');
  });
});

/**
 * Inverse exact, nécessaire dès qu'on laisse SAISIR une distance : l'utilisateur
 * tape des mètres, la fiche stocke des pieds comme tout le contenu SRD.
 */
describe('metersToFeet', () => {
  it('rend les valeurs SRD canoniques', () => {
    expect(metersToFeet(9)).toBe(30);
    expect(metersToFeet(1.5)).toBe(5);
    expect(metersToFeet(12)).toBe(40);
  });

  it('fait l’aller-retour sans dérive sur les vitesses usuelles', () => {
    for (const feet of [25, 30, 35, 40, 45]) {
      expect(metersToFeet(feetToMeters(feet))).toBe(feet);
    }
  });

  it('arrondit à l’entier — pas de pied fractionnaire', () => {
    expect(Number.isInteger(metersToFeet(10.4))).toBe(true);
  });
});
