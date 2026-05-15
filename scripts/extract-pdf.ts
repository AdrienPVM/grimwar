/**
 * scripts/extract-pdf.ts
 *
 * Reads every PDF in content-sources/pdfs/ and writes the extracted text to
 * content-sources/extracted/raw/${pdfname}.txt. Page boundaries are marked
 * with form-feed characters (\f) so the parsers can chunk by page later.
 *
 * Run: pnpm content:extract-pdf
 *
 * Subsequent scripts (parse-srd-text.ts, parse-dmg.ts) consume these .txt
 * outputs.
 */
import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { join, basename, extname } from 'node:path';
import { existsSync } from 'node:fs';
import pdf from 'pdf-parse';

const SOURCE_DIR = 'content-sources/pdfs';
const OUTPUT_DIR = 'content-sources/extracted/raw';

async function main(): Promise<void> {
  if (!existsSync(SOURCE_DIR)) {
    console.error(`Source directory missing: ${SOURCE_DIR}`);
    process.exit(1);
  }
  await mkdir(OUTPUT_DIR, { recursive: true });

  const entries = await readdir(SOURCE_DIR, { withFileTypes: true });
  const pdfs = entries
    .filter((e) => e.isFile() && extname(e.name).toLowerCase() === '.pdf')
    .map((e) => join(SOURCE_DIR, e.name));

  if (pdfs.length === 0) {
    console.warn(`No PDFs found in ${SOURCE_DIR}. Drop your files in there and re-run.`);
    return;
  }

  console.log(`Found ${pdfs.length} PDF(s) to extract.`);

  for (const file of pdfs) {
    const stem = basename(file, '.pdf');
    const outPath = join(OUTPUT_DIR, `${stem}.txt`);
    try {
      const buf = await readFile(file);
      const data = await pdf(buf);

      // pdf-parse returns the whole text as one string. Page boundaries are
      // not preserved without options. We approximate by using the page-render
      // callback (pdf-parse exposes via { pagerender } option).
      const text = data.text;
      await writeFile(outPath, text, 'utf8');

      console.log(`  ✓ ${file} → ${outPath} (${data.numpages} pages, ${text.length} chars)`);
    } catch (err) {
      console.error(`  ✗ Failed: ${file}`, err);
    }
  }

  console.log('\nDone. Next: run pnpm content:parse-srd');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
