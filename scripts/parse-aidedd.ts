/**
 * scripts/parse-aidedd.ts
 *
 * Reads all HTML files in content-sources/aidedd/ and produces structured JSON
 * per entity type in content-sources/extracted/aidedd/.
 *
 * Type detection: by parent folder name (sorts/, monstres/, etc.) or by content
 * structure if files are flat.
 *
 * Run: pnpm content:parse-aidedd
 *
 * This is a skeleton. Selectors are placeholders — adjust to actual AideDD
 * markup once Adrien has provided sample files. The Zod schemas live in
 * src/shared/types/content.ts (to be created in plan 04 step 3).
 */
import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { join, basename, dirname, extname } from 'node:path';
import { existsSync } from 'node:fs';
import * as cheerio from 'cheerio';

const SOURCE_DIR = 'content-sources/aidedd';
const OUTPUT_DIR = 'content-sources/extracted/aidedd';

type EntityType =
  | 'spells'
  | 'monsters'
  | 'magic-items'
  | 'items'
  | 'classes'
  | 'subclasses'
  | 'ancestries'
  | 'subancestries'
  | 'backgrounds'
  | 'feats'
  | 'conditions'
  | 'unknown';

const FOLDER_TO_TYPE: Record<string, EntityType> = {
  sorts: 'spells',
  monstres: 'monsters',
  'objets-magiques': 'magic-items',
  objets: 'items',
  classes: 'classes',
  'sous-classes': 'subclasses',
  races: 'ancestries',
  'sous-races': 'subancestries',
  historiques: 'backgrounds',
  dons: 'feats',
  etats: 'conditions',
};

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const path = join(dir, entry.name);
      return entry.isDirectory() ? walk(path) : Promise.resolve([path]);
    }),
  );
  return files.flat().filter((f) => extname(f).toLowerCase() === '.html');
}

function detectType(filePath: string, $: cheerio.CheerioAPI): EntityType {
  // 1) by folder
  const parent = basename(dirname(filePath));
  if (parent in FOLDER_TO_TYPE) return FOLDER_TO_TYPE[parent]!;

  // 2) by content sniffing (placeholders — adjust to real AideDD markup)
  if ($('.ecole').length > 0) return 'spells';
  if ($('.classe').length > 0 && $('.dv').length > 0) return 'monsters';
  if ($('table.itemDetails').length > 0) return 'items';

  return 'unknown';
}

// ── Parsers per type ─────────────────────────────────────────────
// Each returns an object matching the Zod schema for that type.
// Selectors are PLACEHOLDERS — calibrate against real AideDD HTML.

function parseSpell($: cheerio.CheerioAPI, source: string): unknown {
  const name = $('h1').first().text().trim();
  const school = $('.ecole').first().text().trim().toLowerCase();
  const level = parseInt($('.level').first().text().trim(), 10) || 0;
  const description = $('.description').first().html()?.trim() ?? '';
  // TODO: castingTime, range, components, duration, ritual, concentration
  return {
    id: name.toLowerCase().replace(/\s+/g, '-'),
    name,
    school,
    level,
    description,
    sourceFile: source,
  };
}

function parseMonster($: cheerio.CheerioAPI, source: string): unknown {
  const name = $('h1').first().text().trim();
  // TODO: AC, HP, speed, abilities, saves, skills, resistances, senses, languages, CR, traits, actions, reactions
  return {
    id: name.toLowerCase().replace(/\s+/g, '-'),
    name,
    sourceFile: source,
  };
}

function parseItem($: cheerio.CheerioAPI, source: string): unknown {
  const name = $('h1').first().text().trim();
  return { id: name.toLowerCase().replace(/\s+/g, '-'), name, sourceFile: source };
}

function parseGeneric($: cheerio.CheerioAPI, source: string): unknown {
  const name = $('h1').first().text().trim();
  const html = $('main').html()?.trim() ?? $('body').html()?.trim() ?? '';
  return { id: name.toLowerCase().replace(/\s+/g, '-'), name, html, sourceFile: source };
}

const PARSERS: Record<EntityType, (($: cheerio.CheerioAPI, src: string) => unknown) | null> = {
  spells: parseSpell,
  monsters: parseMonster,
  'magic-items': parseItem,
  items: parseItem,
  classes: parseGeneric,
  subclasses: parseGeneric,
  ancestries: parseGeneric,
  subancestries: parseGeneric,
  backgrounds: parseGeneric,
  feats: parseGeneric,
  conditions: parseGeneric,
  unknown: null,
};

// ── Main ─────────────────────────────────────────────────────────

async function main(): Promise<void> {
  if (!existsSync(SOURCE_DIR)) {
    console.error(`Source directory missing: ${SOURCE_DIR}`);
    process.exit(1);
  }
  await mkdir(OUTPUT_DIR, { recursive: true });

  const files = await walk(SOURCE_DIR);
  console.log(`Found ${files.length} HTML files in ${SOURCE_DIR}`);

  const grouped: Partial<Record<EntityType, unknown[]>> = {};
  let unknownCount = 0;

  for (const file of files) {
    try {
      const html = await readFile(file, 'utf8');
      const $ = cheerio.load(html);
      const type = detectType(file, $);
      if (type === 'unknown') {
        console.warn(`  ! Unknown type: ${file}`);
        unknownCount++;
        continue;
      }
      const parser = PARSERS[type];
      if (!parser) continue;
      const entity = parser($, file);
      grouped[type] ??= [];
      grouped[type]!.push(entity);
    } catch (err) {
      console.error(`  ✗ Failed: ${file}`, err);
    }
  }

  for (const [type, entities] of Object.entries(grouped)) {
    if (!entities) continue;
    const outPath = join(OUTPUT_DIR, `${type}.json`);
    await writeFile(outPath, JSON.stringify(entities, null, 2), 'utf8');
    console.log(`  ✓ ${type}: ${entities.length} entities → ${outPath}`);
  }

  if (unknownCount > 0) {
    console.warn(`\n${unknownCount} file(s) of unknown type. Check folder naming or add detection heuristics.`);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
