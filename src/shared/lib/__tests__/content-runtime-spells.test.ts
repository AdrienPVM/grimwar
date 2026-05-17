import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import {
  __resetPublicCacheFreshness,
  loadPublicContent,
} from '../content-loader';
import { db as dexie } from '../dexie-db';

/**
 * Hardening B (post-13.7) — test d'intégration DISQUE → RUNTIME.
 *
 * Pourquoi : le test d'intégrité disque (`content-integrity.test.ts`) ne lit
 * que les JSON sur disque. Il était vert pendant qu'à l'écran un Magicien
 * voyait une liste de sorts vide (cache Dexie pollué, plans/DEBT.md > D7).
 *
 * Ce test passe par le VRAI loader `loadPublicContent` qui valide via Zod et
 * écrit dans le cache Dexie — exactement ce que voit l'UI runtime. Si un
 * bundle frais est silencieusement rejeté par Zod (entrée corrompue), si le
 * filtre de cache court-circuite, ou si une régression de schéma fait
 * disparaître une classe lanceuse, ce test l'attrape.
 *
 * Le seul stub : on intercepte `fetch('/data/<type>.json')` pour servir le
 * fichier RÉEL sur disque (lecture fs). Pas de fixtures inventées, pas de
 * shape mock. Si demain `spells.json` perd ses sorts wizard, ce test casse.
 *
 * Red-before-green : si on supprime intentionnellement tous les sorts wizard
 * de spells.json, ce test devient rouge ; après restauration, vert. (À
 * exercer manuellement quand on change le pipeline ; les compteurs SRD
 * fournissent la garde quotidienne — cf. tests/srd-counters.test.ts.)
 */

const SRD_CASTER_CLASS_IDS = [
  'bard',
  'cleric',
  'druid',
  'paladin',
  'ranger',
  'sorcerer',
  'warlock',
  'wizard',
];

beforeEach(async () => {
  __resetPublicCacheFreshness();
  await dexie.content.clear();
  await dexie.settings.clear();

  // Stub minimal : route les fetch vers le disque réel. Pas de fixture
  // inventée — l'objet du test est précisément de tester contre le bundle
  // réel via la vraie validation Zod.
  const indexPath = join(process.cwd(), 'public', 'data', 'index.json');
  const indexRaw = await readFile(indexPath, 'utf8');

  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : (input as URL | Request).toString();
      const match = url.match(/\/data\/([^/?]+\.json)/);
      if (!match || !match[1]) return new Response('not found', { status: 404 });
      const file: string = match[1];
      if (file === 'index.json') {
        return new Response(indexRaw, { status: 200 });
      }
      try {
        const path = join(process.cwd(), 'public', 'data', file);
        const body = await readFile(path, 'utf8');
        return new Response(body, { status: 200 });
      } catch {
        return new Response('not found', { status: 404 });
      }
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('content-loader runtime — chaque classe lanceuse SRD a ≥1 sort visible côté UI (Hardening B)', () => {
  it("loadPublicContent('classes') retourne les 8 classes lanceuses SRD attendues", async () => {
    const classes = await loadPublicContent('classes');
    const ids = new Set(classes.map((c) => c.id));
    for (const id of SRD_CASTER_CLASS_IDS) {
      expect(ids).toContain(id);
    }
  });

  it('chacune des 8 classes lanceuses SRD a ≥1 sort qui passe la chaîne disque→Zod→loader→filtre runtime', async () => {
    // Le test parle le langage du UI : exactement le filtre que `SpellsStep`
    // applique (`spells.filter(s => s.classes.includes(classId))`). S'il
    // retourne [] en runtime pour une classe lanceuse, l'écran sera vide —
    // et l'utilisateur ne pourra pas choisir de sort.
    const spells = await loadPublicContent('spells');
    const emptyClasses: string[] = [];
    for (const classId of SRD_CASTER_CLASS_IDS) {
      const spellsForClass = spells.filter(
        (s) => Array.isArray(s.classes) && s.classes.includes(classId),
      );
      if (spellsForClass.length === 0) emptyClasses.push(classId);
    }
    expect(
      emptyClasses,
      `Classes lanceuses sans aucun sort runtime : ${emptyClasses.join(', ')}`,
    ).toEqual([]);
  });

  // Garde-fou volumes : un volume très bas (1-2) serait suspect aussi.
  // Plage indicative basée sur SRD 5.2.1 ; volet plus précis = compteurs
  // dédiés dans tests/srd-counters.test.ts (Hardening D).
  it('le wizard runtime a ≥50 sorts (cantrips + niveau 1+) — détecte une régression catastrophique', async () => {
    const spells = await loadPublicContent('spells');
    const wizardSpells = spells.filter(
      (s) => Array.isArray(s.classes) && s.classes.includes('wizard'),
    );
    expect(wizardSpells.length).toBeGreaterThan(50);
  });

  // Le contentHash inscrit sur disque DOIT matcher après une fresh check —
  // garantit que le mécanisme d'invalidation a effectivement écrit dans
  // dexie.settings, donc qu'il a tourné jusqu'au bout (et pas court-circuité
  // par Bug 2).
  it('après loadPublicContent, le contentHash du bundle est bien stocké dans dexie.settings (mécanisme exécuté)', async () => {
    await loadPublicContent('classes');
    const indexRaw = await readFile(
      join(process.cwd(), 'public', 'data', 'index.json'),
      'utf8',
    );
    const index = JSON.parse(indexRaw) as { contentHash?: string };
    const stored = await dexie.settings.get('public:contentHash');
    expect(stored?.value).toBe(index.contentHash);
  });
});
