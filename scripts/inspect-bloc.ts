/**
 * scripts/inspect-bloc.ts
 *
 * Dumps the first N blocs from a single AideDD HTML file with full innerHTML.
 * Used to calibrate selectors. Throwaway helper.
 *
 * Usage: pnpm tsx scripts/inspect-bloc.ts "Monstres" 1
 */
import { readFile, readdir } from 'node:fs/promises';
import { join, extname } from 'node:path';
import * as cheerio from 'cheerio';

const SOURCE_DIR = 'content-sources/aidedd';

async function main(): Promise<void> {
  const needle = process.argv[2] ?? 'Sorts';
  const count = parseInt(process.argv[3] ?? '1', 10);

  const entries = await readdir(SOURCE_DIR, { withFileTypes: true });
  const file = entries.find(
    (e) => e.isFile() && extname(e.name).toLowerCase() === '.html' && e.name.includes(needle),
  );
  if (!file) {
    console.error(`No HTML file matching: ${needle}`);
    process.exit(1);
  }
  const filePath = join(SOURCE_DIR, file.name);
  const html = await readFile(filePath, 'utf8');
  const $ = cheerio.load(html);
  const blocs = $('.bloc');
  console.log(`File: ${file.name}\nTotal blocs: ${blocs.length}\n`);

  blocs.slice(0, count).each((i, el) => {
    const $bloc = $(el);
    console.log(`──────── BLOC ${i + 1} ────────`);
    console.log(`H1: ${$bloc.find('h1').first().text().trim()}`);
    console.log(`SOURCE: ${$bloc.find('.source').first().text().trim()}`);
    console.log('--- FULL HTML ---');
    console.log($bloc.html());
    console.log('');
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
