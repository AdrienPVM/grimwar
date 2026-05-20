import { readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  FORBIDDEN_ENGLISH_IN_FR_UI,
  FORBIDDEN_NON_OFFICIAL_FR_TERMS,
  findForbiddenEnglish,
  findForbiddenNonOfficialFr,
} from './helpers/i18n-guard';

/**
 * Bug 2026-05-20 UAT 4c — la modale Ordre primordial du Druide Mage affichait
 * « 1 cantrip Druide supplémentaire » : anglicisme non capturé parce que le
 * garde-fou i18n n'opérait QUE sur les composants UI rendus en test, jamais
 * sur les chaînes du bundle qui les alimentent.
 *
 * Source-racine : 10 fuites de « cantrip(s) » dans 4 bundles FR (ancestries,
 * classes — Thaumaturge + Mage —, feats — Initié à la magie —, invocations
 * — Codex des Ombres, Agonising Blast, Eldritch Spear, Repelling Blast).
 *
 * Ce test marche transversalement sur l'ensemble de `public/data/*.json` et
 * lève dès qu'un mot de `FORBIDDEN_ENGLISH_IN_FR_UI` apparaît dans une chaîne
 * de l'arbre `.fr`. Étend automatiquement la couverture à toute fuite future
 * (la liste FORBIDDEN grandit ; le test ne change pas).
 *
 * Cat. 1 « cohérence référentielle étendue » + Cat. 2 « identité » de la
 * politique « Vérité du contenu » 2026-05-19 — applique le garde-fou au
 * niveau du bundle, pas seulement au niveau du rendu.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(HERE, '..', 'public', 'data');

async function loadJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, 'utf-8'));
}

interface Leak {
  file: string;
  path: string;
  word: string;
  excerpt: string;
}

/**
 * Walk récursif sur l'arbre JSON. `frScope=true` quand le parent direct était
 * une clé `fr` (on est dans une string FR ou un sous-objet FR). Le garde-fou
 * s'applique UNIQUEMENT quand `frScope` est vrai — on doit ignorer les strings
 * sous `en` (le PDF anglais peut légitimement contenir « cantrip »).
 */
function walk(
  node: unknown,
  pathStr: string,
  frScope: boolean,
  file: string,
  out: Leak[],
  find: (text: string) => readonly string[],
): void {
  if (Array.isArray(node)) {
    node.forEach((v, i) => walk(v, `${pathStr}[${i}]`, frScope, file, out, find));
    return;
  }
  if (node !== null && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      const childScope = k === 'fr' ? true : k === 'en' ? false : frScope;
      walk(v, `${pathStr}.${k}`, childScope, file, out, find);
    }
    return;
  }
  if (frScope && typeof node === 'string') {
    const hits = find(node);
    for (const word of hits) {
      out.push({
        file,
        path: pathStr,
        word,
        excerpt: node.length > 160 ? `${node.slice(0, 160)}…` : node,
      });
    }
  }
}

async function scanBundles(
  find: (text: string) => readonly string[],
): Promise<Leak[]> {
  const files = (await readdir(DATA_DIR)).filter((f) => f.endsWith('.json'));
  const leaks: Leak[] = [];
  for (const file of files) {
    const data = await loadJson(join(DATA_DIR, file));
    walk(data, '', false, file, leaks, find);
  }
  return leaks;
}

function formatLeaks(leaks: Leak[], header: string): string {
  const lines = leaks
    .slice(0, 25)
    .map((l) => `  ${l.file}${l.path} → "${l.word}" : ${l.excerpt}`);
  return `${leaks.length} fuite(s) — ${header}\nÉchantillon :\n${lines.join('\n')}`;
}

describe('public/data/*.json — aucune chaîne FR ne contient de mot EN interdit', () => {
  it(`balaye tout l'arbre .fr de chaque bundle SRD versionné (anglicismes)`, async () => {
    const leaks = await scanBundles(findForbiddenEnglish);
    if (leaks.length > 0) {
      throw new Error(
        formatLeaks(
          leaks,
          `FORBIDDEN_ENGLISH_IN_FR_UI = [${FORBIDDEN_ENGLISH_IN_FR_UI.join(', ')}]`,
        ),
      );
    }
    expect(leaks).toEqual([]);
  });

  /**
   * Cat. 1 « cohérence référentielle étendue » + Cat. 2 « identité » — étendu
   * 2026-05-20 (UAT 4c bis) aux termes FR non-officiels. Cf. règle d'autorité
   * terminologique FR dans CLAUDE.md : la source de vérité est la traduction
   * officielle D&D 5e (SRD FR + PHB FR), pas une intuition ni un terme issu
   * d'un jeu vidéo ou d'un fan-glossaire. La 1ère passe de correction du bug
   * « cantrip » avait remplacé l'anglicisme par « tour de magie » (terme
   * Baldur's Gate 3, non-officiel) au lieu de « sort mineur » (SRD/PHB FR).
   */
  it(`balaye tout l'arbre .fr de chaque bundle SRD versionné (termes FR non-officiels)`, async () => {
    const leaks = await scanBundles(findForbiddenNonOfficialFr);
    if (leaks.length > 0) {
      throw new Error(
        formatLeaks(
          leaks,
          `FORBIDDEN_NON_OFFICIAL_FR_TERMS = [${FORBIDDEN_NON_OFFICIAL_FR_TERMS.join(', ')}]`,
        ),
      );
    }
    expect(leaks).toEqual([]);
  });
});
