/**
 * scripts/parse-aidedd.ts
 *
 * Parses AideDD HTML files (one per type, named "List » <Type> D&D 5.html")
 * into structured JSON in content-sources/extracted/aidedd/{type}.json.
 *
 * Strategy:
 *   1. Walk content-sources/aidedd/ for *.html files.
 *   2. Detect type from filename (Sorts → spells, Monstres → monsters, etc.).
 *   3. For each `<div class="bloc">` entity, apply the SOURCE WHITELIST
 *      (see scripts/EXTRACTION-NOTES.md) — accepted entities go to the
 *      typed JSON output, rejected ones go to REJECTED.json for audit.
 *   4. Per-type parser builds a partial entity matching the Zod schema in
 *      src/shared/types/content.ts. Fields the parser can't determine
 *      confidently are left out; the merge step (plan 04 step 15) fills
 *      gaps from SRD or fails Zod validation.
 *
 * Run: pnpm content:parse-aidedd
 */
import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { join, basename, extname } from 'node:path';
import { existsSync } from 'node:fs';
import * as cheerio from 'cheerio';
import { CLASS_FR_TO_EN_ID } from './maps/class-fr-to-en.js';

// Bloc = type returned by cheerio's API ($('.bloc') / $(el)).
// Inferred from the API to avoid a direct domhandler import (transitive dep of cheerio).
type Bloc = ReturnType<cheerio.CheerioAPI>;

const SOURCE_DIR = 'content-sources/aidedd';
const OUTPUT_DIR = 'content-sources/extracted/aidedd';

// ─────────────────────────────────────────────────────────────────────
// Type detection from filename
// ─────────────────────────────────────────────────────────────────────

type AideddType =
  | 'spells'
  | 'monsters'
  | 'magic-items'
  | 'feats'
  | 'manifestations'
  | 'herbs'
  | 'poisons';

const FILENAME_TOKENS: Array<{ token: string; type: AideddType }> = [
  { token: 'Sorts', type: 'spells' },
  { token: 'Monstres', type: 'monsters' },
  { token: 'Objets magiques', type: 'magic-items' },
  { token: 'Dons', type: 'feats' },
  { token: 'Manifestations', type: 'manifestations' },
  { token: 'Herbes', type: 'herbs' },
  { token: 'Poisons', type: 'poisons' },
];

