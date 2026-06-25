import { describe, it, expect, beforeEach } from 'vitest';

import {
  generateSigil,
  SCHOOL_COLORS,
  _clearSigilCache,
  type SigilInput,
} from '../sigils';
import type { SpellSchool } from '@/shared/types/content';

const ALL_SCHOOLS: SpellSchool[] = [
  'abjuration',
  'conjuration',
  'divination',
  'enchantment',
  'evocation',
  'illusion',
  'necromancy',
  'transmutation',
];

function input(over: Partial<SigilInput> = {}): SigilInput {
  return {
    spellId: 'boule-de-feu',
    school: 'evocation',
    level: 3,
    components: { v: true, s: true, m: true },
    ...over,
  };
}

describe('generateSigil — déterminisme', () => {
  beforeEach(() => _clearSigilCache());

  it('même entrée → sortie structurellement identique (indépendant du cache)', () => {
    const a = generateSigil(input());
    _clearSigilCache();
    const b = generateSigil(input());
    expect(b).toEqual(a);
  });

  it('le cache renvoie la même référence pour la même clé', () => {
    expect(generateSigil(input())).toBe(generateSigil(input()));
  });

  it('amorcé par le spellId : deux ids différents → géométries différentes', () => {
    // Le cœur d'évocation est volontairement invariant (rng n'affecte que la
    // rotation des rayons) — on compare donc la géométrie complète, pas paths[0].
    const a = generateSigil(input({ spellId: 'sort-a' }));
    const b = generateSigil(input({ spellId: 'sort-b' }));
    expect(a.paths.map((p) => p.d).join('|')).not.toBe(b.paths.map((p) => p.d).join('|'));
  });
});

describe('generateSigil — identité d\'école', () => {
  beforeEach(() => _clearSigilCache());

  it('SCHOOL_COLORS expose une couleur distincte par école (tokens du DS)', () => {
    const colors = ALL_SCHOOLS.map((s) => SCHOOL_COLORS[s]);
    expect(new Set(colors).size).toBe(ALL_SCHOOLS.length);
    // Valeurs figées contre les tokens tailwind.config.ts.
    expect(SCHOOL_COLORS.evocation).toBe('#e85a5a'); // crimson
    expect(SCHOOL_COLORS.divination).toBe('#d4b25e'); // gold
    expect(SCHOOL_COLORS.necromancy).toBe('#7c6cdb'); // amethyst-deep
  });

  it('le sceau porte la couleur de l\'école du sort', () => {
    for (const school of ALL_SCHOOLS) {
      const sigil = generateSigil(input({ school, spellId: `x-${school}` }));
      expect(sigil.color).toBe(SCHOOL_COLORS[school]);
      expect(sigil.school).toBe(school);
    }
  });

  it('deux écoles produisent des formes de base différentes', () => {
    const evo = generateSigil(input({ school: 'evocation', spellId: 'same' }));
    const abj = generateSigil(input({ school: 'abjuration', spellId: 'same' }));
    expect(evo.paths[0]!.d).not.toBe(abj.paths[0]!.d);
  });
});

describe('generateSigil — structure SVG', () => {
  beforeEach(() => _clearSigilCache());

  it('viewBox 100×100, tous les chemins valides, délais staggerés', () => {
    const sigil = generateSigil(input());
    expect(sigil.viewBox).toBe('0 0 100 100');
    expect(sigil.paths.length).toBeGreaterThan(0);
    sigil.paths.forEach((p, i) => {
      expect(p.d.startsWith('M')).toBe(true);
      expect(p.width).toBeGreaterThan(0);
      expect(p.delay).toBe(i * 90);
    });
  });

  it('chaque école génère un sceau non vide', () => {
    for (const school of ALL_SCHOOLS) {
      const sigil = generateSigil(input({ school, spellId: `y-${school}` }));
      expect(sigil.paths.length).toBeGreaterThan(0);
    }
  });
});

describe('generateSigil — complexité par niveau', () => {
  beforeEach(() => _clearSigilCache());

  it('un sort de haut niveau a au moins autant de chemins qu\'un sort mineur', () => {
    for (const school of ALL_SCHOOLS) {
      const cantrip = generateSigil(input({ school, level: 0, spellId: `c-${school}`, components: { v: true, s: false, m: false } }));
      const ninth = generateSigil(input({ school, level: 9, spellId: `c-${school}`, components: { v: true, s: false, m: false } }));
      expect(ninth.paths.length).toBeGreaterThanOrEqual(cantrip.paths.length);
    }
  });

  it('au moins une école s\'enrichit strictement avec le niveau', () => {
    const lo = generateSigil(input({ school: 'abjuration', level: 0, spellId: 'k', components: { v: false, s: false, m: false } }));
    const hi = generateSigil(input({ school: 'abjuration', level: 9, spellId: 'k', components: { v: false, s: false, m: false } }));
    expect(hi.paths.length).toBeGreaterThan(lo.paths.length);
  });
});

describe('generateSigil — fioritures de composantes', () => {
  beforeEach(() => _clearSigilCache());

  const base = (c: { v: boolean; s: boolean; m: boolean }) =>
    generateSigil(input({ school: 'evocation', level: 1, spellId: 'comp-test', components: c })).paths.length;

  it('V ajoute 4 pétales, S ajoute 4 runes, M ajoute 1 cercle de liaison', () => {
    const none = base({ v: false, s: false, m: false });
    expect(base({ v: true, s: false, m: false })).toBe(none + 4);
    expect(base({ v: false, s: true, m: false })).toBe(none + 4);
    expect(base({ v: false, s: false, m: true })).toBe(none + 1);
    expect(base({ v: true, s: true, m: true })).toBe(none + 9);
  });
});

describe('generateSigil — fidélité géométrique (snapshots figés)', () => {
  beforeEach(() => _clearSigilCache());

  it('Boule de feu (evocation, niv.3, VSM)', () => {
    expect(generateSigil(input())).toMatchSnapshot();
  });

  it('Trait du destin (divination, niv.0, V)', () => {
    expect(
      generateSigil(input({ spellId: 'message', school: 'divination', level: 0, components: { v: true, s: true, m: false } })),
    ).toMatchSnapshot();
  });

  it('Souhait (conjuration, niv.9, V)', () => {
    expect(
      generateSigil(input({ spellId: 'souhait', school: 'conjuration', level: 9, components: { v: true, s: false, m: false } })),
    ).toMatchSnapshot();
  });
});
