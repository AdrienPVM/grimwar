/**
 * scripts/inspect-aidedd.ts
 *
 * One-shot inspection helper. Reads each AideDD HTML file and reports
 *  - number of <div class="bloc"> entities
 *  - top source values seen in <div class="source">
 *  - first entity preview (selectors check)
 *
 * Run: pnpm tsx scripts/inspect-aidedd.ts
 */
import { readFile, readdir } from 'node:fs/promises';
import { join, extname } from 'node:path';
import * as cheerio from 'cheerio';

const SOURCE_DIR = 'content-sources/aidedd';

async function main(): Promise<void> {
  const entries = await readdir(SOURCE_DIR, { withFileTypes: true });
  const htmls = entries
    .filter((e) => e.isFile() && extname(e.name).toLowerCase() === '.html')
    .map((e) => join(SOURCE_DIR, e.name));

  for (const file of htmls) {
    console.log(`\n===== ${file} =====`);
    const html = await readFile(file, 'utf8');
    const $ = cheerio.load(html);
    const blocs = $('.bloc');
    console.log(`  blocs: ${blocs.length}`);

    const sources = new Map<string, number>();
    blocs.each((_, el) => {
      const src = $(el).find('.source').first().text().trim() || '(empty)';
      sources.set(src, (sources.get(src) ?? 0) + 1);
    });
    const top = [...sources.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
    for (const [src, n] of top) console.log(`    [${n.toString().padStart(4)}] ${src}`);

    // First bloc preview
    const first = blocs.first();
    if (first.length) {
      console.log('  --- first bloc selectors:');
      const allClasses = new Set<string>();
      first.find('[class]').each((_, el) => {
        const cls = $(el).attr('class');
        if (cls) cls.split(/\s+/).forEach((c) => allClasses.add(c));
      });
      console.log(`    classes: ${[...allClasses].sort().join(', ')}`);
      console.log(`    h1: "${first.find('h1').first().text().trim()}"`);
    }
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
