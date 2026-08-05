import { describe, expect, it } from 'vitest';

import type { Npc } from '@/shared/types/npc';

import {
  collectNpcFacets,
  EMPTY_NPC_FILTER,
  filterNpcs,
  sortNpcs,
} from '../npc-filter';

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
    const r = filterNpcs(LIST, {
      ...EMPTY_NPC_FILTER,
      role: 'merchant',
      tag: 'recurring',
      location: 'Valombre',
    });
    expect(r.map((n) => n.id)).toEqual(['a']);
  });

  it('renvoie vide si aucun PNJ ne satisfait tous les critères', () => {
    const r = filterNpcs(LIST, { ...EMPTY_NPC_FILTER, role: 'enemy', tag: 'magic' });
    expect(r).toHaveLength(0);
  });
});

describe('filterNpcs — recherche texte (M41)', () => {
  const SEARCHABLE: Npc[] = [
    npc({
      id: 'aldric',
      name: 'Aldric',
      location: 'Valombre',
      shortDescription: 'Marchand bourru.',
      tags: ['receleur'],
      dmNotes: 'Il trahira au chapitre 3.',
    }),
    npc({ id: 'belric', name: 'Belric', location: 'Donjon' }),
    npc({ id: 'elyas', name: 'Frère Élyas', location: 'Temple' }),
  ];

  it('retrouve un PNJ par son nom', () => {
    const r = filterNpcs(SEARCHABLE, { ...EMPTY_NPC_FILTER, query: 'aldric' });
    expect(r.map((n) => n.id)).toEqual(['aldric']);
  });

  it('ignore les accents — « elyas » trouve « Frère Élyas »', () => {
    const r = filterNpcs(SEARCHABLE, { ...EMPTY_NPC_FILTER, query: 'elyas' });
    expect(r.map((n) => n.id)).toEqual(['elyas']);
  });

  it('cherche aussi dans le lieu, l’accroche et les étiquettes', () => {
    expect(
      filterNpcs(SEARCHABLE, { ...EMPTY_NPC_FILTER, query: 'donjon' }).map((n) => n.id),
    ).toEqual(['belric']);
    expect(
      filterNpcs(SEARCHABLE, { ...EMPTY_NPC_FILTER, query: 'bourru' }).map((n) => n.id),
    ).toEqual(['aldric']);
    expect(
      filterNpcs(SEARCHABLE, { ...EMPTY_NPC_FILTER, query: 'receleur' }).map((n) => n.id),
    ).toEqual(['aldric']);
  });

  it('NE cherche PAS dans les notes MJ — l’annuaire est lu par les joueurs', () => {
    const r = filterNpcs(SEARCHABLE, { ...EMPTY_NPC_FILTER, query: 'trahira' });
    expect(r).toHaveLength(0);
  });

  it('une requête vide ou blanche laisse la liste intacte', () => {
    expect(filterNpcs(SEARCHABLE, { ...EMPTY_NPC_FILTER, query: '   ' })).toHaveLength(3);
  });

  it('se combine en ET avec les facettes', () => {
    const r = filterNpcs(SEARCHABLE, {
      ...EMPTY_NPC_FILTER,
      query: 'ric',
      location: 'Donjon',
    });
    expect(r.map((n) => n.id)).toEqual(['belric']);
  });
});

describe('sortNpcs', () => {
  const LIST_SORT: Npc[] = [
    npc({ id: 'c', name: 'Zorg' }),
    npc({ id: 'a', name: 'Élyas' }),
    npc({ id: 'b', name: 'aldric' }),
  ];

  it('« ordre de rencontre » préserve l’ordre reçu du service', () => {
    expect(sortNpcs(LIST_SORT, 'introduction').map((n) => n.id)).toEqual([
      'c',
      'a',
      'b',
    ]);
  });

  it('« alphabétique » respecte l’alphabet français (É se range avec E)', () => {
    expect(sortNpcs(LIST_SORT, 'alpha').map((n) => n.name)).toEqual([
      'aldric',
      'Élyas',
      'Zorg',
    ]);
  });

  it('ne mute pas la liste reçue', () => {
    const input = [...LIST_SORT];
    sortNpcs(input, 'alpha');
    expect(input.map((n) => n.id)).toEqual(['c', 'a', 'b']);
  });
});
