import type { SpellSchool } from '@/shared/types/content';

/**
 * Plan 38 — Générateur procédural de sceaux de sort.
 *
 * Chaque sort du SRD reçoit un sceau SVG tracé à l'incantation. La géométrie
 * dérive de l'école (forme de base), du niveau (richesse de l'ornementation) et
 * des composantes V/S/M (fioritures). Le tout est **déterministe par identifiant
 * de sort** : un PRNG amorcé par le hash de l'id garantit que « Boule de feu »
 * trace toujours le même sceau, sans aucun asset (zéro poids de bundle).
 *
 * Sortie : une liste de chemins SVG ordonnés (le tracé suit cet ordre), chacun
 * avec une épaisseur de trait et un délai d'animation. Le viewBox est fixé à
 * 100×100, centre (50, 50).
 */

export interface SigilInput {
  /** Identifiant du sort (slug) — amorce du PRNG, garant du déterminisme. */
  spellId: string;
  school: SpellSchool;
  level: number;
  components: { v: boolean; s: boolean; m: boolean };
}

export interface SigilPath {
  /** Attribut `d` du chemin SVG. */
  d: string;
  /** Épaisseur du trait (unités viewBox). */
  width: number;
  /** Décalage de départ du tracé (ms) pour l'effet de stagger. */
  delay: number;
}

export interface SpellSigil {
  spellId: string;
  school: SpellSchool;
  /** Couleur d'école (hex), issue des tokens du design system. */
  color: string;
  viewBox: string;
  paths: SigilPath[];
}

/**
 * École → couleur. Toutes les valeurs proviennent des tokens sémantiques du
 * design system (`tailwind.config.ts`) — aucune couleur inventée. Chaque école
 * a une teinte distincte pour une identité visuelle immédiate.
 */
export const SCHOOL_COLORS: Record<SpellSchool, string> = {
  abjuration: '#5e8eb4', // sapphire — protection / barrière
  conjuration: '#5dab86', // emerald — invocation
  divination: '#d4b25e', // gold — vision / révélation
  enchantment: '#ff5c8a', // ruby — charme
  evocation: '#e85a5a', // crimson — énergie brute
  illusion: '#b5a8f5', // amethyst — mirage
  necromancy: '#7c6cdb', // amethyst-deep — mort
  transmutation: '#7ddcc0', // teal — métamorphose
};

const CENTER = 50;
const VIEWBOX = '0 0 100 100';

// ── PRNG déterministe (mulberry32, amorcé par hash FNV-1a de l'id) ───────────

