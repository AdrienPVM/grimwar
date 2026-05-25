/**
 * scripts/extract-srd-summoned-creatures.ts (plan D14)
 *
 * Régénère `public/data/summoned-creatures.json` depuis
 * `scripts/data/srd-summoned-creatures.ts` (source unique de vérité hand-curated
 * SRD 5.2.1 — voir DEBT.md > D14).
 *
 * Pattern : sortie déterministe triée par id, idempotent, parse strict
 * (compteurs SRD attendus). Refus explicite de toute lecture en dehors des
 * 2 PDFs SRD (politique CLAUDE.md).
 *
 * Run : `pnpm tsx scripts/extract-srd-summoned-creatures.ts`
 */
import { writeFile } from 'node:fs/promises';

import { SummonedCreatureStatBlockSchema } from '../src/shared/types/content';
import {
  SRD_SUMMONED_CREATURES,
  SRD_SUMMONED_CREATURES_COUNTS,
} from './data/srd-summoned-creatures';
import { z } from 'zod';

const OUT_PATH = 'public/data/summoned-creatures.json';

async function main(): Promise<void> {
  // 1. Validation stricte via Zod : un statblock cassé doit échouer dur.
  const arraySchema = z.array(SummonedCreatureStatBlockSchema);
  const parsed = arraySchema.safeParse(SRD_SUMMONED_CREATURES);
  if (!parsed.success) {
    console.error('[extract-srd-summoned-creatures] PARSE FAIL :');
    for (const err of parsed.error.errors.slice(0, 10)) {
      console.error(`  [${err.path.join('.')}]: ${err.message}`);
    }
    throw new Error('[extract-srd-summoned-creatures] validation Zod échouée');
  }

  // 2. Compteur SRD attendu.
  if (parsed.data.length !== SRD_SUMMONED_CREATURES_COUNTS.total) {
    throw new Error(
      `[extract-srd-summoned-creatures] PARSE STRICT FAIL — total attendu ${SRD_SUMMONED_CREATURES_COUNTS.total}, trouvé ${parsed.data.length}.`,
    );
  }

  // 3. Tri déterministe par id (sortie stable d'un run à l'autre).
  const sorted = [...parsed.data].sort((a, b) => a.id.localeCompare(b.id));

  // 4. Écriture stable (signature identique aux autres extracteurs SRD).
  const next = JSON.stringify(sorted, null, 2) + '\n';
  await writeFile(OUT_PATH, next, 'utf-8');

  console.log(
    `[extract-srd-summoned-creatures] OK — ${sorted.length} statblocks SRD écrits dans ${OUT_PATH}.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
