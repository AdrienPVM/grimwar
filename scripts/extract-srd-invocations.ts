/**
 * scripts/extract-srd-invocations.ts (plan 13.7 §0.4)
 *
 * Crée `public/data/invocations.json` (NOUVEAU bundle, plan 13.7) depuis
 * `scripts/data/srd-invocations.ts` — 28 invocations SRD 5.2.1 dont 5 éligibles
 * Warlock L1.
 *
 * Pattern : déterministe (tri par id), idempotent, parse strict
 * (compteurs SRD attendus). Refus de lire du contenu non-SRD.
 *
 * Run : `pnpm tsx scripts/extract-srd-invocations.ts`
 */
import { writeFile } from 'node:fs/promises';

import { SRD_INVOCATIONS, SRD_INVOCATIONS_COUNTS } from './data/srd-invocations';

const INVOCATIONS_PATH = 'public/data/invocations.json';

async function main(): Promise<void> {
  // Parse strict — compteurs SRD attendus.
  if (SRD_INVOCATIONS.length !== 28) {
    throw new Error(
      `[extract-srd-invocations] PARSE STRICT FAIL — attendu 28 invocations, trouvé ${SRD_INVOCATIONS.length}.`,
    );
  }
  if (SRD_INVOCATIONS_COUNTS.eligibleAtLevel1 !== 5) {
    throw new Error(
      `[extract-srd-invocations] PARSE STRICT FAIL — attendu 5 invocations éligibles L1, trouvé ${SRD_INVOCATIONS_COUNTS.eligibleAtLevel1}.`,
    );
  }

  // Tri déterministe par id.
  const sorted = [...SRD_INVOCATIONS].sort((a, b) => a.id.localeCompare(b.id));

  const next = JSON.stringify(sorted, null, 2) + '\n';
  await writeFile(INVOCATIONS_PATH, next, 'utf-8');

  console.log(
    `[extract-srd-invocations] OK — ${SRD_INVOCATIONS.length} invocations écrites dans ${INVOCATIONS_PATH} (${SRD_INVOCATIONS_COUNTS.eligibleAtLevel1} éligibles L1).`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