function detectType(filename: string): AideddType | null {
  for (const { token, type } of FILENAME_TOKENS) {
    if (filename.includes(token)) return type;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────
// Source whitelist — see scripts/EXTRACTION-NOTES.md
// ─────────────────────────────────────────────────────────────────────

function classifySource(raw: string): 'srd' | 'basic-rules' | 'aidedd-homebrew' | 'rejected' {
  const s = raw.trim();
  if (s === '') return 'srd'; // empty = SRD-equivalent assumption
  if (/\(SRD\)/i.test(s)) return 'srd';
  if (/\(BR\+?\)/i.test(s)) return 'basic-rules';
  if (s.startsWith('Recueil') && s.includes('AideDD')) return 'aidedd-homebrew';
  return 'rejected';
}

function sourceTagOf(raw: string): 'srd-5.2.1' | 'basic-rules' | 'aidedd-homebrew' {
  const cls = classifySource(raw);
  if (cls === 'rejected') throw new Error(`Cannot tag rejected source: ${raw}`);
  if (cls === 'srd') return 'srd-5.2.1';
  if (cls === 'basic-rules') return 'basic-rules';
  return 'aidedd-homebrew';
}

// ─────────────────────────────────────────────────────────────────────
// Slug helpers
// ─────────────────────────────────────────────────────────────────────

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ─────────────────────────────────────────────────────────────────────
// Cheerio helpers — find a div whose <strong> label matches a label
// ─────────────────────────────────────────────────────────────────────


function findFieldByStrong($: cheerio.CheerioAPI, $bloc: Bloc, label: string): string | null {
  const target = label.toLowerCase().trim();
  let result: string | null = null;
  $bloc.find('div').each((_, el) => {
    if (result !== null) return false;
    const $div = $(el);
    const strong = $div.find('> strong').first();
    if (!strong.length) return undefined;
    if (strong.text().toLowerCase().trim().replace(/\s+:?$/, '') !== target) return undefined;
    const html = $div.html() ?? '';
    const stripped = html
      .replace(/^<strong>[^<]*<\/strong>\s*:?\s*/i, '')
      .trim();
    result = stripped.replace(/<[^>]*>/g, '').trim();
    return false;
  });
  return result;
}

// ─────────────────────────────────────────────────────────────────────
// Parsers
// ─────────────────────────────────────────────────────────────────────

interface PartialEntity {
  id: string;
  name: { fr: string };
  source: 'srd-5.2.1' | 'basic-rules' | 'aidedd-homebrew';
  [key: string]: unknown;
}

const SCHOOL_FR_TO_KEY: Record<string, string> = {
  abjuration: 'abjuration',
  invocation: 'conjuration', // FR "invocation" = EN "conjuration"
  divination: 'divination',
  enchantement: 'enchantment',
  évocation: 'evocation',
  evocation: 'evocation',
  illusion: 'illusion',
  nécromancie: 'necromancy',
  necromancie: 'necromancy',
  transmutation: 'transmutation',
};

function parseSpellSchoolAndLevel(ecole: string): {
  school: string;
  level: number;
  ritual: boolean;
} | null {
  // Format examples:
  //   "niveau 1 - abjuration"
  //   "évocation (tour de magie)"
  //   "niveau 5 - évocation (rituel)"
  //   "niveau 3 - abjuration (rituel)"
  const text = ecole.toLowerCase().trim();
  const ritual = /\(rituel\)/i.test(text);
  const cantrip = /\(tour de magie\)/i.test(text);

  let level: number | null = null;
  let schoolFr: string | null = null;

  const levelMatch = text.match(/niveau\s+(\d+)\s*-\s*([a-zé]+)/);
  if (levelMatch && levelMatch[1] && levelMatch[2]) {
    level = parseInt(levelMatch[1], 10);
    schoolFr = levelMatch[2];
  } else if (cantrip) {
    level = 0;
    const cantripMatch = text.match(/^([a-zé]+)/);
    if (cantripMatch && cantripMatch[1]) schoolFr = cantripMatch[1];
  }

  if (level === null || schoolFr === null) return null;
  const school = SCHOOL_FR_TO_KEY[schoolFr];
  if (!school) return null;
  return { school, level, ritual };
}

function parseComponents(raw: string): {
  v: boolean;
  s: boolean;
  m: boolean;
  material?: { fr: string };
} {
  // Examples: "V, S, M (une pincée de poudre de fer)" / "S" / "V, M (encens et résine)"
  const upper = raw.toUpperCase();
  const v = /\bV\b/.test(upper);
  const s = /\bS\b/.test(upper);
  const m = /\bM\b/.test(upper);
  const matMatch = raw.match(/\(([^)]+)\)/);
  if (m && matMatch && matMatch[1]) {
    return { v, s, m, material: { fr: matMatch[1].trim() } };
  }
  return { v, s, m };
}

function parseSpell($: cheerio.CheerioAPI, $bloc: Bloc, source: string): PartialEntity | null {
  const name = $bloc.find('h1').first().text().trim();
  if (!name) return null;
  const ecole = $bloc.find('.ecole').first().text().trim();
  const ecoleParts = parseSpellSchoolAndLevel(ecole);
  if (!ecoleParts) return null;

  const castingTime = findFieldByStrong($, $bloc, "Temps d'incantation") ?? '';
  const range = findFieldByStrong($, $bloc, 'Portée') ?? '';
  const componentsRaw = findFieldByStrong($, $bloc, 'Composantes') ?? '';
  const duration = findFieldByStrong($, $bloc, 'Durée') ?? '';
  const concentration = /concentration/i.test(duration);

  // Description + atHigherLevels split
  const descHtml = $bloc.find('.description').first().html() ?? '';
  // Split on the "Aux niveaux supérieurs" marker
  const ahlMarker = /<strong>\s*<em>\s*Aux niveaux supérieurs\s*<\/em>\s*<\/strong>\s*\.?\s*/i;
  const splitHtml = descHtml.split(ahlMarker);
  const descriptionText = stripHtmlBlock(splitHtml[0] ?? '');
  const atHigherLevelsText = splitHtml.length > 1 ? stripHtmlBlock(splitHtml.slice(1).join(' ')) : null;

  const classes: string[] = [];
  $bloc.find('.classe').each((_, el) => {
    const cls = $(el).text().trim();
    const key = CLASS_FR_TO_EN_ID[cls.toLowerCase()];
    if (key) classes.push(key);
  });

  return {
    id: slugify(name),
    name: { fr: name },
    level: ecoleParts.level,
    school: ecoleParts.school,
    ritual: ecoleParts.ritual,
    castingTime: { fr: castingTime || 'inconnu' },
    range: { fr: range || 'inconnu' },
    components: parseComponents(componentsRaw),
    duration: { fr: duration || 'inconnu' },
    concentration,
    description: { fr: descriptionText || name },
    atHigherLevels: atHigherLevelsText ? { fr: atHigherLevelsText } : null,
    classes,
    source: sourceTagOf(source),
  };
}

function stripHtmlBlock(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/ /g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Magic items
// Order matters: more specific patterns BEFORE generic ones
// (peu commun BEFORE commun, très rare BEFORE rare).
const RARITY_FR_ORDERED: Array<{ pat: RegExp; key: string }> = [
  { pat: /\bpeu commun(?:e)?\b/i, key: 'uncommon' },
  { pat: /\btrès rare\b/i, key: 'very rare' },
  { pat: /\blégendaire\b/i, key: 'legendary' },
  { pat: /\bartefact\b/i, key: 'artifact' },
  { pat: /\brare\b/i, key: 'rare' },
  { pat: /\bcommun(?:e)?\b/i, key: 'common' },
];

const ITEM_CATEGORY_FR: Array<{ pat: RegExp; key: string }> = [
  { pat: /\barme\b/i, key: 'weapon' },
  { pat: /\barmure\b/i, key: 'armor' },
  { pat: /\bbouclier\b/i, key: 'shield' },
  { pat: /\b(?:objet merveilleux|objet|baguette|sceptre|bâton|anneau|amulette|potion|parchemin)\b/i, key: 'gear' },
];

function parseMagicItem($: cheerio.CheerioAPI, $bloc: Bloc, source: string): PartialEntity | null {
  const name = $bloc.find('h1').first().text().trim();
  if (!name) return null;
  const typeText = $bloc.find('.type').first().text().trim();
  // typeText example: "objet merveilleux, rare (nécessite un accord par un magicien)"

  const rarity = RARITY_FR_ORDERED.find((r) => r.pat.test(typeText))?.key ?? 'common';
  const category = ITEM_CATEGORY_FR.find((c) => c.pat.test(typeText))?.key ?? 'gear';

  // Attunement: "nécessite un accord [par un magicien]" → restricted (i18n) or generic (true)
  let attunement: boolean | { fr: string } = false;
  if (/nécessite un accord/i.test(typeText)) {
    const qualifierMatch = typeText.match(/nécessite un accord([^,]*)/i);
    const qualifier = qualifierMatch && qualifierMatch[1] ? qualifierMatch[1].trim() : '';
    attunement = qualifier ? { fr: qualifier } : true;
  }

  const descHtml = $bloc.find('.description').first().html() ?? '';
  const description = stripHtmlBlock(descHtml);

  return {
    id: slugify(name),
    name: { fr: name },
    category,
    rarity,
    attunement,
    magicDescription: { fr: description || name },
    description: null,
    source: sourceTagOf(source),
  };
}

function parseFeat($: cheerio.CheerioAPI, $bloc: Bloc, source: string): PartialEntity | null {
  const name = $bloc.find('h1').first().text().trim();
  if (!name) return null;

  const prereqText = $bloc.find('.prerequis').first().text().trim();
  const summaryText = $bloc.find('.resume').first().text().trim();
  const descHtml = $bloc.find('.description').first().html() ?? '';
  const description = stripHtmlBlock(descHtml);

  return {
    id: slugify(name),
    name: { fr: name },
    prerequisite: prereqText ? { fr: prereqText } : null,
    summary: summaryText ? { fr: summaryText } : null,
    description: { fr: description || name },
    source: sourceTagOf(source),
  };
}

// Other types are extracted to JSON for future use but NOT pushed to public/data
// in this session (see EXTRACTION-NOTES.md).

function parseGeneric($: cheerio.CheerioAPI, $bloc: Bloc, source: string): PartialEntity | null {
  const name = $bloc.find('h1').first().text().trim();
  if (!name) return null;
  const descHtml = $bloc.find('.description').first().html() ?? '';
  const description = stripHtmlBlock(descHtml);
  const typeText = $bloc.find('.type').first().text().trim();
  return {
    id: slugify(name),
    name: { fr: name },
    type: typeText,
    description: { fr: description || name },
    source: sourceTagOf(source),
  };
}

const PARSERS: Record<
  AideddType,
  ($: cheerio.CheerioAPI, bloc: Bloc, source: string) => PartialEntity | null
> = {
  spells: parseSpell,
  monsters: parseGeneric, // partial parse only this session
  'magic-items': parseMagicItem,
  feats: parseFeat,
  manifestations: parseGeneric,
  herbs: parseGeneric,
  poisons: parseGeneric,
};

// ─────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────

interface RejectionRecord {
  type: AideddType;
  name: string;
  source: string;
  file: string;
}

async function main(): Promise<void> {
  if (!existsSync(SOURCE_DIR)) {
    console.error(`Source directory missing: ${SOURCE_DIR}`);
    process.exit(1);
  }
  await mkdir(OUTPUT_DIR, { recursive: true });

  const entries = await readdir(SOURCE_DIR, { withFileTypes: true });
  const htmls = entries
    .filter((e) => e.isFile() && extname(e.name).toLowerCase() === '.html')
    .map((e) => join(SOURCE_DIR, e.name));

  if (htmls.length === 0) {
    console.warn(`No HTML files found in ${SOURCE_DIR}`);
    return;
  }

  const accepted: Partial<Record<AideddType, PartialEntity[]>> = {};
  const rejected: RejectionRecord[] = [];
  const idCollisions: Record<AideddType, Map<string, number>> = {
    spells: new Map(),
    monsters: new Map(),
    'magic-items': new Map(),
    feats: new Map(),
    manifestations: new Map(),
    herbs: new Map(),
    poisons: new Map(),
  };

  for (const file of htmls) {
    const filename = basename(file);
    const type = detectType(filename);
    if (!type) {
      console.warn(`! Unknown type for file: ${filename}`);
      continue;
    }
    const html = await readFile(file, 'utf8');
    const $ = cheerio.load(html);
    const blocs = $('.bloc');

    let acceptedCount = 0;
    let rejectedCount = 0;
    let parseFailCount = 0;

    blocs.each((_, el) => {
      const $bloc = $(el);
      const sourceText = $bloc.find('.source').first().text().trim();
      const cls = classifySource(sourceText);
      const name = $bloc.find('h1').first().text().trim();

      if (cls === 'rejected') {
        rejected.push({ type, name, source: sourceText, file: filename });
        rejectedCount++;
        return;
      }

      const parser = PARSERS[type];
      const entity = parser($, $bloc, sourceText);
      if (!entity) {
        parseFailCount++;
        return;
      }

      // Disambiguate id collisions (e.g. multiple variants share a name)
      const collisionMap = idCollisions[type];
      const baseId = entity.id;
      const seen = collisionMap.get(baseId) ?? 0;
      if (seen > 0) {
        entity.id = `${baseId}-${seen + 1}`;
      }
      collisionMap.set(baseId, seen + 1);

      accepted[type] ??= [];
      accepted[type]!.push(entity);
      acceptedCount++;
    });

    console.log(
      `  ${filename}: ${acceptedCount} accepted, ${rejectedCount} rejected, ${parseFailCount} parse-fail (of ${blocs.length})`,
    );
  }

  for (const [type, entities] of Object.entries(accepted)) {
    if (!entities) continue;
    const outPath = join(OUTPUT_DIR, `${type}.json`);
    await writeFile(outPath, JSON.stringify(entities, null, 2), 'utf8');
    console.log(`  → ${outPath}: ${entities.length} entities`);
  }

  // Always write REJECTED.json (even empty) for audit
  const rejectedPath = join(OUTPUT_DIR, 'REJECTED.json');
  await writeFile(rejectedPath, JSON.stringify(rejected, null, 2), 'utf8');
  console.log(`  → ${rejectedPath}: ${rejected.length} rejected`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