function hashStr(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Helpers géométriques (renvoient des chaînes `d`) ─────────────────────────

function n(v: number): string {
  return Number(v.toFixed(2)).toString();
}

function point(cx: number, cy: number, r: number, angle: number): [number, number] {
  return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
}

/** Polygone régulier fermé. */
function polygon(cx: number, cy: number, r: number, sides: number, rot: number): string {
  const cmds: string[] = [];
  for (let i = 0; i < sides; i += 1) {
    const a = rot + (i / sides) * Math.PI * 2;
    const [x, y] = point(cx, cy, r, a);
    cmds.push(`${i === 0 ? 'M' : 'L'} ${n(x)} ${n(y)}`);
  }
  cmds.push('Z');
  return cmds.join(' ');
}

/** Étoile à `points` branches (rayon externe / interne). */
function star(
  cx: number,
  cy: number,
  outer: number,
  inner: number,
  points: number,
  rot: number,
): string {
  const cmds: string[] = [];
  for (let i = 0; i < points * 2; i += 1) {
    const r = i % 2 === 0 ? outer : inner;
    const a = rot + (i / (points * 2)) * Math.PI * 2;
    const [x, y] = point(cx, cy, r, a);
    cmds.push(`${i === 0 ? 'M' : 'L'} ${n(x)} ${n(y)}`);
  }
  cmds.push('Z');
  return cmds.join(' ');
}

/** Cercle complet (deux arcs). */
function circle(cx: number, cy: number, r: number): string {
  return (
    `M ${n(cx - r)} ${n(cy)} ` +
    `A ${n(r)} ${n(r)} 0 1 1 ${n(cx + r)} ${n(cy)} ` +
    `A ${n(r)} ${n(r)} 0 1 1 ${n(cx - r)} ${n(cy)} Z`
  );
}

/** Arc partiel de `a0` à `a1` (radians). */
function arc(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const [x0, y0] = point(cx, cy, r, a0);
  const [x1, y1] = point(cx, cy, r, a1);
  const large = Math.abs(a1 - a0) > Math.PI ? 1 : 0;
  const sweep = a1 > a0 ? 1 : 0;
  return `M ${n(x0)} ${n(y0)} A ${n(r)} ${n(r)} 0 ${large} ${sweep} ${n(x1)} ${n(y1)}`;
}

/** Spirale échantillonnée en polyligne. */
function spiral(
  cx: number,
  cy: number,
  startR: number,
  endR: number,
  turns: number,
  rot: number,
): string {
  const steps = Math.max(24, Math.round(turns * 16));
  const cmds: string[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const a = rot + t * turns * Math.PI * 2;
    const r = startR + (endR - startR) * t;
    const [x, y] = point(cx, cy, r, a);
    cmds.push(`${i === 0 ? 'M' : 'L'} ${n(x)} ${n(y)}`);
  }
  return cmds.join(' ');
}

/** Lentille / vesica (œil) horizontale, deux arcs courbes. */
function lens(cx: number, cy: number, halfW: number, halfH: number): string {
  return (
    `M ${n(cx - halfW)} ${n(cy)} ` +
    `Q ${n(cx)} ${n(cy - halfH)} ${n(cx + halfW)} ${n(cy)} ` +
    `Q ${n(cx)} ${n(cy + halfH)} ${n(cx - halfW)} ${n(cy)} Z`
  );
}

/** Croissant (deux arcs concentriques décalés). */
function crescent(cx: number, cy: number, r: number, thickness: number, angle: number): string {
  const a0 = angle - Math.PI * 0.55;
  const a1 = angle + Math.PI * 0.55;
  const [ox0, oy0] = point(cx, cy, r, a0);
  const [ox1, oy1] = point(cx, cy, r, a1);
  const ir = r - thickness;
  const [ix1, iy1] = point(cx, cy, ir, a1);
  const [ix0, iy0] = point(cx, cy, ir, a0);
  return (
    `M ${n(ox0)} ${n(oy0)} ` +
    `A ${n(r)} ${n(r)} 0 0 1 ${n(ox1)} ${n(oy1)} ` +
    `L ${n(ix1)} ${n(iy1)} ` +
    `A ${n(ir)} ${n(ir)} 0 0 0 ${n(ix0)} ${n(iy0)} Z`
  );
}

/** Triangle « rayon » pointant vers l'extérieur depuis le centre. */
function ray(cx: number, cy: number, baseR: number, tipR: number, angle: number, spread: number): string {
  const [tx, ty] = point(cx, cy, tipR, angle);
  const [bx0, by0] = point(cx, cy, baseR, angle - spread);
  const [bx1, by1] = point(cx, cy, baseR, angle + spread);
  return `M ${n(bx0)} ${n(by0)} L ${n(tx)} ${n(ty)} L ${n(bx1)} ${n(by1)} Z`;
}

// ── Constructeurs par école ──────────────────────────────────────────────────

type Shape = { d: string; width: number };
type Builder = (rng: () => number, level: number) => Shape[];

const BASE_R = 30;

/** Abjuration — sceau de protection : polygone(s) imbriqué(s). */
const abjuration: Builder = (rng, level) => {
  const sides = 5 + Math.floor(rng() * 3); // 5..7
  const rot = rng() * Math.PI;
  const shapes: Shape[] = [{ d: polygon(CENTER, CENTER, BASE_R, sides, rot), width: 2.4 }];
  if (level >= 2) {
    shapes.push({ d: polygon(CENTER, CENTER, BASE_R * 0.62, sides, rot + Math.PI / sides), width: 1.8 });
  }
  if (level >= 4) shapes.push({ d: circle(CENTER, CENTER, BASE_R * 0.34), width: 1.6 });
  if (level >= 6) {
    for (let i = 0; i < sides; i += 1) {
      const a = rot + (i / sides) * Math.PI * 2;
      const [x, y] = point(CENTER, CENTER, BASE_R + 4, a);
      shapes.push({ d: circle(x, y, 1.6), width: 1.2 });
    }
  }
  return shapes;
};

/** Invocation (conjuration) — étoile multi-branches + cercle d'invocation. */
const conjuration: Builder = (rng, level) => {
  const pts = 5 + (level >= 3 ? 1 : 0) + (level >= 6 ? 1 : 0); // 5..7
  const rot = rng() * Math.PI;
  const shapes: Shape[] = [
    { d: circle(CENTER, CENTER, BASE_R), width: 1.8 },
    { d: star(CENTER, CENTER, BASE_R * 0.92, BASE_R * 0.4, pts, rot), width: 2.2 },
  ];
  if (level >= 4) shapes.push({ d: star(CENTER, CENTER, BASE_R * 0.46, BASE_R * 0.2, pts, rot + Math.PI / pts), width: 1.5 });
  return shapes;
};

/** Divination — œil / lentille + pupille + cils rayonnants. */
const divination: Builder = (rng, level) => {
  const shapes: Shape[] = [
    { d: lens(CENTER, CENTER, BASE_R, BASE_R * 0.6), width: 2.2 },
    { d: circle(CENTER, CENTER, BASE_R * 0.22), width: 2 },
  ];
  const lashes = 6 + Math.min(8, level);
  for (let i = 0; i < lashes; i += 1) {
    const a = (i / lashes) * Math.PI * 2 + rng() * 0.1;
    const [x0, y0] = point(CENTER, CENTER, BASE_R * 0.7, a);
    const [x1, y1] = point(CENTER, CENTER, BASE_R * (0.9 + rng() * 0.15), a);
    shapes.push({ d: `M ${n(x0)} ${n(y0)} L ${n(x1)} ${n(y1)}`, width: 1.2 });
  }
  if (level >= 5) shapes.push({ d: circle(CENTER, CENTER, BASE_R * 1.05), width: 1.4 });
  return shapes;
};

/** Enchantement — cercles entrelacés (triquetra). */
const enchantment: Builder = (rng, level) => {
  const r = BASE_R * 0.56;
  const orbit = BASE_R * 0.42;
  const baseRot = rng() * Math.PI;
  const count = 3 + (level >= 4 ? 1 : 0) + (level >= 8 ? 1 : 0);
  const shapes: Shape[] = [];
  for (let i = 0; i < count; i += 1) {
    const a = baseRot + (i / count) * Math.PI * 2;
    const [x, y] = point(CENTER, CENTER, orbit, a);
    shapes.push({ d: circle(x, y, r), width: 1.8 });
  }
  shapes.push({ d: circle(CENTER, CENTER, BASE_R * 0.16), width: 1.6 });
  return shapes;
};

/** Évocation — éclats triangulaires rayonnants + cœur. */
const evocation: Builder = (rng, level) => {
  const rays = 5 + Math.min(7, level);
  const rot = rng() * Math.PI;
  const shapes: Shape[] = [{ d: circle(CENTER, CENTER, BASE_R * 0.28), width: 2 }];
  for (let i = 0; i < rays; i += 1) {
    const a = rot + (i / rays) * Math.PI * 2;
    shapes.push({ d: ray(CENTER, CENTER, BASE_R * 0.34, BASE_R, a, 0.22), width: 1.8 });
  }
  if (level >= 5) {
    for (let i = 0; i < rays; i += 1) {
      const a = rot + ((i + 0.5) / rays) * Math.PI * 2;
      shapes.push({ d: ray(CENTER, CENTER, BASE_R * 0.3, BASE_R * 0.6, a, 0.12), width: 1.4 });
    }
  }
  return shapes;
};

/** Illusion — spirale(s) + point central. */
const illusion: Builder = (rng, level) => {
  const rot = rng() * Math.PI * 2;
  const turns = 2 + level * 0.25;
  const shapes: Shape[] = [{ d: spiral(CENTER, CENTER, BASE_R * 0.12, BASE_R, turns, rot), width: 2 }];
  if (level >= 3) shapes.push({ d: spiral(CENTER, CENTER, BASE_R * 0.12, BASE_R * 0.78, turns * 0.8, rot + Math.PI), width: 1.4 });
  shapes.push({ d: circle(CENTER, CENTER, 1.6), width: 1.6 });
  if (level >= 6) shapes.push({ d: circle(CENTER, CENTER, BASE_R * 1.04), width: 1.2 });
  return shapes;
};

/** Nécromancie — croissants disposés en couronne + noyau. */
const necromancy: Builder = (rng, level) => {
  const count = 3 + (level >= 4 ? 1 : 0) + (level >= 7 ? 1 : 0);
  const baseRot = rng() * Math.PI;
  const shapes: Shape[] = [];
  for (let i = 0; i < count; i += 1) {
    const a = baseRot + (i / count) * Math.PI * 2;
    shapes.push({ d: crescent(CENTER, CENTER, BASE_R, BASE_R * 0.28, a), width: 1.8 });
  }
  shapes.push({ d: circle(CENTER, CENTER, BASE_R * 0.2), width: 1.8 });
  if (level >= 5) shapes.push({ d: circle(CENTER, CENTER, BASE_R * 0.42), width: 1.3 });
  return shapes;
};

/** Transmutation — ouroboros (arc presque complet) + flèche + boucle. */
const transmutation: Builder = (rng, level) => {
  const rot = rng() * Math.PI * 2;
  const a0 = rot;
  const a1 = rot + Math.PI * 1.85; // ~333° → laisse l'ouverture pour la flèche
  const shapes: Shape[] = [{ d: arc(CENTER, CENTER, BASE_R, a0, a1), width: 2.2 }];
  // Pointe de flèche à la fin de l'arc.
  const [hx, hy] = point(CENTER, CENTER, BASE_R, a1);
  const tangent = a1 + Math.PI / 2;
  const [b0x, b0y] = point(hx, hy, 5, tangent + 2.4);
  const [b1x, b1y] = point(hx, hy, 5, tangent - 2.4);
  shapes.push({ d: `M ${n(b0x)} ${n(b0y)} L ${n(hx)} ${n(hy)} L ${n(b1x)} ${n(b1y)}`, width: 2 });
  if (level >= 3) shapes.push({ d: spiral(CENTER, CENTER, BASE_R * 0.12, BASE_R * 0.5, 1.5, rot), width: 1.5 });
  if (level >= 6) shapes.push({ d: arc(CENTER, CENTER, BASE_R * 0.64, a0 + 0.4, a1 - 0.4), width: 1.4 });
  return shapes;
};

const BUILDERS: Record<SpellSchool, Builder> = {
  abjuration,
  conjuration,
  divination,
  enchantment,
  evocation,
  illusion,
  necromancy,
  transmutation,
};

// ── Fioritures de composantes ────────────────────────────────────────────────

/** V (verbale) — pétales aux points cardinaux. */
function verbalFlourish(rng: () => number): Shape[] {
  const rot = rng() * 0.6;
  const shapes: Shape[] = [];
  for (let i = 0; i < 4; i += 1) {
    const a = rot + (i / 4) * Math.PI * 2;
    const [cx, cy] = point(CENTER, CENTER, BASE_R + 6, a);
    shapes.push({ d: lens(cx, cy, 4, 2.2), width: 1.2 });
  }
  return shapes;
}

/** S (somatique) — runes en S aux diagonales. */
function somaticFlourish(rng: () => number): Shape[] {
  const rot = Math.PI / 4 + rng() * 0.4;
  const shapes: Shape[] = [];
  for (let i = 0; i < 4; i += 1) {
    const a = rot + (i / 4) * Math.PI * 2;
    const [cx, cy] = point(CENTER, CENTER, BASE_R + 6, a);
    const [p0x, p0y] = point(cx, cy, 3, a);
    const [p1x, p1y] = point(cx, cy, 3, a + Math.PI);
    shapes.push({
      d: `M ${n(p0x)} ${n(p0y)} Q ${n(cx + 2)} ${n(cy)} ${n(cx)} ${n(cy)} Q ${n(cx - 2)} ${n(cy)} ${n(p1x)} ${n(p1y)}`,
      width: 1.2,
    });
  }
  return shapes;
}

/** M (matérielle) — cercle de liaison extérieur. */
function materialFlourish(): Shape[] {
  return [{ d: circle(CENTER, CENTER, BASE_R + 11), width: 1.4 }];
}

// ── Cache + API publique ─────────────────────────────────────────────────────

const cache = new Map<string, SpellSigil>();

/**
 * Génère (ou récupère depuis le cache mémoire) le sceau d'un sort. Déterministe :
 * même entrée → même sortie. Le délai de tracé est calculé par ordre de chemin
 * (stagger 90 ms), les fioritures de composantes — ajoutées en dernier — se
 * tracent donc après les formes d'école.
 */
export function generateSigil(input: SigilInput): SpellSigil {
  const c = input.components;
  const key = `${input.spellId}|${input.school}|${input.level}|${c.v ? 1 : 0}${c.s ? 1 : 0}${c.m ? 1 : 0}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const rng = mulberry32(hashStr(input.spellId || input.school));
  const shapes = BUILDERS[input.school](rng, input.level);
  if (c.v) shapes.push(...verbalFlourish(rng));
  if (c.s) shapes.push(...somaticFlourish(rng));
  if (c.m) shapes.push(...materialFlourish());

  const paths: SigilPath[] = shapes.map((s, i) => ({
    d: s.d,
    width: s.width,
    delay: i * 90,
  }));

  const sigil: SpellSigil = {
    spellId: input.spellId,
    school: input.school,
    color: SCHOOL_COLORS[input.school],
    viewBox: VIEWBOX,
    paths,
  };
  cache.set(key, sigil);
  return sigil;
}

/** Réinitialise le cache mémoire (tests). */
export function _clearSigilCache(): void {
  cache.clear();
}
