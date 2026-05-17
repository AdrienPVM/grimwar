/**
 * scripts/update-content-index.ts (plan 13.7 §0.4 — annexe)
 *
 * Régénère `public/data/index.json` (counts + contentHash) à partir de l'état
 * actuel de `public/data/*.json`. Complémentaire des 5 scripts d'extraction —
 * à lancer après eux pour invalider correctement le cache Dexie (cf. D7).
 *
 * Ne touche AUCUN autre fichier, ne lit AUCUN PDF/AideDD. Logique 100% locale
 * sur le bundle déjà produit.
 *
 * Note vis-à-vis de `pnpm content:build` : ce script-là régénère le bundle à
 * partir de `content-sources/extracted/srd/*.json` (stage upstream) et écraserait
 * les enrichissements de 13.7. L'intégration propre des extracts SRD dans la
 * pipeline `content:build` est l'objet du plan 13.10 / 13.11. En attendant, le
 * workflow est : (1) lancer les 5 `extract-srd-*.ts` ; (2) lancer ce script.
 *
 * Run : `pnpm tsx scripts/update-content-index.ts`
 */
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const OUT_DIR = 'public/data';

// Liste figée des types bundlés (alignée sur `build-public-content.ts > TYPES`,
// + `invocations` ajouté par 13.7).
const TYPES = [
  'ancestries',
  'backgrounds',
  'classes',
  'conditions',
  'feats',
  'invocations',
  'items',
  'magic-items',
  'monsters',
  'rules',
  'spells',
  'subancestries',
  'subclasses',
];

interface IndexFile {
  generatedAt: string;
  counts: Record<string, number>;
  contentHash: string;
}

async function main(): Promise<void> {
  const counts: Record<string, number> = {};
  const bodyByType: Record<string, string> = {};

  for (const type of TYPES) {
    const path = join(OUT_DIR, `${type}.json`);
    try {
      const body = await readFile(path, 'utf-8');
      bodyByType[type] = body;
      const arr = JSON.parse(body) as unknown[];
      counts[type] = Array.isArray(arr) ? arr.length : 0;
    } catch (err) {
      console.warn(
        `[update-content-index] ${path} absent : ${(err as Error).message}. Ignoré.`,
      );
      counts[type] = 0;
      bodyByType[type] = '';
    }
  }

  // Hash stable : même algo que `build-public-content.ts` (types triés + \0
  // séparateur + body).
  const hash = createHash('sha256');
  for (const type of [...TYPES].sort()) {
    hash.update(type);
    hash.update('\0');
    hash.update(bodyByType[type] ?? '');
    hash.update('\0');
  }
  const contentHash = hash.digest('hex');

  const index: IndexFile = {
    generatedAt: new Date().toISOString(),
    counts,
    contentHash,
  };

  const indexPath = join(OUT_DIR, 'index.json');
  await writeFile(indexPath, JSON.stringify(index, null, 2) + '\n', 'utf-8');

  console.log(
    `[update-content-index] OK — ${indexPath} (${Object.keys(counts).length} types, hash ${contentHash.slice(0, 12)}…)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
