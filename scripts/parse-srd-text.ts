/**
 * scripts/parse-srd-text.ts
 *
 * Parses the SRD 5.2.1 plain-text extracts (FR + EN) into structured JSON.
 *
 * STATUS (plan 04, this session): STUB.
 *
 * The SRD glossary is dense, multi-page, and interleaves conditions, actions,
 * attitudes, and other glossary entries within a single alphabetical stream.
 * Building a robust regex-based parser for classes / subclasses / ancestries /
 * backgrounds / conditions / rules / items requires its own dedicated session.
 *
 * Plan 04 deliberately defers this work. We emit empty Zod-valid arrays so
 * the merge step (build-public-content.ts) can still produce all expected
 * `public/data/*.json` files, and we log a clear warning naming the deferred
 * types so the next plan can pick up the slack.
 *
 * See scripts/EXTRACTION-NOTES.md for the deferral rationale.
 *
 * Run: pnpm content:parse-srd
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const OUTPUT_DIR = 'content-sources/extracted/srd';

const DEFERRED_TYPES = [
  'classes',
  'subclasses',
  'ancestries',
  'subancestries',
  'backgrounds',
  'conditions',
  'rules',
  'items',
] as const;

async function main(): Promise<void> {
  await mkdir(OUTPUT_DIR, { recursive: true });

  for (const type of DEFERRED_TYPES) {
    const outPath = join(OUTPUT_DIR, `${type}.json`);
    await writeFile(outPath, '[]\n', 'utf8');
    console.log(`  → ${outPath}: [] (DEFERRED — see EXTRACTION-NOTES.md)`);
  }

  console.warn(
    '\n⚠ SRD text parser is a stub this session.\n  ' +
      'Deferred types: ' +
      DEFERRED_TYPES.join(', ') +
      '\n  Plan 05 (manual character form) will need at least classes, ancestries,\n  ' +
      'backgrounds populated. Treat that as a prerequisite for plan 05.\n',
  );
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
