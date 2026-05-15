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
import {
  ContentTypeSchemas,
  type ContentTypeKey,
} from '../src/shared/types/content.js';
import { z } from 'zod';

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
    const merged = [...byId.values()];

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
      await writeFile(outPath, JSON.stringify(valid, null, 2), 'utf8');
      counts[type] = valid.length;
      console.log(
        `  → ${outPath}: ${valid.length} valid (${merged.length - valid.length} dropped)`,
      );
    } else {
      const outPath = join(OUT_DIR, `${type}.json`);
      await writeFile(outPath, JSON.stringify(result.data, null, 2), 'utf8');
      counts[type] = result.data.length;
      console.log(`  ✓ ${outPath}: ${result.data.length} entities`);
    }
  }

  // Index file with counts (used by content-loader and debug route)
  const indexPath = join(OUT_DIR, 'index.json');
  await writeFile(
    indexPath,
    JSON.stringify(
      { generatedAt: new Date().toISOString(), counts },
      null,
      2,
    ),
    'utf8',
  );
  console.log(`\n  → ${indexPath}: ${Object.keys(counts).length} types indexed`);

  if (totalErrors > 0) {
    console.error(`\n⚠ Total validation errors: ${totalErrors} (entries dropped)`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
