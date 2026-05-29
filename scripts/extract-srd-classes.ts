/**
 * scripts/extract-srd-classes.ts (plan 13.7 §0.4 + JALON 2B.2a)
 *
 * Enrichit `public/data/classes.json` avec :
 *  - `divineOrders[]` sur l'entrée Cleric (Protector / Thaumaturge).
 *  - `primalOrders[]` sur l'entrée Druid (Magician / Warden).
 *  - `weaponMasteryCount` sur chacune des 12 classes (0 ou 2/3 selon SRD § C.1).
 *  - Backfill des features `Ability Score Improvement` aux niveaux SRD 5.2.1
 *    qui manquaient (cf. `SRD_ASI_LEVELS_PER_CLASS`) — JALON 2B.2a.
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
  SRD_ASI_LEVELS_PER_CLASS,
  SRD_CLASS_SKILL_CHOICES_OVERRIDE,
  SRD_CLASSES_COUNTS,
  SRD_WEAPON_MASTERY_COUNT_PER_CLASS,
  SRD_WEAPON_MASTERY_ELIGIBILITY_PER_CLASS,
} from './data/srd-classes-l1';

const CLASSES_PATH = 'public/data/classes.json';
const EXPECTED_CLASS_COUNT = 12;

interface ClassFeature {
  level: number;
  name: { fr: string; en: string };
  description: { fr: string; en: string };
}

interface ClassJsonEntry {
  id: string;
  divineOrders?: typeof CLERIC_DIVINE_ORDERS;
  primalOrders?: typeof DRUID_PRIMAL_ORDERS;
  weaponMasteryCount?: number;
  weaponMasteryEligibility?: 'all-proficient' | 'rogue-finesse-light';
  skillChoices?: { count: number; from: string[] };
  features?: ClassFeature[];
  [k: string]: unknown;
}

/**
 * Texte canonique d'une feature Ability Score Improvement (SRD 5.2.1).
 * Identique pour chaque classe et chaque niveau ASI > L1 — la mécanique est
 * déclarée une fois ; le tableau de progression de classe répète juste l'entrée
 * aux niveaux subséquents (cf. SRD : « You gain this feature again at … »).
 */
const ASI_FEATURE_NAME = {
  fr: 'Amélioration de caractéristique',
  en: 'Ability Score Improvement',
} as const;

const ASI_FEATURE_DESCRIPTION = {
  fr: 'Vous gagnez le don Amélioration de caractéristique (cf. « Dons ») ou un autre don de votre choix pour lequel vous remplissez les conditions.',
  en: 'You gain the Ability Score Improvement feat (see "Feats") or another feat of your choice for which you qualify.',
} as const;

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
  let skillOverridesApplied = 0;
  let asiBackfillsApplied = 0;
  const enriched = classes.map((cls) => {
    const out: ClassJsonEntry = { ...cls };

    // JALON 2B.2a — backfill ASIs manquants. Le bundle SRD initial n'avait
    // qu'une seule entrée ASI par classe (L4). Le SRD 5.2.1 en spécifie
    // 4-6 par classe (cf. SRD_ASI_LEVELS_PER_CLASS). On insère les entrées
    // manquantes en préservant strictement les features existantes —
    // jamais d'override.
    const targetAsiLevels = SRD_ASI_LEVELS_PER_CLASS[cls.id];
    if (targetAsiLevels === undefined) {
      throw new Error(
        `[extract-srd-classes] PARSE STRICT FAIL — class id "${cls.id}" n'a pas de niveaux ASI déclarés (cf. SRD_ASI_LEVELS_PER_CLASS).`,
      );
    }
    if (!Array.isArray(cls.features)) {
      throw new Error(
        `[extract-srd-classes] PARSE STRICT FAIL — class id "${cls.id}" n'a pas de tableau features[].`,
      );
    }
    const existingAsiLevels = new Set(
      cls.features
        .filter((f) => f.name.en === ASI_FEATURE_NAME.en)
        .map((f) => f.level),
    );
    const featuresOut: ClassFeature[] = [...cls.features];
    for (const level of targetAsiLevels) {
      if (existingAsiLevels.has(level)) continue;
      featuresOut.push({
        level,
        name: { ...ASI_FEATURE_NAME },
        description: { ...ASI_FEATURE_DESCRIPTION },
      });
      asiBackfillsApplied += 1;
    }
    // Tri stable par level puis par index d'insertion (préserve l'ordre
    // SRD à niveau égal — les features existantes apparaissent avant les
    // backfills à level identique, ce qui n'arrive jamais en pratique mais
    // garde la sémantique d'idempotence).
    featuresOut.sort((a, b) => a.level - b.level);
    out.features = featuresOut;
    if (cls.id === 'cleric') {
      out.divineOrders = CLERIC_DIVINE_ORDERS;
      clericFound = true;
    }
    if (cls.id === 'druid') {
      out.primalOrders = DRUID_PRIMAL_ORDERS;
      druidFound = true;
    }
    // Override SRD : matérialiser le pool de skill-picks pour les classes dont
    // le PDF dit « Choose any N » (cf. Bug 2 UAT 2026-05-18).
    const skillOverride = SRD_CLASS_SKILL_CHOICES_OVERRIDE[cls.id];
    if (skillOverride) {
      out.skillChoices = { count: skillOverride.count, from: [...skillOverride.from] };
      skillOverridesApplied += 1;
    }
    const count = SRD_WEAPON_MASTERY_COUNT_PER_CLASS[cls.id];
    if (count === undefined) {
      throw new Error(
        `[extract-srd-classes] PARSE STRICT FAIL — class id "${cls.id}" n'a pas d'allocation weaponMasteryCount définie.`,
      );
    }
    out.weaponMasteryCount = count;
    // JALON 2A.5 — éligibilité Weapon Mastery data-driven. La map peut
    // retourner `null` (classes sans mastery) — dans ce cas on OMET la clé du
    // bundle final pour rester strict avec le superRefine de ClassSchema
    // (count == 0 ⇔ eligibility absent).
    const eligibility = SRD_WEAPON_MASTERY_ELIGIBILITY_PER_CLASS[cls.id];
    if (eligibility === undefined) {
      throw new Error(
        `[extract-srd-classes] PARSE STRICT FAIL — class id "${cls.id}" n'a pas d'allocation weaponMasteryEligibility définie (mappe null pour les classes sans mastery).`,
      );
    }
    if (eligibility !== null) {
      out.weaponMasteryEligibility = eligibility;
    } else {
      delete out.weaponMasteryEligibility;
    }
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
    `[extract-srd-classes] OK — Cleric +${CLERIC_DIVINE_ORDERS.length} divineOrders, Druid +${DRUID_PRIMAL_ORDERS.length} primalOrders, ${totalMasteries} total weaponMasteryCount alloués L1, ${skillOverridesApplied} skillChoices override(s) appliqué(s), ${asiBackfillsApplied} ASI feature(s) backfillée(s) (cible ${SRD_CLASSES_COUNTS.totalAsiEntries} entrées totales).`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
