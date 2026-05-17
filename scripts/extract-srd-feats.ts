/**
 * scripts/extract-srd-feats.ts (plan 13.7 §0.4)
 *
 * Régénère `public/data/feats.json` depuis `scripts/data/srd-feats.ts`
 * (source unique de vérité hand-curated SRD 5.2.1 — voir §0.4 + AUDIT § C.2,
 * C.4, C.5, D.2).
 *
 * Pattern : sortie déterministe triée par id, idempotent, parse strict
 * (compteurs SRD attendus). Refus explicite de toute lecture en dehors des
 * 2 PDFs SRD (politique CLAUDE.md).
 *
 * Run : `pnpm tsx scripts/extract-srd-feats.ts`
 */
import { readFile, writeFile } from 'node:fs/promises';

import { SRD_FEATS, SRD_FEATS_COUNTS } from './data/srd-feats';

const FEATS_PATH = 'public/data/feats.json';

interface FeatJsonEntry {
  id: string;
  name: { fr: string; en?: string };
  category?: string;
  prerequisite?: { fr: string; en?: string } | null;
  summary?: { fr: string; en?: string } | string | null;
  description?: { fr: string; en?: string } | null;
  source: string;
  [k: string]: unknown;
}

function buildEntry(feat: (typeof SRD_FEATS)[number]): FeatJsonEntry {
  return {
    id: feat.id,
    name: feat.name,
    category: feat.category,
    prerequisite: feat.prerequisite,
    summary: feat.summary,
    description: null, // Description SRD complète à enrichir au consommateur (13.8/13.9).
    source: feat.source,
  };
}

async function main(): Promise<void> {
  // 1. Lecture du bundle existant (pour préserver d'éventuels champs custom
  //    sur l'entrée Grappler `lutteur`).
  let existing: FeatJsonEntry[] = [];
  try {
    const raw = await readFile(FEATS_PATH, 'utf-8');
    existing = JSON.parse(raw) as FeatJsonEntry[];
    if (!Array.isArray(existing)) {
      throw new Error(`[extract-srd-feats] ${FEATS_PATH} doit être un tableau`);
    }
  } catch (err) {
    // Premier run / fichier absent : ok, on régénère.
    console.warn(`[extract-srd-feats] Lecture ${FEATS_PATH} ignorée : ${(err as Error).message}`);
  }
  const existingById = new Map(existing.map((f) => [f.id, f]));

  // 2. Reconstruction : on part de SRD_FEATS (source de vérité) et on fusionne
  //    avec ce qui existe (notamment la `description` riche héritée pour les
  //    feats déjà bundlés comme `lutteur`).
  const enriched: FeatJsonEntry[] = SRD_FEATS.map((feat) => {
    const base = buildEntry(feat);
    const prior = existingById.get(feat.id);
    if (prior?.description) {
      base.description = prior.description;
    }
    return base;
  });

  // 3. Parse strict : compteurs SRD attendus.
  if (enriched.length !== SRD_FEATS_COUNTS.total) {
    throw new Error(
      `[extract-srd-feats] PARSE STRICT FAIL — total attendu ${SRD_FEATS_COUNTS.total}, trouvé ${enriched.length}.`,
    );
  }
  const byCat = (cat: string) =>
    enriched.filter((f) => f.category === cat).length;
  if (byCat('origin') !== SRD_FEATS_COUNTS.origin) {
    throw new Error(
      `[extract-srd-feats] PARSE STRICT FAIL — origin attendu ${SRD_FEATS_COUNTS.origin}, trouvé ${byCat('origin')}.`,
    );
  }
  if (byCat('fighting-style') !== SRD_FEATS_COUNTS.fightingStyle) {
    throw new Error(
      `[extract-srd-feats] PARSE STRICT FAIL — fighting-style attendu ${SRD_FEATS_COUNTS.fightingStyle}, trouvé ${byCat('fighting-style')}.`,
    );
  }
  if (byCat('epic-boon') !== SRD_FEATS_COUNTS.epicBoon) {
    throw new Error(
      `[extract-srd-feats] PARSE STRICT FAIL — epic-boon attendu ${SRD_FEATS_COUNTS.epicBoon}, trouvé ${byCat('epic-boon')}.`,
    );
  }

  // 4. Tri déterministe par id.
  enriched.sort((a, b) => a.id.localeCompare(b.id));

  // 5. Écriture stable.
  const next = JSON.stringify(enriched, null, 2) + '\n';
  await writeFile(FEATS_PATH, next, 'utf-8');

  console.log(
    `[extract-srd-feats] OK — ${enriched.length} feats SRD enrichis (origin: ${byCat('origin')}, general: ${byCat('general')}, fighting-style: ${byCat('fighting-style')}, epic-boon: ${byCat('epic-boon')}).`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
