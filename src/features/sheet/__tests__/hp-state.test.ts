import { describe, it, expect } from 'vitest';

import { hpStateFor } from '../hp-state';

/**
 * Garde les 4 seuils HP (>75% / 25-75 / <25 / 0) verrouillés. Ces seuils
 * pilotent à la fois la classe CSS d'ambiance et l'UX du joueur en combat —
 * une dérive silencieuse changerait la sensation de la fiche.
 */
describe('hpStateFor', () => {
  it('hp full = healthy', () => {
    expect(hpStateFor(32, 32)).toBe('hp-healthy');
  });

  it('hp 80% = healthy (strict >75)', () => {
    expect(hpStateFor(8, 10)).toBe('hp-healthy');
  });

  it('hp 75% = wounded (boundary inclusive sur le bas)', () => {
    expect(hpStateFor(75, 100)).toBe('hp-wounded');
  });

  it('hp 50% = wounded', () => {
    expect(hpStateFor(16, 32)).toBe('hp-wounded');
  });

  it('hp 26% = wounded (juste au-dessus du seuil critique)', () => {
    expect(hpStateFor(26, 100)).toBe('hp-wounded');
  });

  it('hp 25% = critical (boundary)', () => {
    expect(hpStateFor(25, 100)).toBe('hp-critical');
  });

  it('hp 10% = critical', () => {
    expect(hpStateFor(3, 30)).toBe('hp-critical');
  });

  it('hp 0 = down', () => {
    expect(hpStateFor(0, 32)).toBe('hp-down');
  });

  it('hp négatif = down (mort sur dégâts massifs)', () => {
    expect(hpStateFor(-5, 30)).toBe('hp-down');
  });

  it('hp max = 0 (cas dégénéré) = down', () => {
    expect(hpStateFor(0, 0)).toBe('hp-down');
  });
});
