import { describe, expect, it } from 'vitest';

import { resolveCharacterLanguages } from '../character-languages';

/**
 * resolveCharacterLanguages — agrégateur de langues à l'affichage.
 *
 * Catégorie 2 (« identité, pas présence ») + catégorie 6 (cas-limites) de la
 * politique « Vérité du contenu » : on asserte les ids exacts ET l'ordre
 * (Commun en tête), la déduplication, et le filtrage des ids inconnus.
 */
describe('resolveCharacterLanguages', () => {
  it('place Commun en tête puis trie en FR (Elfique avant Orc)', () => {
    const out = resolveCharacterLanguages({
      ancestryLanguages: ['common'],
      extraLanguages: ['orc', 'elvish'],
    });
    expect(out.map((l) => l.id)).toEqual(['common', 'elvish', 'orc']);
  });

  it('résout les noms FR officiels du registre (Commun / Elfique)', () => {
    const out = resolveCharacterLanguages({
      ancestryLanguages: ['common'],
      extraLanguages: ['elvish'],
    });
    expect(out.map((l) => l.name.fr)).toEqual(['Commun', 'Elfique']);
  });

  it('déduplique une langue présente dans plusieurs sources (ascendance + extra)', () => {
    const out = resolveCharacterLanguages({
      ancestryLanguages: ['common', 'elvish'],
      extraLanguages: ['elvish'],
    });
    expect(out.map((l) => l.id)).toEqual(['common', 'elvish']);
  });

  it('agrège aussi les langues de maîtrise (extraProficiencies.languages)', () => {
    const out = resolveCharacterLanguages({
      ancestryLanguages: ['common'],
      extraLanguages: [],
      proficiencyLanguages: ['draconic'],
    });
    expect(out.map((l) => l.id)).toEqual(['common', 'draconic']);
  });

  it('ignore silencieusement un id de langue inconnu', () => {
    const out = resolveCharacterLanguages({
      ancestryLanguages: ['common'],
      extraLanguages: ['not-a-language'],
    });
    expect(out.map((l) => l.id)).toEqual(['common']);
  });

  it('renvoie une liste vide si aucune langue connue (robustesse)', () => {
    const out = resolveCharacterLanguages({
      ancestryLanguages: [],
      extraLanguages: [],
    });
    expect(out).toEqual([]);
  });
});
