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

import type { Spell } from '../src/shared/types/content';

import { SRD_SPELL_DAMAGE } from './data/srd-spell-damage';
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

  // Plan D1 — merge des entrées `damage[]` canoniques par slug. La table
  // `SRD_SPELL_DAMAGE` (scripts/data/srd-spell-damage.ts) est hand-curée
  // depuis le SRD CC EN ; les slugs absents restent sans `damage[]` (le
  // consommateur traite l'absence comme « sort non encore couvert »).
  // Garde anti-typo : tout slug du mapping damage doit exister dans SRD_SPELLS.
  const knownSlugs = new Set(SRD_SPELLS.map((s) => s.id));
  const orphanDamageSlugs = Object.keys(SRD_SPELL_DAMAGE).filter(
    (slug) => !knownSlugs.has(slug),
  );
  if (orphanDamageSlugs.length) {
    throw new Error(
      `[extract-srd-spells] DAMAGE ORPHELIN — ${orphanDamageSlugs.length} slug(s) damage sans sort correspondant : ${orphanDamageSlugs.join(', ')}.`,
    );
  }

  const enriched: Spell[] = SRD_SPELLS.map((spell) => {
    const damage = SRD_SPELL_DAMAGE[spell.id];
    if (!damage || damage.length === 0) return spell;
    return { ...spell, damage: [...damage] };
  });

  // Tri déterministe par id.
  const sorted = [...enriched].sort((a, b) => a.id.localeCompare(b.id));

  const next = JSON.stringify(sorted, null, 2) + '\n';
  await writeFile(SPELLS_PATH, next, 'utf-8');

  console.log(
    `[extract-srd-spells] OK — ${SRD_SPELLS.length} sorts bilingues écrits dans ${SPELLS_PATH} (dont ${Object.keys(SRD_SPELL_DAMAGE).length} avec damage[] canonique).`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
