import { describe, expect, it } from 'vitest';

import {
  Dd2vttParseError,
  normalizeDd2vttColor,
  parseDd2vtt,
  sniffImageMime,
} from '../dd2vtt';
import { MAP_VIEWBOX_H, MAP_VIEWBOX_W } from '../map-viewport';

/**
 * Tests du parseur `.dd2vtt`. Vérité du contenu : on asserte les VALEURS
 * exactes des conversions (coords cases → viewBox), pas juste « ça parse ».
 */

function makeDd2vtt(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    format: 0.3,
    resolution: {
      map_origin: { x: 0, y: 0 },
      map_size: { x: 10, y: 7 }, // → sx = 100, sy = 100
      pixels_per_grid: 100,
    },
    line_of_sight: [
      [
        { x: 0, y: 0 },
        { x: 2, y: 3 },
        { x: 5, y: 3 },
      ],
    ],
    portals: [],
    lights: [],
    ...overrides,
  });
}

describe('parseDd2vtt — conversion de coordonnées', () => {
  it('projette les coords cases dans le viewBox avec sx/sy indépendants', () => {
    const parsed = parseDd2vtt(makeDd2vtt());
    // sx = 1000/10 = 100, sy = 700/7 = 100
    expect(parsed.walls).toHaveLength(1);
    expect(parsed.walls[0]!.points).toEqual([
      { x: 0, y: 0 },
      { x: 200, y: 300 },
      { x: 500, y: 300 },
    ]);
  });

  it('compte les sommets de murs', () => {
    const parsed = parseDd2vtt(makeDd2vtt());
    expect(parsed.wallVertexCount).toBe(3);
  });

  it('expose les dimensions et le pixels_per_grid déclarés', () => {
    const parsed = parseDd2vtt(makeDd2vtt());
    expect(parsed.mapSizeSquares).toEqual({ x: 10, y: 7 });
    expect(parsed.pixelsPerGrid).toBe(100);
  });

  it('utilise un viewBox cohérent avec map-viewport', () => {
    // map_size carré → sx == sy ; un point au coin (10,7) tombe sur (W,H).
    const parsed = parseDd2vtt(
      makeDd2vtt({
        line_of_sight: [
          [
            { x: 0, y: 0 },
            { x: 10, y: 7 },
          ],
        ],
      }),
    );
    expect(parsed.walls[0]!.points[1]).toEqual({
      x: MAP_VIEWBOX_W,
      y: MAP_VIEWBOX_H,
    });
  });
});

describe('parseDd2vtt — murs, portes, objets', () => {
  it('ignore une polyligne de moins de 2 points', () => {
    const parsed = parseDd2vtt(
      makeDd2vtt({ line_of_sight: [[{ x: 1, y: 1 }]] }),
    );
    expect(parsed.walls).toHaveLength(0);
  });

  it('agrège objects_line_of_sight aux murs', () => {
    const parsed = parseDd2vtt(
      makeDd2vtt({
        line_of_sight: [
          [
            { x: 0, y: 0 },
            { x: 1, y: 0 },
          ],
        ],
        objects_line_of_sight: [
          [
            { x: 2, y: 2 },
            { x: 3, y: 2 },
          ],
        ],
      }),
    );
    expect(parsed.walls).toHaveLength(2);
  });

  it('convertit une porte fermée en mur, ignore une porte ouverte', () => {
    const parsed = parseDd2vtt(
      makeDd2vtt({
        line_of_sight: [],
        portals: [
          {
            closed: true,
            bounds: [
              { x: 1, y: 1 },
              { x: 2, y: 1 },
            ],
          },
          {
            closed: false,
            bounds: [
              { x: 4, y: 4 },
              { x: 5, y: 4 },
            ],
          },
        ],
      }),
    );
    expect(parsed.walls).toHaveLength(1);
    expect(parsed.walls[0]!.id).toContain('portal');
  });
});

describe('parseDd2vtt — lumières', () => {
  it('convertit position et range en pixels viewBox', () => {
    const parsed = parseDd2vtt(
      makeDd2vtt({
        lights: [
          { position: { x: 5, y: 3 }, range: 2, color: 'ff8800' },
        ],
      }),
    );
    expect(parsed.lights).toHaveLength(1);
    const light = parsed.lights[0]!;
    expect(light.position).toEqual({ x: 500, y: 300 });
    // `range` = portée de lumière VIVE : 2 cases × échelle moyenne 100 = 200 px.
    // La lumière FAIBLE porte au double, comme toute source du SRD.
    expect(light.brightRadius).toBe(200);
    expect(light.dimRadius).toBe(400);
    expect(light.color).toBe('#ff8800');
    expect(light.preset).toBeNull();
  });

  it('ignore une lumière de range nul', () => {
    const parsed = parseDd2vtt(
      makeDd2vtt({ lights: [{ position: { x: 1, y: 1 }, range: 0 }] }),
    );
    expect(parsed.lights).toHaveLength(0);
  });
});

