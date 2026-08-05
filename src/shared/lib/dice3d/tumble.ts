import { length, normalize, type Vec3 } from './polyhedra';

/**
 * Mise en scène de la chute : combien de tours, autour de quel axe, quand.
 *
 * Déterministe À DESSEIN. Un `Math.random()` appelé au rendu redessinerait une
 * trajectoire différente à chaque re-rendu de React, et le dé se remettrait à
 * tourner en plein vol. La graine combine l'instant du jet et le rang du dé —
 * deux dés d'un même jet culbutent donc différemment, et deux jets successifs ne
 * se ressemblent pas.
 */

export interface Tumble {
  readonly axis: Vec3;
  readonly turns: number;
  readonly delayMs: number;
  readonly durationMs: number;
}

export function tumbleFor(seed: number): Tumble {
  const h = hash(seed);
  const axis = normalize([
    (h & 0xff) / 255 - 0.5,
    ((h >> 8) & 0xff) / 255 - 0.5,
    ((h >> 16) & 0xff) / 255 - 0.5,
  ]);
  return {
    // Un axe nul (tirage pile au centre) ferait un dé qui ne tourne pas.
    axis: length(axis) < 0.05 ? normalize([0.7, 0.5, 0.5]) : axis,
    turns: 2 + ((h >> 3) % 3),
    delayMs: ((h >> 5) % 7) * 26,
    durationMs: 900 + ((h >> 11) % 5) * 70,
  };
}

/**
 * Amortissement de la culbute : vif au départ, posé à l'arrivée.
 *
 * Vaut exactement 1 en fin de course, ce qui garantit que la rotation résiduelle
 * est nulle et donc que le dé s'arrête EXACTEMENT sur la face tirée. Une courbe
 * qui n'atteindrait 1 qu'asymptotiquement laisserait le chiffre légèrement de
 * travers au repos.
 */
export function easeOutTumble(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return 1 - Math.pow(1 - c, 3);
}

/** Mélangeur entier 32 bits (xorshift) — pas de dépendance, distribution correcte. */
function hash(seed: number): number {
  let x = (seed | 0) ^ 0x9e3779b9;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  return Math.abs(x | 0);
}
