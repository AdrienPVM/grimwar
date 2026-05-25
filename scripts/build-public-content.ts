/**
 * scripts/build-public-content.ts — ORCHESTRATEUR (plan 13.10b — D17)
 *
 * `pnpm content:build` redevient LA commande de régénération du bundle public.
 * Au lieu de relire un `SRD_DIR` figé et d'ignorer les extracteurs dédiés (ce
 * que faisait la version obsolète, qui vidait classes/ancestries/feats/
 * invocations), cet orchestrateur RÉ-APPLIQUE les producteurs réels de chaque
 * type, dans l'ordre, puis régénère l'index.
 *
 * ⚠️ PORTÉE (caveat acté CLAUDE.md, finding B du commit 1) : cet orchestrateur
 * garantit la REPRODUCTIBILITÉ DE L'ÉTAT LIVE, pas la RECONSTRUCTION DEPUIS LES
 * SOURCES BRUTES. Les types `classes`/`ancestries`/`items` n'ont pas de
 * régénérateur from-scratch : leur base curée vit dans `public/data` et est
 * mise à jour par ENRICHISSEMENT (les extracteurs lisent le live, ajoutent des
 * champs dérivés, réécrivent). Un refresh from-scratch demanderait de remettre
 * `content-sources/extracted/srd` à jour contre le schéma courant — hors scope.
 *
 * Trois familles de producteurs :
 *
 *   1. SRD_EXTRACTORS — sous-process `tsx` séquentiels. Chaque extracteur reste
 *      bisectable indépendamment (un crash localise le bug). Zéro touche aux
 *      6 fichiers extracteurs qui marchent (KISS, décision Q1 plan 13.10b).
 *
 *   2. SRD_MERGE_TYPES — re-validation de la base SRD curée
 *      (`content-sources/extracted/srd/{type}.json`) via le schéma Zod par type.
 *      AideDD n'est JAMAIS lu (politique de contenu LOCKED — le build ne lit que
 *      du SRD). Ces 5 types n'ont aucune entrée AideDD ⇒ SRD-only reproduit le
 *      bundle live byte-identique.
 *
 *   3. PASS_THROUGH_TYPES — `magic-items`/`monsters` PRÉSERVÉS tels quels, non
 *      re-mergés (reformulation D17 #2). `magic-items.json` (251 items) est
 *      grandfathered d'origine AideDD pré-politique LOCKED ; sa SRD-sourcing est
 *      un plan dédié à venir. L'orchestrateur ne touche pas ces fichiers.
 *
 * Puis `update-content-index.ts` (utilitaire autonome, décision Q2) régénère
 * `index.json` en dernière étape, avec un `generatedAt` STABLE (préservé tant
 * que le `contentHash` ne change pas) — sinon `git diff --quiet public/data` ne
 * pourrait jamais être quiet.
 *
 * Critère de complétion D17 : `pnpm content:build` puis
 * `git diff --quiet public/data` ⇒ exit 0 (vérifié par `pnpm content:check`).
 *
 * Run : `pnpm content:build`
 */
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  ContentTypeSchemas,
  type ContentTypeKey,
} from '../src/shared/types/content.js';
import { z } from 'zod';

const SRD_DIR = 'content-sources/extracted/srd';
const OUT_DIR = 'public/data';

// 1. Producteurs délégués aux extracteurs SRD dédiés (sous-process tsx).
//    Chaque extracteur touche un fichier distinct → l'ordre n'a pas d'incidence
//    fonctionnelle ; figé ici pour des logs déterministes. spells/invocations/
//    feats produisent leur bundle from-scratch (TS→JSON) ; classes/ancestries/
//    weapon-mastery(items) enrichissent la base live en place.
const SRD_EXTRACTORS: readonly string[] = [
  'scripts/extract-srd-spells.ts',
  'scripts/extract-srd-invocations.ts',
  'scripts/extract-srd-feats.ts',
  'scripts/extract-srd-classes.ts',
  'scripts/extract-srd-ancestries.ts',
  'scripts/extract-srd-weapon-mastery.ts',
  'scripts/extract-srd-summoned-creatures.ts',
];

// 2. Types re-validés depuis la base SRD curée. AideDD jamais lu (LOCKED).
const SRD_MERGE_TYPES: readonly ContentTypeKey[] = [
  'backgrounds',
  'conditions',
  'subclasses',
  'subancestries',
  'rules',
];

// 3. Types préservés en pass-through (non re-mergés — voir en-tête).
const PASS_THROUGH_TYPES: readonly ContentTypeKey[] = ['magic-items', 'monsters'];

function runExtractor(scriptPath: string): void {
  console.log(`\n▶ ${scriptPath}`);
  execFileSync('pnpm', ['tsx', scriptPath], { stdio: 'inherit' });
}

async function readJsonArray(path: string): Promise<unknown[]> {
  if (!existsSync(path)) {
    console.warn(`  ! ${path} absent — type ignoré.`);
    return [];
  }
  const raw = await readFile(path, 'utf8');
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    console.warn(`  ! ${path}: pas un tableau, ignoré.`);
    return [];
  }
  return parsed;
}

/**
 * Re-valide un type SRD-mergé depuis `content-sources/extracted/srd` et le
 * réécrit. Format octet : `JSON.stringify(data, null, 2)` SANS newline finale
 * (signature historique du build pour ces 5 types — reproduit byte-identique).
 * Échoue dur si une entrée ne valide pas (on ne livre jamais de JSON cassé).
 */
async function buildMergeType(type: ContentTypeKey): Promise<number> {
  const srdPath = join(SRD_DIR, `${type}.json`);
  const entries = await readJsonArray(srdPath);
  const arraySchema = z.array(ContentTypeSchemas[type]);
  const result = arraySchema.safeParse(entries);
  if (!result.success) {
    console.error(`✗ ${type}: ${result.error.errors.length} erreurs de validation`);
    for (const err of result.error.errors.slice(0, 5)) {
      console.error(`    [${err.path.join('.')}]: ${err.message}`);
    }
    throw new Error(`[build-public-content] validation échouée pour ${type}`);
  }
  const outPath = join(OUT_DIR, `${type}.json`);
  await writeFile(outPath, JSON.stringify(result.data, null, 2), 'utf8');
  console.log(`  ✓ ${outPath}: ${result.data.length} entités`);
  return result.data.length;
}

async function main(): Promise<void> {
  console.log('=== content:build — orchestrateur (D17) ===');

  // 1. Extracteurs SRD dédiés (sous-process séquentiels).
  console.log('\n[1/3] Extracteurs SRD dédiés');
  for (const script of SRD_EXTRACTORS) {
    runExtractor(script);
  }

  // 2. Types re-validés depuis la base SRD curée.
  console.log('\n[2/3] Types re-validés (base SRD curée, SRD-only)');
  for (const type of SRD_MERGE_TYPES) {
    await buildMergeType(type);
  }

  // 3. Pass-through : on ne touche pas ces bundles (grandfathered).
  console.log('\n[3/3] Pass-through (préservés byte-identique)');
  for (const type of PASS_THROUGH_TYPES) {
    const path = join(OUT_DIR, `${type}.json`);
    console.log(`  ⏭ ${path}: préservé (non re-mergé).`);
  }

  // Index : utilitaire autonome, dernière étape, generatedAt stable.
  console.log('\n▶ scripts/update-content-index.ts');
  execFileSync('pnpm', ['tsx', 'scripts/update-content-index.ts'], { stdio: 'inherit' });

  console.log('\n=== content:build terminé ===');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
