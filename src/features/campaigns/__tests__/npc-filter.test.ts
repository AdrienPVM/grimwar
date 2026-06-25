import { describe, expect, it } from 'vitest';

import type { Npc } from '@/shared/types/npc';

import { collectNpcFacets, EMPTY_NPC_FILTER, filterNpcs } from '../npc-filter';

function npc(overrides: Partial<Npc>): Npc {
  return {
    id: 'n',
    name: 'PNJ',
    role: 'other',
    location: '',
    shortDescription: '',
    publicDescription: '',
    dmNotes: '',
    portrait: { type: 'letter', value: 'P' },
    combatStats: null,
    relationships: [],
    tags: [],
    visibility: 'all',
    createdBy: 'dm',
    createdAt: { seconds: 1 },
    updatedAt: { seconds: 1 },
    ...overrides,
  };
}

const LIST: Npc[] = [
  npc({ id: 'a', role: 'merchant', location: 'Valombre', tags: ['recurring', 'magic'] }),
  npc({ id: 'b', role: 'enemy', location: 'Donjon', tags: ['recurring'] }),
  npc({ id: 'c', role: 'merchant', location: '', tags: [] }),
];

describe('collectNpcFacets', () => {
  it('collecte rôles, tags et lieux distincts (lieu vide ignoré)', () => {
    const f = collectNpcFacets(LIST);
    expect(f.roles).toEqual(['merchant', 'enemy']);
    expect(f.tags).toEqual(['magic', 'recurring']); // tri alpha FR
    expect(f.locations).toEqual(['Donjon', 'Valombre']);
  });
});

describe('filterNpcs', () => {
  it('renvoie tout sans filtre actif', () => {
    expect(filterNpcs(LIST, EMPTY_NPC_FILTER)).toHaveLength(3);
  });

  it('filtre par rôle', () => {
    const r = filterNpcs(LIST, { ...EMPTY_NPC_FILTER, role: 'merchant' });
    expect(r.map((n) => n.id)).toEqual(['a', 'c']);
  });

  it('filtre par tag', () => {
    const r = filterNpcs(LIST, { ...EMPTY_NPC_FILTER, tag: 'magic' });
    expect(r.map((n) => n.id)).toEqual(['a']);
  });

  it('filtre par lieu (comparaison exacte)', () => {
    const r = filterNpcs(LIST, { ...EMPTY_NPC_FILTER, location: 'Donjon' });
    expect(r.map((n) => n.id)).toEqual(['b']);
  });

  it('combine les filtres en ET logique', () => {
    const r = filterNpcs(LIST, { role: 'merchant', tag: 'recurring', location: 'Valombre' });
    expect(r.map((n) => n.id)).toEqual(['a']);
  });

  it('renvoie vide si aucun PNJ ne satisfait tous les critères', () => {
    const r = filterNpcs(LIST, { role: 'enemy', tag: 'magic', location: null });
    expect(r).toHaveLength(0);
  });
});
