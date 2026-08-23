import { describe, expect, it } from 'vitest';

import {
  builderStateFromPack,
  EMPTY_PACK_BUILDER_STATE,
  packFromBuilderState,
} from '../use-pack-builder';
import type { MagicItem, Monster } from '@/shared/types/content';
import { CustomContentPackSchema } from '@/shared/types/custom-content-pack';
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
            source: 'custom',
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
            source: 'custom',
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
            source: 'custom',
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
    expect(state.magicItems).toEqual([]);
    expect(state.monsters).toEqual([]);
  });

  it('preserve toutes les entités sans muter la source', () => {
    const feat = {
      id: 'a',
      name: { fr: 'A' },
      prerequisite: null,
      summary: { fr: 'S' },
      source: 'custom' as const,
    };
    const pack: CustomContentPack = {
      meta: baseMeta,
      entities: { feats: [feat] },
    };
    const state = builderStateFromPack(pack);
    expect(state.feats[0]).toEqual(feat);
    expect(state.feats).not.toBe(pack.entities.feats);
  });

  it('round-trip objets magiques + monstres (entité kebab ↔ state camelCase)', () => {
    const magicItem: MagicItem = {
      id: 'epee-flamme',
      name: { fr: 'Épée des flammes', en: 'Flame Tongue' },
      category: 'weapon',
      rarity: 'rare',
      attunement: true,
      magicDescription: { fr: 'Lame enflammée', en: 'Flaming blade' },
      description: null,
      source: 'custom',
    };
    const monster: Monster = {
      id: 'gobelin-roi',
      name: { fr: 'Roi gobelin', en: 'Goblin King' },
      size: 'small',
      type: 'humanoid',
      alignment: { fr: 'Mauvais', en: 'Evil' },
      ac: 15,
      acDetail: null,
      hp: { avg: 30, formula: '4d6 + 16' },
      speed: { walk: 30 },
      abilities: { for: 10, dex: 16, con: 14, int: 10, sag: 9, cha: 12 },
      saves: {},
      skills: {},
      resistances: [],
      immunities: [],
      vulnerabilities: [],
      conditionImmunities: [],
      senses: { darkvision: 60, passivePerception: 9 },
      languages: [],
      cr: 2,
      xp: 450,
      traits: [],
      actions: [],
      reactions: null,
      legendaryActions: null,
      source: 'custom',
    };

    // state camelCase → entité kebab : `pack.entities['magic-items']`.
    const pack = packFromBuilderState({
      ...EMPTY_PACK_BUILDER_STATE,
      meta: {
        ...EMPTY_PACK_BUILDER_STATE.meta,
        id: 'pack-extension',
        nameFr: 'Pack extension',
        author: 'Adrien',
      },
      magicItems: [magicItem],
      monsters: [monster],
    });
    expect(pack.entities['magic-items']).toEqual([magicItem]);
    expect(pack.entities.monsters).toEqual([monster]);
    // Le pack produit est valide pour le schéma (catégorie reconnue).
    expect(CustomContentPackSchema.safeParse(pack).success).toBe(true);

    // entité kebab → state camelCase (mode édition).
    const state = builderStateFromPack(pack);
    expect(state.magicItems).toEqual([magicItem]);
    expect(state.monsters).toEqual([monster]);
  });
});
