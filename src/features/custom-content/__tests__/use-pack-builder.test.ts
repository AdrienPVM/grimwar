import { describe, expect, it } from 'vitest';

import { builderStateFromPack } from '../use-pack-builder';
import type { CustomContentPack } from '@/shared/types/custom-content-pack';

/**
 * Tests pour la conversion `CustomContentPack` → `PackBuilderState`
 * (JALON 3C.10 — load-from-pack en mode édition). On vérifie que les
 * tableaux absents sont correctement remplacés par `[]` et que la meta
 * est éclatée en champs FR/EN éditables.
 */

const baseMeta = {
  id: 'pack-existant',
  name: { fr: 'Pack existant', en: 'Existing pack' },
  version: '1.2.3',
  author: 'Adrien',
  createdAt: '2026-06-02T10:00:00Z',
  description: { fr: 'Description FR', en: 'Description EN' },
};

describe('builderStateFromPack', () => {
  it('éclate la meta i18n en champs FR/EN distincts', () => {
    const pack: CustomContentPack = {
      meta: baseMeta,
      entities: {
        feats: [
          {
            id: 'x',
            name: { fr: 'X' },
            prerequisite: null,
            summary: { fr: 'S' },
            source: 'aidedd-homebrew',
          },
        ],
      },
    };
    const state = builderStateFromPack(pack);
    expect(state.meta.id).toBe('pack-existant');
    expect(state.meta.nameFr).toBe('Pack existant');
    expect(state.meta.nameEn).toBe('Existing pack');
    expect(state.meta.version).toBe('1.2.3');
    expect(state.meta.author).toBe('Adrien');
    expect(state.meta.descriptionFr).toBe('Description FR');
    expect(state.meta.descriptionEn).toBe('Description EN');
  });

  it("EN/description optionnels → champs vides quand l'entrée est absente", () => {
    const pack: CustomContentPack = {
      meta: {
        id: 'p',
        name: { fr: 'Pack' },
        version: '1.0.0',
        author: 'A',
        createdAt: '2026-06-02T10:00:00Z',
      },
      entities: {
        feats: [
          {
            id: 'x',
            name: { fr: 'X' },
            prerequisite: null,
            summary: { fr: 'S' },
            source: 'aidedd-homebrew',
          },
        ],
      },
    };
    const state = builderStateFromPack(pack);
    expect(state.meta.nameEn).toBe('');
    expect(state.meta.descriptionFr).toBe('');
    expect(state.meta.descriptionEn).toBe('');
  });

  it('catégorie absente du pack → tableau vide dans le state', () => {
    const pack: CustomContentPack = {
      meta: baseMeta,
      entities: {
        feats: [
          {
            id: 'x',
            name: { fr: 'X' },
            prerequisite: null,
            summary: { fr: 'S' },
            source: 'aidedd-homebrew',
          },
        ],
      },
    };
    const state = builderStateFromPack(pack);
    expect(state.feats).toHaveLength(1);
    expect(state.invocations).toEqual([]);
    expect(state.subancestries).toEqual([]);
    expect(state.backgrounds).toEqual([]);
    expect(state.subclasses).toEqual([]);
    expect(state.spells).toEqual([]);
    expect(state.items).toEqual([]);
    expect(state.ancestries).toEqual([]);
    expect(state.classes).toEqual([]);
  });

  it('preserve toutes les entités sans muter la source', () => {
    const feat = {
      id: 'a',
      name: { fr: 'A' },
      prerequisite: null,
      summary: { fr: 'S' },
      source: 'aidedd-homebrew' as const,
    };
    const pack: CustomContentPack = {
      meta: baseMeta,
      entities: { feats: [feat] },
    };
    const state = builderStateFromPack(pack);
    expect(state.feats[0]).toEqual(feat);
    expect(state.feats).not.toBe(pack.entities.feats);
  });
});
