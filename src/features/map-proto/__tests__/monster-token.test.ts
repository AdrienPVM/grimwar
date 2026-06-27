import { describe, expect, it } from 'vitest';

import type { Monster } from '@/shared/types/content';

import { monsterToTokenInput, type MonsterTokenOptions } from '../monster-token';

/**
 * Autofill carte depuis un monstre (directive 2026-06-27) — tests d'IDENTITÉ :
 * on asserte les valeurs EXACTES produites (label dédoublonné, vision tirée du
 * bloc de stats, kind PNJ), pas juste « un token est produit ».
 */

const GOBLIN: Monster = {
  id: 'gobelin',
  name: { fr: 'Gobelin', en: 'Goblin' },
  size: 'small',
  type: 'humanoïde',
  alignment: { fr: 'Neutre mauvais', en: 'Neutral Evil' },
  ac: 15,
  acDetail: null,
  hp: { avg: 7, formula: '2d6' },
  speed: { walk: 30 },
  abilities: { for: 8, dex: 14, con: 10, int: 10, sag: 8, cha: 8 },
  saves: {},
  skills: {},
  resistances: [],
  immunities: [],
  vulnerabilities: [],
  conditionImmunities: [],
  senses: { darkvision: 60, passivePerception: 9 },
  languages: [],
  cr: 0.25,
  xp: 50,
  traits: [],
  actions: [],
  reactions: null,
  legendaryActions: null,
  source: 'srd-5.2.1',
};

const BASE_OPTS: MonsterTokenOptions = {
  center: { x: 500, y: 350 },
  color: '#f87171',
  fallbackVisionFt: 30,
  existingLabels: [],
  bounds: { width: 1000, height: 700, radius: 22 },
};

describe('monsterToTokenInput', () => {
  it('mappe nom, kind PNJ, couleur et position centrale', () => {
    const input = monsterToTokenInput(GOBLIN, BASE_OPTS);
    expect(input.kind).toBe('pnj');
    expect(input.label).toBe('Gobelin');
    expect(input.color).toBe('#f87171');
    expect(input.position).toEqual({ x: 500, y: 350 });
  });

  it('tire le rayon de vision de la vision dans le noir du monstre (60 ft exact)', () => {
    const input = monsterToTokenInput(GOBLIN, BASE_OPTS);
    expect(input.visionRadius).toBe(60);
  });

  it('retombe sur la vision normale (30 ft) si le monstre n’a pas de vision dans le noir', () => {
    const noDarkvision: Monster = {
      ...GOBLIN,
      senses: { passivePerception: 10 },
    };
    const input = monsterToTokenInput(noDarkvision, BASE_OPTS);
    expect(input.visionRadius).toBe(30);
  });

  it('numérote le 2ᵉ exemplaire (« Gobelin 2 ») et le décale en cascade', () => {
    const input = monsterToTokenInput(GOBLIN, {
      ...BASE_OPTS,
      existingLabels: ['Gobelin'],
    });
    expect(input.label).toBe('Gobelin 2');
    // index 2 → décalage diagonal de 26 px depuis le centre.
    expect(input.position).toEqual({ x: 526, y: 376 });
  });

  it('continue la numérotation (« Gobelin 3 ») au-delà du nom nu + suffixé', () => {
    const input = monsterToTokenInput(GOBLIN, {
      ...BASE_OPTS,
      existingLabels: ['Gobelin', 'Gobelin 2'],
    });
    expect(input.label).toBe('Gobelin 3');
  });

  it('ignore les jetons d’un AUTRE nom pour la numérotation', () => {
    const input = monsterToTokenInput(GOBLIN, {
      ...BASE_OPTS,
      existingLabels: ['Orque', 'PJ-1'],
    });
    expect(input.label).toBe('Gobelin');
  });

  it('échappe les métacaractères regex d’un nom (« Mimic (+1) »)', () => {
    const tricky: Monster = {
      ...GOBLIN,
      name: { fr: 'Mimic (+1)', en: 'Mimic (+1)' },
    };
    const input = monsterToTokenInput(tricky, {
      ...BASE_OPTS,
      existingLabels: ['Mimic (+1)'],
    });
    expect(input.label).toBe('Mimic (+1) 2');
  });

  it('borne le décalage pour garder le jeton entièrement dans le viewBox', () => {
    // Centre déjà en coin bas-droit : le décalage du doublon ne doit pas sortir.
    const input = monsterToTokenInput(GOBLIN, {
      ...BASE_OPTS,
      center: { x: 990, y: 690 },
      existingLabels: ['Gobelin'],
    });
    expect(input.position).toEqual({ x: 978, y: 678 }); // width-radius, height-radius
  });

  it('retombe sur « Créature » si le nom localisé est vide', () => {
    const nameless: Monster = { ...GOBLIN, name: { fr: '   ', en: '' } };
    const input = monsterToTokenInput(nameless, BASE_OPTS);
    expect(input.label).toBe('Créature');
  });
});
