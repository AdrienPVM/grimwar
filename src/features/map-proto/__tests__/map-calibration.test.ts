import { describe, expect, it } from 'vitest';

import {
  feetPerSquareFromMeters,
  metersPerSquareValue,
} from '../map-calibration';

/**
 * Le calibrage est la seule saisie utilisateur du mode carte dont TOUT le reste
 * dérive (règle, portées de vision, gabarits d'AoE, rayons de lumière). Une
 * conversion fausse ici est silencieuse : la carte s'affiche normalement et
 * ment sur chaque distance. D'où des valeurs attendues CHIFFRÉES, pas des
 * bornes.
 */
describe('map-calibration — mètres saisis → pieds stockés', () => {
  it('convertit les échelles usuelles sans arrondi (5 ft = 1,50 m)', () => {
    expect(feetPerSquareFromMeters(1.5)).toBe(5);
    expect(feetPerSquareFromMeters(3)).toBe(10);
    expect(feetPerSquareFromMeters(4.5)).toBe(15);
    expect(feetPerSquareFromMeters(6)).toBe(20);
  });

  it('arrondit une saisie intermédiaire au pied entier (le schéma exige un entier)', () => {
    // 2 m → 6,67 ft → 7 ft.
    expect(feetPerSquareFromMeters(2)).toBe(7);
    // 1 m → 3,33 ft → 3 ft.
    expect(feetPerSquareFromMeters(1)).toBe(3);
  });

  it('plancher à 1 pied — une case ne peut pas mesurer zéro', () => {
    expect(feetPerSquareFromMeters(0.1)).toBe(1);
  });

  it('refuse une saisie inutilisable plutôt que d’écrire une échelle absurde', () => {
    expect(feetPerSquareFromMeters(0)).toBeNull();
    expect(feetPerSquareFromMeters(-3)).toBeNull();
    expect(feetPerSquareFromMeters(Number.NaN)).toBeNull();
    expect(feetPerSquareFromMeters(Number.POSITIVE_INFINITY)).toBeNull();
    expect(feetPerSquareFromMeters(1000)).toBeNull();
  });
});

describe('map-calibration — pieds stockés → mètres affichés', () => {
  it('rend un entier nu quand la valeur est ronde', () => {
    expect(metersPerSquareValue(10)).toBe('3');
    expect(metersPerSquareValue(20)).toBe('6');
  });

  it('rend la virgule décimale française sinon', () => {
    expect(metersPerSquareValue(5)).toBe('1,5');
    expect(metersPerSquareValue(15)).toBe('4,5');
  });

  it('boucle sans dérive sur les échelles usuelles (aller-retour)', () => {
    for (const ft of [5, 10, 15, 20]) {
      const shown = metersPerSquareValue(ft);
      expect(feetPerSquareFromMeters(Number(shown.replace(',', '.')))).toBe(ft);
    }
  });
});
