/**
 * scripts/build-public-content.ts
 *
 * Merges the SRD-derived JSON (content-sources/extracted/srd/*.json) and the
 * AideDD-derived JSON (content-sources/extracted/aidedd/*.json) into the
 * canonical public bundles at public/data/{type}.json.
 *
 * Strategy (plan 04 step 15):
 *   - For each ContentTypeKey, collect entities from both sources.
 *   - SRD entries override AideDD entries on ID collision (PDF wins).
 *   - Validate the final array against the per-type Zod schema.
 *   - Fail loudly on validation errors so we never ship broken JSON.
 *
 * In this session, the SRD parser is a stub (see scripts/parse-srd-text.ts),
 * so SRD inputs are empty arrays for everything except spells/magic-items/feats
 * which come fully from AideDD HTML.
 *
 * Run: pnpm content:build
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import {
  ContentTypeSchemas,
  type ContentTypeKey,
} from '../src/shared/types/content.js';
import { z } from 'zod';
import { CLASS_FR_TO_EN_ID } from './maps/class-fr-to-en.js';

// Belt-and-braces vs. plans/DEBT.md > D3 bug #2 (mismatch FR/EN entre
// spell.classes[*] et classes.json[*].id). Le fix-à-la-source vit dans
// parse-aidedd.ts, mais on normalise aussi au build pour qu'un
// intermédiaire AideDD stale qui aurait gardé les anciennes valeurs FR ne
// poison pas le bundle public.
function normalizeSpellEntity(ent: unknown): unknown {
  if (typeof ent !== 'object' || ent === null) return ent;
  const e = ent as { classes?: unknown };
  if (!Array.isArray(e.classes)) return ent;
  e.classes = e.classes.map((c) => {
    if (typeof c !== 'string') return c;
    const mapped = CLASS_FR_TO_EN_ID[c.toLowerCase()];
    return mapped ?? c;
  });
  return ent;
}

const SRD_DIR = 'content-sources/extracted/srd';
const AIDEDD_DIR = 'content-sources/extracted/aidedd';
const OUT_DIR = 'public/data';

const TYPES: ContentTypeKey[] = [
  'spells',
  'monsters',
  'items',
  'magic-items',
  'classes',
  'subclasses',
  'ancestries',
  'subancestries',
  'backgrounds',
  'feats',
  'conditions',
  'rules',
];

// Types whose AideDD parser only emits PARTIAL entities this session
// (see scripts/EXTRACTION-NOTES.md). We deliberately skip ingesting them
// into public/data so the strict Zod validation isn't tripped by missing
// fields. Removing the type from this set is the trigger to write a full
// per-type AideDD parser in a follow-up session.
const PARTIAL_PARSE_AIDEDD: ReadonlySet<ContentTypeKey> = new Set([
  'monsters',
]);

async function readJsonOrEmpty(path: string): Promise<unknown[]> {
  if (!existsSync(path)) return [];
  const raw = await readFile(path, 'utf8');
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      console.warn(`  ! ${path}: not an array, treating as empty`);
      return [];
    }
    return parsed;
  } catch (err) {
    console.error(`  ! Failed to parse ${path}:`, err);
    return [];
  }
}

async function main(): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true });

  let totalErrors = 0;
  const counts: Record<string, number> = {};
  // Buffer pour calculer un hash stable du bundle complet. Voir plus bas
  // (écriture d'index.json) — utilisé côté runtime par content-loader pour
  // invalider le cache Dexie quand le contenu change.
  const writtenByType: Record<string, string> = {};

  for (const type of TYPES) {
    const srdPath = join(SRD_DIR, `${type}.json`);
    const aideddPath = join(AIDEDD_DIR, `${type}.json`);
    const srd = await readJsonOrEmpty(srdPath);
    const aidedd = PARTIAL_PARSE_AIDEDD.has(type) ? [] : await readJsonOrEmpty(aideddPath);
    if (PARTIAL_PARSE_AIDEDD.has(type)) {
      console.log(`  ⏭ ${type}: skipping AideDD merge (partial parser, deferred)`);
    }

    // Merge: SRD wins on ID collision (PDF source-of-truth)
    const byId = new Map<string, unknown>();
    for (const ent of aidedd) {
      const e = ent as { id?: string };
      if (typeof e.id !== 'string') continue;
      byId.set(e.id, ent);
    }
    for (const ent of srd) {
      const e = ent as { id?: string };
      if (typeof e.id !== 'string') continue;
      byId.set(e.id, ent); // overrides AideDD
    }
    const rawMerged = [...byId.values()];
    // Normalisation post-merge des champs cross-bundle (cf. CLASS_FR_TO_EN_ID).
    const merged = type === 'spells' ? rawMerged.map(normalizeSpellEntity) : rawMerged;

    // Validate
    const schema = ContentTypeSchemas[type];
    const arraySchema = z.array(schema);
    const result = arraySchema.safeParse(merged);

    if (!result.success) {
      console.error(`✗ ${type}: ${result.error.errors.length} validation errors`);
      const sampled = result.error.errors.slice(0, 5);
      for (const err of sampled) {
        console.error(`    [${err.path.join('.')}]: ${err.message}`);
      }
      if (result.error.errors.length > 5) {
        console.error(`    ... and ${result.error.errors.length - 5} more`);
      }
      totalErrors += result.error.errors.length;
      // Write what we can — non-validating entries are excluded
      const valid = merged.filter((e) => schema.safeParse(e).success);
      const outPath = join(OUT_DIR, `${type}.json`);
      const body = JSON.stringify(valid, null, 2);
      await writeFile(outPath, body, 'utf8');
      writtenByType[type] = body;
      counts[type] = valid.length;
      console.log(
        `  → ${outPath}: ${valid.length} valid (${merged.length - valid.length} dropped)`,
      );
    } else {
      const outPath = join(OUT_DIR, `${type}.json`);
      const body = JSON.stringify(result.data, null, 2);
      await writeFile(outPath, body, 'utf8');
      writtenByType[type] = body;
      counts[type] = result.data.length;
      console.log(`  ✓ ${outPath}: ${result.data.length} entities`);
    }
  }

  // Hash stable du bundle complet (sha-256 sur le contenu sérialisé, types
  // triés pour reproductibilité). Permet à content-loader.ts d'invalider le
  // cache Dexie quand le contenu change — sans dépendre d'un timestamp qui
  // bouge à chaque build et qui ne détecterait pas un rollback. Décision
  // ack'd 2026-05-16 (Adrien : "hash, pas timestamp" — un timestamp ne capte
  // pas un retour en arrière).
  const hash = createHash('sha256');
  for (const type of [...TYPES].sort()) {
    hash.update(type);
    hash.update('\0');
    hash.update(writtenByType[type] ?? '');
    hash.update('\0');
  }
  const contentHash = hash.digest('hex');

  // Index file with counts + contentHash (used by content-loader and debug route)
  const indexPath = join(OUT_DIR, 'index.json');
  await writeFile(
    indexPath,
    JSON.stringify(
      { generatedAt: new Date().toISOString(), counts, contentHash },
      null,
      2,
    ),
    'utf8',
  );
  console.log(
    `\n  → ${indexPath}: ${Object.keys(counts).length} types indexed (hash ${contentHash.slice(0, 12)}…)`,
  );

  if (totalErrors > 0) {
    console.error(`\n⚠ Total validation errors: ${totalErrors} (entries dropped)`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
