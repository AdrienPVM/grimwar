import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { iconNames } from '@/shared/design/icons';

import { IconSprite } from '../icon-sprite';

/**
 * Garde-fou de CENTRAGE du sprite d'icônes.
 *
 * Acté après l'UAT du menu d'action : `i-staff` était dessiné entre x=3 et x=9
 * dans un viewBox 24×24 — centre optique x≈6 au lieu de 12. Invisible dans une
 * rangée de texte, mais flagrant dès que l'icône est seule dans une pastille
 * ronde (« Outils » du menu d'action, onglet « Classes » du Codex) : le glyphe
 * flottait contre le bord gauche du disque.
 *
 * Un test qui asserterait juste « le symbole existe » serait resté vert pendant
 * que le décalage était à l'écran. On mesure donc la BOÎTE ENGLOBANTE réelle de
 * la géométrie et on exige que son centre tombe près du centre du viewBox.
 *
 * Tolérance = 2 unités sur 24 (~8 %). Mesuré sur les 27 symboles au moment de
 * poser la règle : le pire écart légitime est `i-spell` à 2.00 en y (l'étoile a
 * une pointe basse plus longue, c'est voulu) ; `i-staff` était seul à 6.00.
 */

const VIEWBOX = 24;
const CENTER = VIEWBOX / 2;
const TOLERANCE = 2;

/**
 * Points de contrôle d'un attribut `d`. Ne gère que le sous-ensemble utilisé
 * par le sprite (M/L/C/V/H/Z en absolu) — et lève si un autre verbe apparaît,
 * pour qu'une future icône en coordonnées relatives ne passe pas en silence
 * avec une boîte englobante fausse.
 *
 * Les points de contrôle des courbes sont inclus : le tracé reste dans leur
 * enveloppe convexe, l'approximation est donc conservatrice pour un centrage.
 */
function pathPoints(d: string): Array<[number, number]> {
  const tokens = d.match(/[A-Za-z]|-?\d*\.?\d+/g) ?? [];
  const points: Array<[number, number]> = [];
  let cursor: [number, number] = [0, 0];
  let command = '';
  let i = 0;
  const num = (): number => Number(tokens[i++] ?? NaN);

  while (i < tokens.length) {
    const token = tokens[i] ?? '';
    if (/^[A-Za-z]$/.test(token)) {
      command = token;
      i += 1;
    }
    if (command === 'Z') continue;
    if (command === 'M' || command === 'L') {
      cursor = [num(), num()];
      points.push(cursor);
    } else if (command === 'V') {
      cursor = [cursor[0], num()];
      points.push(cursor);
    } else if (command === 'H') {
      cursor = [num(), cursor[1]];
      points.push(cursor);
    } else if (command === 'C') {
      for (let k = 0; k < 3; k += 1) {
        cursor = [num(), num()];
        points.push(cursor);
      }
    } else {
      throw new Error(`Verbe de path non géré par le garde-fou : « ${command} »`);
    }
  }
  return points;
}

function geometryCenter(symbol: SVGSymbolElement): { cx: number; cy: number } {
  const xs: number[] = [];
  const ys: number[] = [];

  for (const path of Array.from(symbol.querySelectorAll('path'))) {
    for (const [x, y] of pathPoints(path.getAttribute('d') ?? '')) {
      xs.push(x);
      ys.push(y);
    }
  }
  for (const circle of Array.from(symbol.querySelectorAll('circle'))) {
    const cx = Number(circle.getAttribute('cx'));
    const cy = Number(circle.getAttribute('cy'));
    const r = Number(circle.getAttribute('r'));
    xs.push(cx - r, cx + r);
    ys.push(cy - r, cy + r);
  }

  return {
    cx: (Math.min(...xs) + Math.max(...xs)) / 2,
    cy: (Math.min(...ys) + Math.max(...ys)) / 2,
  };
}

describe('<IconSprite>', () => {
  it('déclare exactement les symboles listés par iconNames', () => {
    const { container } = render(<IconSprite />);
    const ids = Array.from(container.querySelectorAll('symbol')).map((s) => s.id);
    expect(ids.slice().sort()).toEqual([...iconNames].sort());
  });

  it.each([...iconNames])(
    '%s est centré dans son viewBox 24×24',
    (name) => {
      const { container } = render(<IconSprite />);
      const symbol = container.querySelector<SVGSymbolElement>(`#${name}`);
      expect(symbol).not.toBeNull();
      expect(symbol?.getAttribute('viewBox')).toBe(`0 0 ${VIEWBOX} ${VIEWBOX}`);

      const { cx, cy } = geometryCenter(symbol as SVGSymbolElement);
      expect(Math.abs(cx - CENTER)).toBeLessThanOrEqual(TOLERANCE);
      expect(Math.abs(cy - CENTER)).toBeLessThanOrEqual(TOLERANCE);
    },
  );

  it('garde le bâton parfaitement centré — le glyphe seul dans une pastille', () => {
    const { container } = render(<IconSprite />);
    const staff = container.querySelector<SVGSymbolElement>('#i-staff');
    expect(geometryCenter(staff as SVGSymbolElement)).toEqual({ cx: 12, cy: 12 });
  });
});
