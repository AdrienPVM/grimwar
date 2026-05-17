/**
 * scripts/extract-srd-weapon-mastery.ts (plan 13.7 §0.4)
 *
 * Enrichit `public/data/items.json` avec le champ `masteryProperty` sur chacune
 * des 37 armes SRD 5.2.1 éligibles (cf. `SRD_WEAPON_MASTERY` dans
 * `scripts/data/srd-weapon-mastery.ts`).
 *
 * Pattern (commun aux 5 scripts d'extraction du plan 13.7) :
 *   - **Source unique de vérité** : data table TS hand-curated, lui-même issu
 *     des PDFs SRD via `docs/AUDIT-SRD-COMPLETUDE.md`.
 *   - **Refus explicite** de lire `content-sources/aidedd/*` ou tout PDF
 *     non-SRD (politique de contenu CLAUDE.md decision log).
 *   - **Sortie déterministe** : entrées triées par id, formatage JSON stable
 *     (2 espaces d'indentation + LF final), idempotent. Une 2e exécution
 *     consécutive ne produit aucune diff.
 *   - **Parse strict** : si le compteur d'armes éligibles trouvées dans
 *     `items.json` est < 37, on échoue dur. Pas de défaut silencieux.
 *
 * Run : `pnpm tsx scripts/extract-srd-weapon-mastery.ts`
 */
import { readFile, writeFile } from 'node:fs/promises';

import {
  SRD_WEAPON_MASTERY,
  SRD_WEAPON_MASTERY_COUNT,
} from './data/srd-weapon-mastery';

const ITEMS_PATH = 'public/data/items.json';

interface ItemEntry {
  id: string;
  category?: string;
  masteryProperty?: string | null;
  [k: string]: unknown;
}

async function main(): Promise<void> {
  const raw = await readFile(ITEMS_PATH, 'utf-8');
  const items = JSON.parse(raw) as ItemEntry[];

  if (!Array.isArray(items)) {
    throw new Error(`[extract-srd-weapon-mastery] ${ITEMS_PATH} doit être un tableau`);
  }

  let matched = 0;
  const missingFromBundle: string[] = [];

  // 1. Enrichit chaque arme bundlée présente dans SRD_WEAPON_MASTERY.
  const enriched = items.map((item) => {
    if (item.category !== 'weapon') return item;
    const mastery = SRD_WEAPON_MASTERY[item.id];
    if (mastery !== undefined) {
      matched++;
      return { ...item, masteryProperty: mastery };
    }
    // Armes du bundle hors-SRD ou hors-mastery → on laisse `masteryProperty: null`.
    return { ...item, masteryProperty: null };
  });

  // 2. Détecte les armes SRD attendues mais absentes du bundle (= problème).
  for (const expectedId of Object.keys(SRD_WEAPON_MASTERY)) {
    if (!items.some((i) => i.id === expectedId)) {
      missingFromBundle.push(expectedId);
    }
  }

  // 3. Parse strict — échoue dur si compteur SRD attendu pas atteint.
  if (matched !== SRD_WEAPON_MASTERY_COUNT) {
    throw new Error(
      `[extract-srd-weapon-mastery] PARSE STRICT FAIL — attendu ${SRD_WEAPON_MASTERY_COUNT} armes SRD avec Mastery, trouvé ${matched}. Manquantes du bundle : ${missingFromBundle.join(', ') || '(aucune)'}.`,
    );
  }

  // 4. Tri déterministe par id (sortie stable inter-runs).
  enriched.sort((a, b) => a.id.localeCompare(b.id));

  // 5. Sérialisation stable : 2 espaces + LF final.
  const next = JSON.stringify(enriched, null, 2) + '\n';
  await writeFile(ITEMS_PATH, next, 'utf-8');

  console.log(
    `[extract-srd-weapon-mastery] OK — ${matched} armes enrichies avec masteryProperty.`,
  );
  if (missingFromBundle.length > 0) {
    console.warn(
      `[extract-srd-weapon-mastery] Manquantes du bundle (à investiguer en 13.10) : ${missingFromBundle.join(', ')}`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
