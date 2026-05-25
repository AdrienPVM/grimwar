/**
 * Plan D15 — Fix one-shot des cassures letter-spacing dans le bundle SRD
 * versionné `public/data/*.json`.
 *
 * Approche : pour chaque fragment listé dans
 * `FORBIDDEN_LETTER_SPACING_BREAKS` (cf. `tests/helpers/i18n-guard.ts`), on
 * applique un remplacement direct par sa version recollée. L'ordre est
 * trié par longueur décroissante pour qu'un fragment plus long
 * (« da n s l’aut re » → « dans l’autre ») soit appliqué avant un
 * fragment plus court (« l’aut re » → « l’autre »).
 *
 * Le script est idempotent : un fragment déjà recollé ne re-déclenche pas
 * de remplacement (l'`includes` ne match plus). Il peut être ré-exécuté
 * sans effet.
 *
 * Exécution : `tsx scripts/fix-letter-spacing.ts`
 */

import { readFile, writeFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { FORBIDDEN_LETTER_SPACING_BREAKS } from '../tests/helpers/i18n-guard';

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(HERE, '..', 'public', 'data');

/**
 * Pour chaque fragment pathologique, sa correction (mot recollé). Le mapping
 * vit ici plutôt que dans la liste forbidden car la liste n'a vocation qu'à
 * détecter — la correction est l'affaire du script de fix.
 */
const FIX_MAP: Record<string, string> = {
  'Vot re': 'Votre',
  'heu r es': 'heures',
  'no a ns wer': 'no answer',
  'l’aut re': 'l’autre',
  'da n s l’aut re': 'dans l’autre',
  'Des t roy': 'Destroy',
  'déba r ra sser': 'débarrasser',
  't he fea r': 'the fear',
  'saving t hrow': 'saving throw',
  'sav ing t hrow': 'saving throw',
  '’Av a nt a g e': '’Avantage',
  'sma l ler': 'smaller',
  '+10 f t .': '+10 ft.',
  'Te m pé ré': 'Tempéré',
  'Tropic al': 'Tropical',
  'L a n d Ty p e': 'Land Type',
  'Te m pe r at e': 'Temperate',
  'v ic tor': 'victor',
};

// Vérification structurelle : chaque fragment forbidden doit avoir un fix
const missing = FORBIDDEN_LETTER_SPACING_BREAKS.filter((f) => !(f in FIX_MAP));
if (missing.length > 0) {
  console.error(
    `[fix-letter-spacing] Fragments sans fix défini : ${missing.join(', ')}`,
  );
  process.exit(1);
}

// Ordre : longueur décroissante (fix des fragments englobants avant
// fragments englobés — « da n s l’aut re » avant « l’aut re »)
const orderedFragments = [...FORBIDDEN_LETTER_SPACING_BREAKS].sort(
  (a, b) => b.length - a.length,
);

function applyFixes(text: string): { fixed: string; count: number } {
  let result = text;
  let count = 0;
  for (const frag of orderedFragments) {
    const replacement = FIX_MAP[frag]!;
    const before = result;
    // Replace ALL occurrences (split/join est le plus simple pour string brute)
    result = result.split(frag).join(replacement);
    if (result !== before) {
      const occurrences = before.split(frag).length - 1;
      count += occurrences;
    }
  }
  return { fixed: result, count };
}

async function main(): Promise<void> {
  const files = (await readdir(DATA_DIR)).filter((f) => f.endsWith('.json'));
  let totalFixed = 0;
  for (const file of files) {
    const path = join(DATA_DIR, file);
    const raw = await readFile(path, 'utf-8');
    const { fixed, count } = applyFixes(raw);
    if (count > 0) {
      await writeFile(path, fixed, 'utf-8');
      console.log(`  ${file} : ${count} cassure(s) corrigée(s)`);
      totalFixed += count;
    }
  }
  console.log(`\nTotal : ${totalFixed} cassure(s) letter-spacing corrigée(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
