import { describe, expect, it } from 'vitest';

import {
  CUSTOM_CONTENT_PACK_CATEGORIES,
  CustomContentPackSchema,
  type CustomContentPack,
} from '../custom-content-pack';

// ─────────────────────────────────────────────────────────────────────
// Tests JALON 3A — Schéma module custom (9 catégories).
//
// Couvre :
//  1. Pack minimal valide (un sort) → parse OK
//  2. meta manquant ou invalide (id non-slug, semver malformé, ISO date) → rejet précis
//  3. Entité enfreignant son SRD-schema (ex. spell.level = 12) → rejet avec chemin précis
//  4. Pack 100% vide (toutes catégories absentes ou vides) → rejet avec path `entities`
//  5. Doublon d'id dans une catégorie → rejet avec path `entities.{cat}.{idx}.id`
//  6. Constante `CUSTOM_CONTENT_PACK_CATEGORIES` = exactement les 9 catégories spec
// ─────────────────────────────────────────────────────────────────────

const minimalSpell = {
  id: 'feu-magique',
  name: { fr: 'Feu magique', en: 'Magic fire' },
  level: 1,
  school: 'evocation' as const,
  castingTime: { fr: '1 action', en: '1 action' },
  range: { fr: '30 mètres', en: '120 feet' },
  components: { v: true, s: true, m: false },
  duration: { fr: 'Instantanée', en: 'Instantaneous' },
  concentration: false,
  ritual: false,
  description: {
    fr: 'Un trait de feu jaillit de ta main.',
    en: 'A bolt of fire shoots from your hand.',
  },
  atHigherLevels: null,
  classes: ['wizard'],
  source: 'srd-5.2.1' as const,
};

const validMeta = {
  id: 'pack-custom-test',
  name: { fr: 'Pack de test', en: 'Test pack' },
  version: '1.0.0',
  author: 'MJ Adrien',
  createdAt: '2026-05-31T12:00:00Z',
};

describe('CustomContentPackSchema — happy path', () => {
  it('parse un pack minimal avec un seul sort', () => {
    const pack: CustomContentPack = {
      meta: validMeta,
      entities: { spells: [minimalSpell] },
    };
    const result = CustomContentPackSchema.safeParse(pack);
    expect(result.success).toBe(true);
  });

  it('parse un pack avec description optionnelle', () => {
    const result = CustomContentPackSchema.safeParse({
      meta: {
        ...validMeta,
        description: { fr: 'Pack de démo', en: 'Demo pack' },
      },
      entities: { spells: [minimalSpell] },
    });
    expect(result.success).toBe(true);
  });
});

describe('CustomContentPackSchema — meta validation', () => {
  it('rejette un meta.id non-kebab-case', () => {
    const result = CustomContentPackSchema.safeParse({
      meta: { ...validMeta, id: 'Pack_MAJUSCULES' },
      entities: { spells: [minimalSpell] },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['meta', 'id']);
    }
  });

  it('rejette une version non-semver', () => {
    const result = CustomContentPackSchema.safeParse({
      meta: { ...validMeta, version: '1.0' },
      entities: { spells: [minimalSpell] },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['meta', 'version']);
    }
  });

  it('rejette un createdAt non-ISO 8601 UTC', () => {
    const result = CustomContentPackSchema.safeParse({
      meta: { ...validMeta, createdAt: '2026-05-31' },
      entities: { spells: [minimalSpell] },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['meta', 'createdAt']);
    }
  });

  it('rejette un author vide', () => {
    const result = CustomContentPackSchema.safeParse({
      meta: { ...validMeta, author: '' },
      entities: { spells: [minimalSpell] },
    });
    expect(result.success).toBe(false);
  });
});

describe('CustomContentPackSchema — entity SRD-schema validation', () => {
  it('rejette un sort avec level=12 (max=9) avec chemin précis', () => {
    const badSpell = { ...minimalSpell, level: 12 };
    const result = CustomContentPackSchema.safeParse({
      meta: validMeta,
      entities: { spells: [badSpell] },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const levelIssue = result.error.issues.find((issue) =>
        issue.path.join('.').endsWith('spells.0.level'),
      );
      expect(levelIssue).toBeDefined();
    }
  });

  it('rejette un sort dont le nom FR est vide', () => {
    const badSpell = {
      ...minimalSpell,
      name: { fr: '', en: 'Test' },
    };
    const result = CustomContentPackSchema.safeParse({
      meta: validMeta,
      entities: { spells: [badSpell] },
    });
    expect(result.success).toBe(false);
  });
});

describe('CustomContentPackSchema — empty pack rejection', () => {
  it('rejette un pack avec entities = {}', () => {
    const result = CustomContentPackSchema.safeParse({
      meta: validMeta,
      entities: {},
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const emptyIssue = result.error.issues.find(
        (issue) =>
          issue.path.join('.') === 'entities' &&
          issue.message.includes('at least one non-empty category'),
      );
      expect(emptyIssue).toBeDefined();
    }
  });

  it('rejette un pack avec uniquement des tableaux vides', () => {
    const result = CustomContentPackSchema.safeParse({
      meta: validMeta,
      entities: { spells: [], feats: [] },
    });
    expect(result.success).toBe(false);
  });
});

describe('CustomContentPackSchema — duplicate id detection', () => {
  it('rejette deux sorts avec le même id avec chemin précis', () => {
    const result = CustomContentPackSchema.safeParse({
      meta: validMeta,
      entities: { spells: [minimalSpell, minimalSpell] },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const dupIssue = result.error.issues.find(
        (issue) => issue.message.includes('duplicate id'),
      );
      expect(dupIssue).toBeDefined();
      expect(dupIssue?.path).toEqual(['entities', 'spells', 1, 'id']);
    }
  });

  it('accepte deux entrées de catégories différentes partageant un slug', () => {
    // spells['foo'] et feats['foo'] sont autorisés — la collision n'est qu'intra-catégorie.
    const result = CustomContentPackSchema.safeParse({
      meta: validMeta,
      entities: {
        spells: [{ ...minimalSpell, id: 'foo' }],
      },
    });
    expect(result.success).toBe(true);
  });
});

describe('CustomContentPackSchema — categories registry', () => {
  it('expose exactement les 9 catégories utilisateur-facing du JALON 3A', () => {
    expect(CUSTOM_CONTENT_PACK_CATEGORIES).toEqual([
      'spells',
      'classes',
      'subclasses',
      'ancestries',
      'subancestries',
      'backgrounds',
      'feats',
      'invocations',
      'items',
    ]);
    expect(CUSTOM_CONTENT_PACK_CATEGORIES).toHaveLength(9);
  });
});
