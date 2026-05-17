/**
 * scripts/extract-srd-classes.ts (plan 13.7 §0.4)
 *
 * Enrichit `public/data/classes.json` avec :
 *  - `divineOrders[]` sur l'entrée Cleric (Protector / Thaumaturge).
 *  - `primalOrders[]` sur l'entrée Druid (Magician / Warden).
 *  - `weaponMasteryCount` sur chacune des 12 classes (0 ou 2/3 selon SRD § C.1).
 *
 * Pattern commun : déterministe, idempotent, parse strict (12 classes attendues,
 * Cleric/Druid présents). Aucune lecture en dehors des PDFs SRD.
 *
 * Run : `pnpm tsx scripts/extract-srd-classes.ts`
 */
import { readFile, writeFile } from 'node:fs/promises';

import {
  CLERIC_DIVINE_ORDERS,
  DRUID_PRIMAL_ORDERS,
  SRD_CLASSES_COUNTS,
  SRD_WEAPON_MASTERY_COUNT_PER_CLASS,
} from './data/srd-classes-l1';

const CLASSES_PATH = 'public/data/classes.json';
const EXPECTED_CLASS_COUNT = 12;

interface ClassJsonEntry {
  id: string;
  divineOrders?: typeof CLERIC_DIVINE_ORDERS;
  primalOrders?: typeof DRUID_PRIMAL_ORDERS;
  weaponMasteryCount?: number;
  [k: string]: unknown;
}

async function main(): Promise<void> {
  const raw = await readFile(CLASSES_PATH, 'utf-8');
  const classes = JSON.parse(raw) as ClassJsonEntry[];
  if (!Array.isArray(classes)) {
    throw new Error(`[extract-srd-classes] ${CLASSES_PATH} doit être un tableau`);
  }

  if (classes.length !== EXPECTED_CLASS_COUNT) {
    throw new Error(
      `[extract-srd-classes] PARSE STRICT FAIL — attendu ${EXPECTED_CLASS_COUNT} classes, trouvé ${classes.length}.`,
    );
  }

  let clericFound = false;
  let druidFound = false;
  const enriched = classes.map((cls) => {
    const out: ClassJsonEntry = { ...cls };
    if (cls.id === 'cleric') {
      out.divineOrders = CLERIC_DIVINE_ORDERS;
      clericFound = true;
    }
    if (cls.id === 'druid') {
      out.primalOrders = DRUID_PRIMAL_ORDERS;
      druidFound = true;
    }
    const count = SRD_WEAPON_MASTERY_COUNT_PER_CLASS[cls.id];
    if (count === undefined) {
      throw new Error(
        `[extract-srd-classes] PARSE STRICT FAIL — class id "${cls.id}" n'a pas d'allocation weaponMasteryCount définie.`,
      );
    }
    out.weaponMasteryCount = count;
    return out;
  });

  if (!clericFound) {
    throw new Error(`[extract-srd-classes] PARSE STRICT FAIL — id "cleric" absent du bundle.`);
  }
  if (!druidFound) {
    throw new Error(`[extract-srd-classes] PARSE STRICT FAIL — id "druid" absent du bundle.`);
  }

  // Tri déterministe par id.
  enriched.sort((a, b) => a.id.localeCompare(b.id));

  const next = JSON.stringify(enriched, null, 2) + '\n';
  await writeFile(CLASSES_PATH, next, 'utf-8');

  const totalMasteries = SRD_CLASSES_COUNTS.totalWeaponMasteries;
  console.log(
    `[extract-srd-classes] OK — Cleric +${CLERIC_DIVINE_ORDERS.length} divineOrders, Druid +${DRUID_PRIMAL_ORDERS.length} primalOrders, ${totalMasteries} total weaponMasteryCount alloués L1.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
