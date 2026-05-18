import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  __resetPublicCacheFreshness,
  loadPublicContent,
} from '../content-loader';
import { db as dexie } from '../dexie-db';

/**
 * Regression — cache Dexie stale rejeté par schéma strict, fetch frais
 * automatique (plan 13.8 UAT 2026-05-17, 2e passe).
 *
 * Scénario : un cache Dexie écrit avant que `AncestrySchema` n'exige les
 * sub-options non vides (cf. `superRefine`, plan 13.8 strictness) contient
 * une entrée Drakéide sans `options.dragonAncestries`. Le `contentHash` n'a
 * pas wipé (race, second onglet, profil navigateur autre). Avant fix :
 * cache servi tel quel → chooser vide silencieux. Après fix : le re-parse au
 * read échoue → `invalidatePublicContent` est appelé → fetch fresh depuis
 * `/data/ancestries.json` → cache reconstitué propre avec options peuplées.
 *
 * Rouge avant vert : sur le code pré-fix (`return cached.data as ...` sans
 * re-parse), aucun fetch n'est déclenché — le mock `fetch` n'est jamais
 * appelé sur `/data/ancestries.json`, l'assertion échoue. Sur le code patché,
 * le fetch frais est invoqué.
 */

const CONTENT_HASH_KEY = 'public:contentHash';
const HASH = 'hash-cccccccccccccccccccccccccccccccccccccccccccccccccccccccc';

const STALE_DRAGONBORN = {
  id: 'dragonborn',
  name: { fr: 'Drakéide', en: 'Dragonborn' },
  size: 'medium' as const,
  speed: 30,
  description: { fr: 'Drakéide.', en: 'Dragonborn.' },
  abilityScoreIncrease: [],
  traits: [],
  languages: ['common'],
  source: 'srd-5.2.1' as const,
  options: {}, // ← shape pré-extraction-complète : sera rejetée par superRefine.
};

const FRESH_DRAGONBORN = {
  ...STALE_DRAGONBORN,
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
};

async function seedStaleCache(): Promise<void> {
  await dexie.content.clear();
  await dexie.settings.clear();
  await dexie.content.put({
    id: '__public__',
    type: 'ancestries',
    data: [STALE_DRAGONBORN],
    fetchedAt: Date.now(),
  });
  // Hash identique côté disque/dexie → freshness considère le cache "frais"
  // et NE le wipe pas. C'est exactement le scénario où le bug est passé.
  await dexie.settings.put({ key: CONTENT_HASH_KEY, value: HASH });
}

function mockFetch(): ReturnType<typeof vi.fn> {
  // 1er call : `/data/index.json?...` → returns hash matching stored
  // 2e call : `/data/ancestries.json` → returns fresh data (only invoked
  // après que le re-parse Zod ait rejeté la row stale)
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString();
    if (url.startsWith('/data/index.json')) {
      return new Response(
        JSON.stringify({ generatedAt: 'x', counts: { ancestries: 1 }, contentHash: HASH }),
        { status: 200 },
      );
    }
    if (url.startsWith('/data/ancestries.json')) {
      return new Response(JSON.stringify([FRESH_DRAGONBORN]), { status: 200 });
    }
    return new Response('', { status: 404 });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(async () => {
  __resetPublicCacheFreshness();
  await seedStaleCache();
});

afterEach(() => {
  vi.unstubAllGlobals();
  __resetPublicCacheFreshness();
});

describe('loadPublicContent — schéma strict rejette cache stale, fetch frais', () => {
  it('cache stale (dragonborn sans dragonAncestries) → re-parse échoue → fetch frais → cache reconstitué propre', async () => {
    const fetchMock = mockFetch();
    const data = await loadPublicContent('ancestries');

    // Le fetch d'index ET le fetch d'ancestries doivent avoir été appelés.
    const urlsFetched = fetchMock.mock.calls.map((c) =>
      typeof c[0] === 'string' ? c[0] : String(c[0]),
    );
    expect(urlsFetched.some((u) => u.startsWith('/data/ancestries.json'))).toBe(true);

    // La donnée retournée vient du fetch frais, pas du cache stale.
    expect(data).toHaveLength(1);
    expect(data[0]!.id).toBe('dragonborn');
    expect(data[0]!.options.dragonAncestries).toHaveLength(1);
    expect(data[0]!.options.dragonAncestries?.[0]?.id).toBe('red');
  });

  it('cache déjà valide (dragonborn avec dragonAncestries) → re-parse passe → pas de fetch ancestries.json', async () => {
    // Réécrit le cache avec une entrée valide
    await dexie.content.put({
      id: '__public__',
      type: 'ancestries',
      data: [FRESH_DRAGONBORN],
      fetchedAt: Date.now(),
    });

    const fetchMock = mockFetch();
    const data = await loadPublicContent('ancestries');

    expect(data).toHaveLength(1);
    expect(data[0]!.options.dragonAncestries).toHaveLength(1);

    const urlsFetched = fetchMock.mock.calls.map((c) =>
      typeof c[0] === 'string' ? c[0] : String(c[0]),
    );
    // index.json est OK (freshness check), mais ancestries.json NE doit PAS
    // avoir été refetché si le cache était valide.
    expect(urlsFetched.some((u) => u.startsWith('/data/ancestries.json'))).toBe(false);
  });
});
