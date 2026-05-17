import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  __resetPublicCacheFreshness,
  loadPublicContent,
} from '../content-loader';
import { db as dexie } from '../dexie-db';

/**
 * Tests du mécanisme d'invalidation de cache (durcissement F, plan 13.7 UAT
 * post-13.7 — cf. plans/DEBT.md > D7 réouverte).
 *
 * Couvre Bug 2 (mémoïsation absorbant les échecs) et Bug 1 (SW SWR sur
 * index.json) — voir bug report du 2026-05-17.
 *
 * Red-before-green : ces tests DOIVENT être vus rouges sur le code pré-fix
 * (où chaque chemin d'échec marque la mémoïsation comme "fait"). Vert après
 * fix.
 */

const CONTENT_HASH_KEY = 'public:contentHash';
const OLD_HASH = 'old-hash-aaaaaaaaaaaaaaaaaaaaaaaaaa';
const NEW_HASH = 'new-hash-bbbbbbbbbbbbbbbbbbbbbbbbbb';

const SAMPLE_FRESH = {
  generatedAt: '2026-05-17T00:00:00.000Z',
  counts: { conditions: 1 },
  contentHash: NEW_HASH,
};

const FRESH_CONDITIONS = [
  {
    id: 'blinded',
    name: { fr: 'Aveuglé', en: 'Blinded' },
    description: { fr: 'Vous ne voyez plus.', en: 'You cannot see.' },
    source: 'srd-5.2.1',
  },
];

const STALE_CONDITIONS = [
  {
    id: 'stale-condition',
    name: { fr: 'Périmé', en: 'Stale' },
    description: { fr: 'Devrait être purgé.', en: 'Should be purged.' },
    source: 'srd-5.2.1',
  },
];

async function seedDexieStale(): Promise<void> {
  await dexie.content.clear();
  await dexie.settings.clear();
  await dexie.content.put({
    id: '__public__',
    type: 'conditions',
    data: STALE_CONDITIONS,
    fetchedAt: Date.now(),
  });
  await dexie.settings.put({ key: CONTENT_HASH_KEY, value: OLD_HASH });
}

beforeEach(async () => {
  __resetPublicCacheFreshness();
  await seedDexieStale();
});

afterEach(() => {
  vi.unstubAllGlobals();
  __resetPublicCacheFreshness();
});

describe('ensurePublicCacheFreshness — Bug 2 : la mémoïsation ne fige pas sur échec', () => {
  it('un échec de fetch sur index.json n\'empêche pas la prochaine tentative de revérifier (retry)', async () => {
    // Arrange : la 1re fetch fail (réseau coupé), la 2e réussit avec un nouveau hash.
    const fetchMock = vi.fn();
    // 1er appel : index.json throw — comme un offline transitoire ou un build
    // en cours d'écriture sur disque.
    fetchMock.mockRejectedValueOnce(new Error('network error'));
    // 2e appel (re-essai) : index.json revient, nouveau hash → invalidation
    // doit purger le cache puis re-fetch conditions.json frais.
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(SAMPLE_FRESH), { status: 200 }),
    );
    // Suite : fetch conditions.json frais.
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(FRESH_CONDITIONS), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    // Act 1 : premier loadPublicContent — la fetch index.json fail.
    // En PROD, ça doit servir le cache (stale) sans crash.
    const first = await loadPublicContent('conditions');
    expect(first.map((c) => c.id)).toContain('stale-condition');

    // Act 2 : deuxième loadPublicContent — la mémoïsation aurait été figée
    // sur l'échec (Bug 2). Le test exige qu'elle se ré-arme et rejoue la
    // fresh-check, qui cette fois doit voir le nouveau hash et purger.
    __resetPublicCacheFreshness.bind(null); // garde la signature
    // On NE reset PAS la mémoïsation manuellement — c'est précisément ce qu'on
    // teste : que le mécanisme se ré-arme tout seul après un échec.
    const second = await loadPublicContent('conditions');

    // Assert : le cache stale a été purgé, le bundle frais est servi.
    expect(second.map((c) => c.id)).not.toContain('stale-condition');
    expect(second.map((c) => c.id)).toContain('blinded');

    // Confirme aussi qu'on a bien essayé index.json deux fois (1 fail + 1 succès).
    const indexCalls = fetchMock.mock.calls.filter(([url]) => {
      const u = typeof url === 'string' ? url : (url as URL | Request).toString();
      return u.includes('/data/index.json');
    });
    expect(indexCalls.length).toBeGreaterThanOrEqual(2);
  });

  it('un index.json en HTTP 500 n\'empêche pas la prochaine tentative de revérifier', async () => {
    const fetchMock = vi.fn();
    fetchMock.mockResolvedValueOnce(new Response('boom', { status: 500 }));
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(SAMPLE_FRESH), { status: 200 }),
    );
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(FRESH_CONDITIONS), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const first = await loadPublicContent('conditions');
    expect(first.map((c) => c.id)).toContain('stale-condition');

    const second = await loadPublicContent('conditions');
    expect(second.map((c) => c.id)).toContain('blinded');
  });

  it('un index.json en JSON corrompu n\'empêche pas la prochaine tentative de revérifier', async () => {
    const fetchMock = vi.fn();
    fetchMock.mockResolvedValueOnce(
      new Response('not valid json {{{', { status: 200 }),
    );
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(SAMPLE_FRESH), { status: 200 }),
    );
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(FRESH_CONDITIONS), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const first = await loadPublicContent('conditions');
    expect(first.map((c) => c.id)).toContain('stale-condition');

    const second = await loadPublicContent('conditions');
    expect(second.map((c) => c.id)).toContain('blinded');
  });

  it('un index.json sans contentHash log un warn (pas un return silencieux)', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fetchMock = vi.fn();
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ generatedAt: 'x', counts: {} }), // contentHash absent
        { status: 200 },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    await loadPublicContent('conditions');

    // L'absence de contentHash est un signal qu'on doit voir (build legacy ?
    // pipeline cassé ?). Un return silencieux laisse l'utilisateur dans
    // l'ignorance — le warn est le minimum.
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('contentHash'),
    );
    warnSpy.mockRestore();
  });

  it('un succès de fresh-check est bien mémoïsé (pas de re-fetch index.json gratuit)', async () => {
    const fetchMock = vi.fn();
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(SAMPLE_FRESH), { status: 200 }),
    );
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(FRESH_CONDITIONS), { status: 200 }),
    );
    // Sécurité : si un 3e appel index.json arrive, on s'en aperçoit via la
    // longueur du mock après. Pas de mock pour les 3e+ → renvoie undefined
    // qui crash si appelé. Le test sera vert ssi on n'appelle que 2 fois.
    vi.stubGlobal('fetch', fetchMock);

    await loadPublicContent('conditions');
    await loadPublicContent('conditions');

    const indexCalls = fetchMock.mock.calls.filter(([url]) => {
      const u = typeof url === 'string' ? url : (url as URL | Request).toString();
      return u.includes('/data/index.json');
    });
    expect(indexCalls).toHaveLength(1); // 1 succès → 1 seul round-trip
  });
});
