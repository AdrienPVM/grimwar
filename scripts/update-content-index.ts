/**
 * scripts/update-content-index.ts (plan 13.7 §0.4 — annexe)
 *
 * Régénère `public/data/index.json` (counts + contentHash) à partir de l'état
 * actuel de `public/data/*.json`. Logique 100% locale sur le bundle déjà produit
 * — ne touche AUCUN autre fichier, ne lit AUCUN PDF/AideDD.
 *
 * RÔLE (plan 13.10b, D17) : utilitaire autonome ré-appelable manuellement,
 * DISTINCT de l'orchestrateur `build-public-content.ts`. L'orchestrateur l'invoque
 * en DERNIÈRE étape (après les producteurs SRD), mais ce script reste utile seul :
 * après un `extract-srd-*.ts` lancé isolément, ou pour rafraîchir counts/hash sans
 * rejouer tout le pipeline. C'est la séparation décidée en Q2 (13.10b) — l'index
 * est un concern de cache (cf. D7), pas de production de contenu.
 *
 * `generatedAt` STABLE (finding D, voir plus bas) : préservé tant que le
 * `contentHash` ne change pas — sinon `git diff --quiet public/data` ne pourrait
 * jamais être quiet et le critère d'idempotence dur de D17 serait inatteignable.
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

  const indexPath = join(OUT_DIR, 'index.json');

  // `generatedAt` STABLE (finding D, plan 13.10b) : on ne bumpe l'horodatage
  // QUE si le `contentHash` a changé. Sinon `git diff --quiet public/data` ne
  // serait jamais quiet (le timestamp bougerait à chaque run) et le critère
  // d'idempotence dur de D17 serait inatteignable. Cohérent avec le rôle
  // d'utilitaire ré-appelable manuellement : un re-run sans changement de
  // contenu ne touche pas le fichier.
  let generatedAt = new Date().toISOString();
  try {
    const prev = JSON.parse(await readFile(indexPath, 'utf-8')) as Partial<IndexFile>;
    if (prev.contentHash === contentHash && typeof prev.generatedAt === 'string') {
      generatedAt = prev.generatedAt;
    }
  } catch {
    // Pas d'index existant (ou illisible) → on horodate maintenant.
  }

  const index: IndexFile = {
    generatedAt,
    counts,
    contentHash,
  };

  await writeFile(indexPath, JSON.stringify(index, null, 2) + '\n', 'utf-8');

  console.log(
    `[update-content-index] OK — ${indexPath} (${Object.keys(counts).length} types, hash ${contentHash.slice(0, 12)}…)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
