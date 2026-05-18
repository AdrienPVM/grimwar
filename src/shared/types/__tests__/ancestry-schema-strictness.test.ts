import { describe, expect, it } from 'vitest';

import { AncestrySchema } from '../content';

/**
 * Regression — schéma `Ancestry` strict (plan 13.8 UAT 2026-05-17, 2e passe).
 *
 * Avant fix : `AncestryOptionsSchema.default({})` autorisait silencieusement
 * une entrée d'ascendance sans sous-options pourtant requises par SRD —
 * Drakéide sans `dragonAncestries` était accepté → bundle dégradé en cache →
 * section vide silencieuse en UI.
 *
 * Après fix : `superRefine` rejette toute entrée des 6 ascendances à
 * sous-choix L1 qui n'a pas son tableau correspondant non vide. La conséquence
 * pratique côté loader : `safeParse` échoue sur la row Dexie stale, le
 * `loadPublicContent` invalide la row et fetch frais depuis le bundle disque
 * (sain).
 *
 * Rouge avant vert : sur le schéma pré-fix (avec `.default({})`), tous les
 * `safeParse` ici renvoient `.success === true` — tous les `expect(...
 * .success).toBe(false)` cassent. Sur le schéma patché, ils passent.
 */

const BASE_ANCESTRY = {
  size: 'medium' as const,
  speed: 30,
  description: { fr: 'Description.', en: 'Description.' },
  abilityScoreIncrease: [],
  traits: [],
  languages: ['common'],
  source: 'srd-5.2.1' as const,
};

describe('AncestrySchema — superRefine rejette options manquantes/vides', () => {
  it('Drakéide sans options.dragonAncestries → safeParse échoue', () => {
    const result = AncestrySchema.safeParse({
      ...BASE_ANCESTRY,
      id: 'dragonborn',
      name: { fr: 'Drakéide', en: 'Dragonborn' },
      options: {},
    });
    expect(result.success).toBe(false);
  });

  it('Drakéide avec dragonAncestries vide → safeParse échoue', () => {
    const result = AncestrySchema.safeParse({
      ...BASE_ANCESTRY,
      id: 'dragonborn',
      name: { fr: 'Drakéide', en: 'Dragonborn' },
      options: { dragonAncestries: [] },
    });
    expect(result.success).toBe(false);
  });

  it('Drakéide avec 1 dragon → safeParse passe', () => {
    const result = AncestrySchema.safeParse({
      ...BASE_ANCESTRY,
      id: 'dragonborn',
      name: { fr: 'Drakéide', en: 'Dragonborn' },
      options: {
        dragonAncestries: [
          {
            id: 'red',
            name: { fr: 'Rouge', en: 'Red' },
            damageType: 'fire',
            damageTypeLabel: { fr: 'Feu', en: 'Fire' },
          },
        ],
      },
    });
    expect(result.success).toBe(true);
  });

  it('Goliath sans giantAncestries → safeParse échoue', () => {
    const result = AncestrySchema.safeParse({
      ...BASE_ANCESTRY,
      id: 'goliath',
      name: { fr: 'Goliath', en: 'Goliath' },
      options: {},
    });
    expect(result.success).toBe(false);
  });

  it('Elfe sans elfLineages → safeParse échoue', () => {
    const result = AncestrySchema.safeParse({
      ...BASE_ANCESTRY,
      id: 'elf',
      name: { fr: 'Elfe', en: 'Elf' },
      options: {},
    });
    expect(result.success).toBe(false);
  });

  it('Gnome sans gnomeLineages → safeParse échoue', () => {
    const result = AncestrySchema.safeParse({
      ...BASE_ANCESTRY,
      id: 'gnome',
      name: { fr: 'Gnome', en: 'Gnome' },
      options: {},
    });
    expect(result.success).toBe(false);
  });

  it('Tieffelin sans tieflingLegacies → safeParse échoue', () => {
    const result = AncestrySchema.safeParse({
      ...BASE_ANCESTRY,
      id: 'tiefling',
      name: { fr: 'Tieffelin', en: 'Tiefling' },
      options: {},
    });
    expect(result.success).toBe(false);
  });

  it('Humain sans skillfulOptions → safeParse échoue', () => {
    const result = AncestrySchema.safeParse({
      ...BASE_ANCESTRY,
      id: 'human',
      name: { fr: 'Humain', en: 'Human' },
      options: {},
    });
    expect(result.success).toBe(false);
  });

  it('Nain sans sous-options → safeParse passe (pas de sous-choix L1)', () => {
    const result = AncestrySchema.safeParse({
      ...BASE_ANCESTRY,
      id: 'dwarf',
      name: { fr: 'Nain', en: 'Dwarf' },
      options: {},
    });
    expect(result.success).toBe(true);
  });

  it('options absent (cache pré-13.7) → safeParse échoue (options est requis)', () => {
    const result = AncestrySchema.safeParse({
      ...BASE_ANCESTRY,
      id: 'dragonborn',
      name: { fr: 'Drakéide', en: 'Dragonborn' },
      // pas de champ `options` — simule cache pré-13.7
    });
    expect(result.success).toBe(false);
  });
});
