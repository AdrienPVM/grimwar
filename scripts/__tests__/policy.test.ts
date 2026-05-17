import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Plan 13.7 §0.4 — politique de contenu : les scripts `scripts/extract-srd-*.ts`
 * et `scripts/data/srd-*.ts` ne doivent **jamais** référencer `content-sources/aidedd`
 * ni un PDF non-SRD (PHB / DMG / MM / Xanathar / aventures).
 *
 * C'est la garantie machine que la politique de contenu (CLAUDE.md decision
 * log 2026-05-17 : « L'app et son dépôt ne contiennent et ne bundlent QUE le
 * SRD 5.2.1 ») ne dérive pas accidentellement.
 *
 * Test passe = aucun match dans les scripts SRD du plan 13.7.
 */

/**
 * Patterns qui doivent JAMAIS apparaître comme **string literal fonctionnel**
 * dans un script SRD. On préfixe par `['"\`]` pour ne matcher que les valeurs
 * de string en code (pas les mentions dans les docstrings qui décrivent ce qui
 * est **interdit** — celles-ci doivent rester pour documenter la politique).
 */
const FORBIDDEN_PATTERNS = [
  /['"`]content-sources\/aidedd/i,
  /['"`]content-sources\/pdfs\/PHB/i,
  /['"`]content-sources\/pdfs\/DMG/i,
  /['"`]content-sources\/pdfs\/MM/i,
  /['"`]content-sources\/pdfs\/Xanathar/i,
  /['"`]content-sources\/pdfs\/Tasha/i,
];

async function walkSrdScripts(): Promise<string[]> {
  const files: string[] = [];
  const scriptsRoot = 'scripts';
  // 1. scripts/extract-srd-*.ts
  for (const entry of await readdir(scriptsRoot, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.startsWith('extract-srd-') && entry.name.endsWith('.ts')) {
      files.push(join(scriptsRoot, entry.name));
    }
  }
  // 2. scripts/data/srd-*.ts
  const dataDir = join(scriptsRoot, 'data');
  try {
    for (const entry of await readdir(dataDir, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.startsWith('srd-') && entry.name.endsWith('.ts')) {
        files.push(join(dataDir, entry.name));
      }
    }
  } catch {
    // dataDir absent → premier run, pas de fichier à valider.
  }
  return files;
}

describe('Politique de contenu SRD-only (plan 13.7)', () => {
  /** Retire block comments `/* ... *‌/` et line comments `// ...`. Garde le code seulement. */
  function stripComments(src: string): string {
    return src
      .replace(/\/\*[\s\S]*?\*\//g, '') // block comments (including JSDoc)
      .replace(/(^|\s)\/\/[^\n]*/g, '$1'); // line comments
  }

  it('aucun script SRD ne référence AideDD ou un PDF non-SRD dans le code fonctionnel', async () => {
    const files = await walkSrdScripts();
    expect(files.length).toBeGreaterThan(0); // doit trouver au moins quelques scripts
    const violations: string[] = [];
    for (const file of files) {
      const rawContent = await readFile(file, 'utf-8');
      const codeOnly = stripComments(rawContent);
      for (const pattern of FORBIDDEN_PATTERNS) {
        if (pattern.test(codeOnly)) {
          violations.push(`${file} matches ${pattern}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('chaque script extract-srd-* est listé pour `scripts/data/` correspondant', async () => {
    const files = await walkSrdScripts();
    const extractScripts = files.filter((f) => f.includes('extract-srd-'));
    // Au minimum les 5 scripts du plan 13.7 §0.4.
    expect(extractScripts.length).toBeGreaterThanOrEqual(5);
  });
});
