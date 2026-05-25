import { readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  FORBIDDEN_LETTER_SPACING_BREAKS,
  findForbiddenLetterSpacingBreaks,
} from './helpers/i18n-guard';

/**
 * Plan D15 — garde-fou anti letter-spacing pathologique dans le bundle SRD
 * versionné. Bug d'extraction PDF : le PDF SRD utilise par endroits un
 * tracking CSS-like (« letter-spacing ») ou un saut de colonne qui injecte
 * des espaces à l'intérieur d'un mot. Exemples confirmés à l'audit :
 *
 *   - `Vot re` (4× spells.json) → doit être « Votre »
 *   - `heu r es` (2× spells.json sur 1 ligne) → doit être « heures »
 *   - `no a ns wer` (3× spells.json EN) → doit être « no answer »
 *   - `saving t hrow` / `sav ing t hrow` → doit être « saving throw »
 *   - `Av a nt a g e` (classes.json FR) → doit être « Avantage »
 *   - `L a n d Ty p e` (subclasses.json EN) → doit être « Land Type »
 *   - ... etc. (cf. `FORBIDDEN_LETTER_SPACING_BREAKS`)
 *
 * Approche structurelle : impossible de détecter génériquement le pattern
 * sans matcher ~5000 faux-positifs sur les articles/prépositions FR
 * légitimes (`de la`, `le mur`, `et un`, etc.). On fige donc une liste
 * curée de fragments PATHOLOGIQUES connus. À chaque nouveau cas découvert,
 * on étend la liste. Le test scanne TOUS les bundles `public/data/*.json`
 * indistinctement (les cassures arrivent côté FR ET côté EN d'après l'audit).
 *
 * Cat. 1 « cohérence référentielle étendue » + Cat. 2 « identité » de la
 * politique « Vérité du contenu » 2026-05-19.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(HERE, '..', 'public', 'data');

async function loadJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, 'utf-8'));
}

interface Break {
  file: string;
  path: string;
  fragment: string;
  excerpt: string;
}

/**
 * Walk récursif sans distinction FR/EN — les cassures de letter-spacing
 * peuvent survenir dans les deux langues (le PDF EN les a, le PDF FR les
 * a aussi, parfois sur les mêmes sections d'extraction tabulaire).
 */
function walk(
  node: unknown,
  pathStr: string,
  file: string,
  out: Break[],
): void {
  if (Array.isArray(node)) {
    node.forEach((v, i) => walk(v, `${pathStr}[${i}]`, file, out));
    return;
  }
  if (node !== null && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      walk(v, `${pathStr}.${k}`, file, out);
    }
    return;
  }
  if (typeof node === 'string') {
    const hits = findForbiddenLetterSpacingBreaks(node);
    for (const fragment of hits) {
      out.push({
        file,
        path: pathStr,
        fragment,
        excerpt: node.length > 200 ? `${node.slice(0, 200)}…` : node,
      });
    }
  }
}

async function scanBundles(): Promise<Break[]> {
  const files = (await readdir(DATA_DIR)).filter((f) => f.endsWith('.json'));
  const breaks: Break[] = [];
  for (const file of files) {
    const data = await loadJson(join(DATA_DIR, file));
    walk(data, '', file, breaks);
  }
  return breaks;
}

function formatBreaks(breaks: Break[]): string {
  const lines = breaks
    .slice(0, 25)
    .map((b) => `  ${b.file}${b.path} → "${b.fragment}" : ${b.excerpt}`);
  return (
    `${breaks.length} cassure(s) letter-spacing détectée(s) — ` +
    `FORBIDDEN_LETTER_SPACING_BREAKS = [${FORBIDDEN_LETTER_SPACING_BREAKS.join(', ')}]\n` +
    `Échantillon :\n${lines.join('\n')}`
  );
}

describe('public/data/*.json — aucune cassure letter-spacing dans les bundles SRD', () => {
  it('balaye tout l\'arbre de chaque bundle SRD versionné', async () => {
    const breaks = await scanBundles();
    if (breaks.length > 0) {
      throw new Error(formatBreaks(breaks));
    }
    expect(breaks).toEqual([]);
  });
});
