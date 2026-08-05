import { describe, expect, it } from 'vitest';

import {
  rankedCodexHits,
  searchCodexIndex,
  type IndexedHit,
} from '../browsers/codex-search-index';
import { normalizeForSearch } from '@/shared/lib/search-normalize';
import type { Condition, MagicItem, Spell } from '@/shared/types/content';

/**
 * Pertinence de la recherche transverse.
 *
 * Le défaut trouvé en UAT : chercher « entrave » répondait « Embruns
 * prismatiques ». Le texte descriptif d'une entrée pesait autant que le NOM
 * d'une autre, et le classement final était alphabétique — la réponse évidente
 * se retrouvait donc enterrée sous des entrées qui mentionnent le mot en
 * passant. Une recherche qui trouve tout mais ne classe rien ne répond pas.
 */

function spell(id: string, name: string, description: string): IndexedHit {
  return {
    key: `spells:${id}`,
    name,
    searchText: normalizeForSearch(`${name} ${description}`),
    hit: { category: 'spells', value: { id, name: { fr: name, en: '' } } as unknown as Spell },
  };
}

function condition(id: string, name: string, description: string): IndexedHit {
  return {
    key: `conditions:${id}`,
    name,
    searchText: normalizeForSearch(`${name} ${description}`),
    hit: {
      category: 'conditions',
      value: { id, name: { fr: name, en: '' } } as unknown as Condition,
    },
  };
}

function magicItem(id: string, name: string, description: string): IndexedHit {
  return {
    key: `magicItems:${id}`,
    name,
    searchText: normalizeForSearch(`${name} ${description}`),
    hit: {
      category: 'magicItems',
      value: { id, name: { fr: name, en: '' } } as unknown as MagicItem,
    },
  };
}

const CATALOG: IndexedHit[] = [
  spell('embruns', 'Embruns prismatiques', 'La créature est entravée par les embruns.'),
  spell('emprisonnement', 'Emprisonnement', 'La cible est entravée pour toujours.'),
  spell('enchevetrement', 'Enchevêtrement', 'Des lianes entravent les créatures.'),
  magicItem('anneau', 'Anneau d’action libre', 'Tu ignores l’état entravé.'),
  magicItem('baguette-entraves', 'Baguette des entraves', 'Entrave une créature.'),
  condition('entrave', 'Entravé', 'Ta vitesse tombe à 0.'),
];

describe('Recherche transverse — pertinence', () => {
  it('le nom cherché arrive AVANT les entrées qui ne font que le mentionner', () => {
    const hits = rankedCodexHits(CATALOG, 'entrave', 10);
    expect(hits[0]?.name).toBe('Entravé');
  });

  it('une correspondance en début de nom passe devant une correspondance au milieu', () => {
    const hits = rankedCodexHits(CATALOG, 'entrave', 10);
    const names = hits.map((h) => h.name);
    expect(names.indexOf('Entravé')).toBeLessThan(names.indexOf('Baguette des entraves'));
  });

  it('les entrées trouvées par leur seule description ferment la marche', () => {
    const names = rankedCodexHits(CATALOG, 'entrave', 10).map((h) => h.name);
    // « Embruns prismatiques » ne porte le mot que dans son texte.
    expect(names.indexOf('Embruns prismatiques')).toBeGreaterThan(
      names.indexOf('Baguette des entraves'),
    );
  });

  it('la limite garde les plus pertinents, pas les premiers venus', () => {
    const hits = rankedCodexHits(CATALOG, 'entrave', 2);
    expect(hits).toHaveLength(2);
    expect(hits[0]?.name).toBe('Entravé');
  });

  it('une requête trop courte ne renvoie rien', () => {
    expect(rankedCodexHits(CATALOG, 'e', 10)).toEqual([]);
    expect(rankedCodexHits(CATALOG, '', 10)).toEqual([]);
  });

  it('le classement par catégorie profite du même ordre de pertinence', () => {
    const groups = searchCodexIndex(CATALOG, 'entrave');
    const spells = groups.find((g) => g.category.id === 'spells');
    // Parmi les sorts, « Enchevêtrement » et « Emprisonnement » ne portent le
    // mot qu'en description : leur ordre interne reste alphabétique.
    expect(spells?.entries.map((e) => e.name)).toEqual([
      'Embruns prismatiques',
      'Emprisonnement',
      'Enchevêtrement',
    ]);
    const items = groups.find((g) => g.category.id === 'magicItems');
    // « Baguette des entraves » porte le mot dans son NOM : elle passe devant.
    expect(items?.entries[0]?.name).toBe('Baguette des entraves');
  });
});
