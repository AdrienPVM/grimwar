/**
 * scripts/extract-srd-spells.ts (plan 13.10 commit 1)
 *
 * Crée `public/data/spells.json` (SRD 5.2.1, bilingue FR+EN) depuis le module
 * canonique `scripts/data/srd-spells.ts`. Calque de `extract-srd-invocations.ts` :
 * déterministe (tri par id), idempotent, parse strict (compteur SRD attendu).
 *
 * ⚠️ Récurrent : ne lit JAMAIS le texte/PDF SRD (le bootstrap one-shot l'a fait).
 *    Importe le module TS et écrit le JSON. Conforme à « Sources SRD CC légitimes
 *    (LOCKED) » (CLAUDE.md).
 *
 * Run : `pnpm tsx scripts/extract-srd-spells.ts`
 */
import { writeFile } from 'node:fs/promises';

import { SRD_SPELLS, SRD_SPELLS_COUNTS } from './data/srd-spells';
import { checkSpellQuality } from './srd-spell-quality-gate';

const SPELLS_PATH = 'public/data/spells.json';

async function main(): Promise<void> {
  // Parse strict — compteur SRD attendu (cohérence module ↔ compteur figé).
  if (SRD_SPELLS.length !== SRD_SPELLS_COUNTS.total) {
    throw new Error(
      `[extract-srd-spells] PARSE STRICT FAIL — attendu ${SRD_SPELLS_COUNTS.total} sorts, trouvé ${SRD_SPELLS.length}.`,
    );
  }

  // Invariant bilingue dur : aucun sort sans EN (la signature AideDD était en=null).
  const monolingual = SRD_SPELLS.filter((s) => !s.name.en || !s.description.en);
  if (monolingual.length) {
    throw new Error(
      `[extract-srd-spells] BILINGUE FAIL — ${monolingual.length} sort(s) sans EN : ${monolingual.map((s) => s.id).join(', ')}.`,
    );
  }

  // Gate qualité (ratio FR/EN + plancher) — refuse d'émettre un bundle corrompu.
  const { violations } = checkSpellQuality(SRD_SPELLS);
  if (violations.length) {
    throw new Error(
      `[extract-srd-spells] QUALITÉ FAIL — ${violations.length} violation(s) :\n  ${violations.join('\n  ')}`,
    );
  }

  // Source SRD only — refus de toute provenance non-SRD.
  const offSource = SRD_SPELLS.filter((s) => s.source !== 'srd-5.2.1');
  if (offSource.length) {
    throw new Error(
      `[extract-srd-spells] SOURCE FAIL — ${offSource.length} sort(s) hors SRD : ${offSource.map((s) => `${s.id}=${s.source}`).join(', ')}.`,
    );
  }

  // Tri déterministe par id.
  const sorted = [...SRD_SPELLS].sort((a, b) => a.id.localeCompare(b.id));

  const next = JSON.stringify(sorted, null, 2) + '\n';
  await writeFile(SPELLS_PATH, next, 'utf-8');

  console.log(
    `[extract-srd-spells] OK — ${SRD_SPELLS.length} sorts bilingues écrits dans ${SPELLS_PATH}.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
