import { readFile } from 'node:fs/promises';

import { beforeAll, describe, expect, it } from 'vitest';

import { parseDd2vtt, type ParsedDd2vtt } from '../dd2vtt';

/**
 * Vérité du contenu, catégorie « fidélité — entrées de référence figées »,
 * appliquée à un VRAI export Dungeondraft plutôt qu'à un `.dd2vtt` de laboratoire.
 *
 * Fixture : `tests/e2e/assets/felder-house.dd2vtt`, dérivée sous CC0 de
 * `mbround18/vtt-maps` (cf. le README du dossier). La géométrie est intacte ;
 * seule l'image a été réduite. Les valeurs ci-dessous ont été relevées UNE FOIS
 * sur le fichier d'origine — le test les fige ensuite, et toute dérive du
 * parseur devient un échec dur au lieu d'une carte de travers découverte à table.
 *
 * Ce que le synthétique ne pouvait pas couvrir : 46 portails, un éclairage déjà
 * appliqué à l'image, et des lumières de portée fractionnaire (0,5 case).
 */

const FIXTURE = 'tests/e2e/assets/felder-house.dd2vtt';

describe('parseDd2vtt — export Dungeondraft réel (FelderHouse, CC0)', () => {
  let parsed: ParsedDd2vtt;

  beforeAll(async () => {
    parsed = parseDd2vtt(await readFile(FIXTURE, 'utf-8'));
  });

  it('lit les dimensions déclarées par le fichier', () => {
    expect(parsed.mapSizeSquares).toEqual({ x: 65, y: 45 });
    expect(parsed.pixelsPerGrid).toBe(128);
  });

  it('projette la case à 15 px dans le viewBox', () => {
    // sx = 1000/65 ≈ 15,38 ; sy = 700/45 ≈ 15,56 ; moyenne arrondie = 15.
    expect(parsed.gridSizePx).toBe(15);
  });

  it('agrège les 59 polylignes et les 46 portes fermées en 105 murs', () => {
    expect(parsed.walls).toHaveLength(105);
    expect(parsed.wallVertexCount).toBe(278);
    expect(parsed.walls.filter((w) => w.id.startsWith('portal-'))).toHaveLength(
      46,
    );
  });

  it('garde tous les murs dans le viewBox', () => {
    const out = parsed.walls
      .flatMap((w) => w.points)
      .filter((p) => p.x < 0 || p.x > 1000 || p.y < 0 || p.y > 700);
    expect(out).toEqual([]);
  });

  it('lit les 14 lampes en ambre, pas en magenta', () => {
    // `ffce0af7` : RRGGBBAA → #ffce0a (ambre chaud). Lu en ARGB, la même valeur
    // donnerait #ce0af7, un magenta vif — le test grave l'arbitrage.
    expect(parsed.lights).toHaveLength(14);
    expect(new Set(parsed.lights.map((l) => l.color))).toEqual(
      new Set(['#ffce0a']),
    );
  });

  it('convertit une portée fractionnaire en rayons vif/faible', () => {
    // range 0,5 case × 15,47 px = 7,7 → 8 px de lumière vive, 16 de faible.
    const light = parsed.lights[0]!;
    expect(light.brightRadius).toBe(8);
    expect(light.dimRadius).toBe(16);
  });

  it('signale que l’image porte déjà son éclairage', () => {
    expect(parsed.bakedLighting).toBe(true);
  });

  it('étiquette le fond comme PNG', () => {
    expect(parsed.imageDataUrl).toMatch(/^data:image\/png;base64,/);
  });
});
