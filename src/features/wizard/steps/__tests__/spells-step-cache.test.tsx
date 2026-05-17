import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { __resetPublicCacheFreshness } from '@/shared/lib/content-loader';
import { db as dexie } from '@/shared/lib/dexie-db';
import { useWizardStore } from '@/shared/lib/slices/wizard-slice';

import { SpellsStep } from '../spells-step';

/**
 * Test correctif — bloquant UAT plan 05 « Page Sorts VIDE pour les lanceurs ».
 *
 * Cause racine confirmée (cf. plans/DEBT.md > D7) : le cache Dexie public servait
 * un `spells.json` en classes FR (`['magicien']`) hydraté avant la régénération
 * du bundle en EN canonique. Le TTL 7j ne se sentait pas concerné, aucun
 * mécanisme d'invalidation par version n'existait, donc le wizard filtrait des
 * sorts FR contre une `class.id === 'wizard'` et retournait []. Symptôme :
 * Magicien niveau 1 → cantrips list vide alors que `public/data/spells.json`
 * sur disque contenait 16 cantrips wizard.
 *
 * Rouge avant vert : ce test DOIT être vu échouer sur le code AVANT le fix
 * d'invalidation par `contentHash`, et passer APRÈS — sinon il ne protège
 * pas de la régression réelle (cf. CLAUDE.md > « rouge avant vert »).
 *
 * Mécanisme testé :
 *   1. on pré-pollue Dexie avec des sorts FR (`classes: ['magicien']`) et un
 *      contentHash périmé.
 *   2. on stube `fetch('/data/index.json')` pour retourner un NOUVEAU hash.
 *   3. on stube `fetch('/data/{spells,classes}.json')` pour retourner le bundle
 *      EN canonique.
 *   4. on rend `<SpellsStep />` avec `draft.classes = [{ classId: 'wizard' }]`.
 *   5. on attend que le loader détecte la divergence de hash → vide le cache
 *      public → re-fetch les bundles frais → SpellsStep filtre correctement et
 *      affiche au moins un cantrip lisible.
 */

// Shapes minimales conformes au Zod schema (cf. src/shared/types/content.ts) —
// si le schema rejette une entité, `loadPublicContent` la filtre silencieusement
// et le SpellsStep voit une liste vide, ce qui MASQUERAIT le bug d'invalidation.
const baseSpellFields = {
  level: 0 as const,
  school: 'evocation' as const,
  castingTime: { fr: '1 action' },
  range: { fr: '18 mètres' },
  components: { v: true, s: true, m: false },
  duration: { fr: 'instantanée' },
  concentration: false,
  ritual: false,
  description: { fr: 'Un rayon glacé.' },
  atHigherLevels: null,
  source: 'srd-5.2.1' as const,
};

const FR_POLLUTED_SPELLS = [
  // Sort FR-pollué (ancien bundle pré-70f7a4d). `classes: ['magicien']` ne
  // matchera JAMAIS `characterClass.id === 'wizard'` côté SpellsStep.
  {
    id: 'rayon-de-givre',
    name: { fr: 'Rayon de givre', en: 'Ray of Frost' },
    ...baseSpellFields,
    classes: ['magicien', 'ensorceleur'], // ← FR (pollué)
  },
];

const EN_FRESH_SPELLS = [
  {
    id: 'rayon-de-givre',
    name: { fr: 'Rayon de givre', en: 'Ray of Frost' },
    ...baseSpellFields,
    classes: ['wizard', 'sorcerer'], // ← EN canonique
  },
];

const EN_FRESH_CLASSES = [
  {
    id: 'wizard',
    name: { fr: 'Magicien', en: 'Wizard' },
    hitDie: 'd6',
    primaryAbility: ['int'],
    saveProficiencies: ['int', 'sag'],
    armorProficiencies: [],
    weaponProficiencies: [],
    toolProficiencies: [],
    skillChoices: { count: 2, from: [] },
    spellcasting: { ability: 'int', progression: 'full' },
    startingEquipment: { options: [{ items: [], coins: null }] },
    description: { fr: 'Magicien.', en: 'Wizard.' },
    features: [],
    source: 'srd-5.2.1',
  },
];

// Clés Dexie : `cacheKey('public', type)` retourne `[type, '__public__']`.
const CONTENT_HASH_KEY = 'public:contentHash';
const STALE_HASH = 'stale-hash-aaaaaaaaaaaaaaaaaaaaaaaa';
const FRESH_HASH = 'fresh-hash-bbbbbbbbbbbbbbbbbbbbbbbb';

async function seedDexie(): Promise<void> {
  await dexie.content.clear();
  await dexie.settings.clear();
  await dexie.content.put({
    id: '__public__',
    type: 'spells',
    data: FR_POLLUTED_SPELLS,
    fetchedAt: Date.now(),
  });
  await dexie.content.put({
    id: '__public__',
    type: 'classes',
    data: EN_FRESH_CLASSES,
    fetchedAt: Date.now(),
  });
  await dexie.settings.put({ key: CONTENT_HASH_KEY, value: STALE_HASH });
}

function mockFetch(): void {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : (input as URL | Request).toString();
      if (url.includes('/data/index.json')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              generatedAt: new Date().toISOString(),
              counts: { spells: 1, classes: 1 },
              contentHash: FRESH_HASH,
            }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          ),
        );
      }
      if (url.endsWith('/data/spells.json')) {
        return Promise.resolve(
          new Response(JSON.stringify(EN_FRESH_SPELLS), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
        );
      }
      if (url.endsWith('/data/classes.json')) {
        return Promise.resolve(
          new Response(JSON.stringify(EN_FRESH_CLASSES), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
        );
      }
      return Promise.resolve(new Response('not found', { status: 404 }));
    }),
  );
}

describe('SpellsStep — invalidation du cache public par contentHash', () => {
  beforeEach(async () => {
    __resetPublicCacheFreshness();
    await seedDexie();
    mockFetch();
    useWizardStore.setState((state) => ({
      ...state,
      draft: {
        ...state.draft,
        classes: [{ classId: 'wizard', level: 1 }],
        primaryClassId: 'wizard',
      },
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    useWizardStore.getState().reset();
  });

  it("affiche au moins un cantrip pour un Magicien niveau 1 quand le hash du bundle a changé", async () => {
    render(<SpellsStep />);

    // Si l'invalidation marche : Dexie est flush, fetch /data/spells.json
    // est appelé, retourne le bundle EN canonique, le filtre
    // `s.classes.includes('wizard')` matche, l'utilisateur voit 'Rayon de givre'.
    //
    // Si l'invalidation NE marche PAS : Dexie sert le cache FR (TTL non
    // expiré), `s.classes.includes('wizard')` est faux pour tous les sorts,
    // la liste de cantrips est vide → assertion échoue (cas RED).
    // Note : depuis le UAT plan 05 point 1, SpellsStep est emballé dans
    // `ListWithHelpPanel` qui rend la liste 2 fois (desktop `hidden md:grid` +
    // mobile `md:hidden`). En jsdom, sans CSS responsive, les deux variantes
    // sont présentes — on utilise `getAllByLabelText` pour ne pas tomber sur
    // l'erreur "Found multiple elements".
    await waitFor(
      () => {
        expect(screen.getAllByLabelText('Rayon de givre').length).toBeGreaterThan(0);
      },
      { timeout: 2000 },
    );
  });
});