describe('parseDd2vtt — image', () => {
  it('produit un data URL quand image présente', () => {
    const parsed = parseDd2vtt(makeDd2vtt({ image: 'QUJD' }));
    expect(parsed.imageDataUrl).toBe('data:image/png;base64,QUJD');
  });

  it('renvoie null sans image', () => {
    const parsed = parseDd2vtt(makeDd2vtt());
    expect(parsed.imageDataUrl).toBeNull();
  });
});

describe('parseDd2vtt — erreurs', () => {
  it('jette sur JSON illisible', () => {
    expect(() => parseDd2vtt('{not json')).toThrow(Dd2vttParseError);
  });

  it('jette sans resolution.map_size', () => {
    expect(() =>
      parseDd2vtt(JSON.stringify({ resolution: { pixels_per_grid: 100 } })),
    ).toThrow(Dd2vttParseError);
  });

  it('jette sans pixels_per_grid', () => {
    expect(() =>
      parseDd2vtt(
        JSON.stringify({ resolution: { map_size: { x: 5, y: 5 } } }),
      ),
    ).toThrow(Dd2vttParseError);
  });

  it('jette sur map_size dégénéré (≤ 0)', () => {
    expect(() =>
      parseDd2vtt(
        JSON.stringify({
          resolution: { map_size: { x: 0, y: 5 }, pixels_per_grid: 100 },
        }),
      ),
    ).toThrow(Dd2vttParseError);
  });
});

describe('parseDd2vtt — map_origin (export partiel)', () => {
  it("soustrait l'origine des coordonnées de murs", () => {
    // Cadre exporté à partir de la case (4,2) : un mur déclaré en (4,2)→(6,2)
    // est au COIN de la carte, pas au milieu.
    const parsed = parseDd2vtt(
      makeDd2vtt({
        resolution: {
          map_origin: { x: 4, y: 2 },
          map_size: { x: 10, y: 7 },
          pixels_per_grid: 100,
        },
        line_of_sight: [
          [
            { x: 4, y: 2 },
            { x: 6, y: 2 },
          ],
        ],
      }),
    );
    expect(parsed.walls[0]!.points).toEqual([
      { x: 0, y: 0 },
      { x: 200, y: 0 },
    ]);
  });

  it("soustrait l'origine des positions de lumière", () => {
    const parsed = parseDd2vtt(
      makeDd2vtt({
        resolution: {
          map_origin: { x: 4, y: 2 },
          map_size: { x: 10, y: 7 },
          pixels_per_grid: 100,
        },
        lights: [{ position: { x: 9, y: 5 }, range: 1 }],
      }),
    );
    expect(parsed.lights[0]!.position).toEqual({ x: 500, y: 300 });
  });

  it('traite une origine absente comme nulle', () => {
    const parsed = parseDd2vtt(
      makeDd2vtt({
        resolution: { map_size: { x: 10, y: 7 }, pixels_per_grid: 100 },
      }),
    );
    expect(parsed.walls[0]!.points[0]).toEqual({ x: 0, y: 0 });
  });
});

describe('parseDd2vtt — environment.baked_lighting', () => {
  it('remonte un éclairage déjà appliqué à l’image', () => {
    const parsed = parseDd2vtt(
      makeDd2vtt({ environment: { baked_lighting: true } }),
    );
    expect(parsed.bakedLighting).toBe(true);
  });

  it('vaut false sans bloc environment', () => {
    expect(parseDd2vtt(makeDd2vtt()).bakedLighting).toBe(false);
  });
});

describe('sniffImageMime', () => {
  it('reconnaît un PNG à son préfixe base64', () => {
    expect(sniffImageMime('iVBORw0KGgoAAAANS')).toBe('image/png');
  });
  it('reconnaît un WEBP (le format alternatif de la spec)', () => {
    expect(sniffImageMime('UklGRiIAAABXRUJQ')).toBe('image/webp');
  });
  it('reconnaît un JPEG', () => {
    expect(sniffImageMime('/9j/4AAQSkZJRg')).toBe('image/jpeg');
  });
  it('retombe sur PNG, le défaut historique du format', () => {
    expect(sniffImageMime('ZZZZ')).toBe('image/png');
  });

  it("étiquette le data URL d'après le contenu réel", () => {
    const parsed = parseDd2vtt(makeDd2vtt({ image: 'UklGRiIAAABXRUJQ' }));
    expect(parsed.imageDataUrl).toBe('data:image/webp;base64,UklGRiIAAABXRUJQ');
  });
});

describe('normalizeDd2vttColor', () => {
  it('tronque RRGGBBAA en #rrggbb', () => {
    expect(normalizeDd2vttColor('ffffffff')).toBe('#ffffff');
  });
  it('accepte RRGGBB', () => {
    expect(normalizeDd2vttColor('ff0000')).toBe('#ff0000');
  });
  it('strippe le # initial', () => {
    expect(normalizeDd2vttColor('#abcdef')).toBe('#abcdef');
  });
  it('renvoie null sur entrée invalide', () => {
    expect(normalizeDd2vttColor('xyz')).toBeNull();
    expect(normalizeDd2vttColor('')).toBeNull();
    expect(normalizeDd2vttColor(undefined)).toBeNull();
  });
});
