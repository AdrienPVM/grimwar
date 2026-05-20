/**
 * scripts/srd-spell-quality-gate.ts — GATE QUALITÉ permanente des sorts SRD.
 *
 * Né de la leçon du plan 13.10 : le pairing par empreinte avait produit des
 * inversions EN↔FR et l'extraction texte avait fait fuir des colonnes (bleeds),
 * vidant ou gonflant des descriptions. Les heuristiques de fallback ne l'avaient
 * pas vu ; c'est le **détecteur de ratio FR/EN par sort** qui l'a attrapé.
 *
 * On le fige donc en garde-fou pérenne, utilisé à DEUX endroits :
 *   1. `bootstrap-srd-spells.ts --gate` (valide le module ÉMIS, post-corrections).
 *   2. `scripts/__tests__/srd-spell-quality.test.ts` (CI, dans la triple gate).
 *
 * Deux invariants :
 *   A. PLANCHER de longueur — aucune description quasi-vide (signature d'un bleed
 *      qui a aspiré le texte vers le sort voisin ; ex. Divination FR vidée).
 *   B. RATIO FR/EN dans la bande robuste (médiane ±4·MAD) SAUF allowlist vérifiée
 *      (prose FR naturellement plus longue sur les sorts courts — faux positifs
 *      écartés à la main au commit 1, figés ici).
 */
import type { Spell } from '../src/shared/types/content';

/** Plancher : une description plus courte que ça = bleed quasi-vide (False Life EN = 38). */
const MIN_DESC_LEN = 25;

/**
 * Sorts hors bande LÉGITIMES (prose FR plus longue que l'EN sur des sorts courts).
 * Vérifiés à la main au commit 1 du plan 13.10 : aucun n'est corrompu (ni vide, ni
 * statblock, ni bleed) — la longueur FR > EN est naturelle. Tout NOUVEAU sort hors
 * bande non listé ici fait échouer la gate → revue humaine obligatoire (pas d'auto-extension).
 */
export const RATIO_ALLOWLIST: ReadonlySet<string> = new Set([
  'vol', // Fly — sort court, FR à peine plus long (r≈1.33, en limite haute).
  'vision-dans-le-noir', // Darkvision
  'verrou-magique', // Arcane Lock
  'soins', // Cure Wounds
  'passage-par-les-arbres', // Tree Stride
  'delivrance-des-maledictions', // Remove Curse
  'restauration-partielle', // Lesser Restoration
  'passage-sans-trace', // Pass without Trace
  'assistance', // Guidance
]);

const MAD_MULTIPLIER = 4;

export interface QualityResult {
  violations: string[];
  band: [number, number];
  median: number;
}

/** Calcule les violations de qualité sur un jeu de sorts (vide = sain). */
export function checkSpellQuality(spells: readonly Spell[]): QualityResult {
  const violations: string[] = [];

  // ── Invariant A — plancher de longueur (les 2 langues) ──
  for (const s of spells) {
    const frLen = s.description.fr?.length ?? 0;
    const enLen = s.description.en?.length ?? 0;
    if (frLen < MIN_DESC_LEN)
      violations.push(`[planché FR] ${s.id} — description.fr ${frLen} car (< ${MIN_DESC_LEN}) : bleed/quasi-vide ?`);
    if (enLen < MIN_DESC_LEN)
      violations.push(`[planché EN] ${s.id} — description.en ${enLen} car (< ${MIN_DESC_LEN}) : bleed/quasi-vide ?`);
  }

  // ── Invariant B — ratio FR/EN dans la bande robuste, sauf allowlist ──
  const rated = spells
    .filter((s) => (s.description.fr?.length ?? 0) > 50 && (s.description.en?.length ?? 0) > 50)
    .map((s) => ({ id: s.id, r: s.description.fr.length / s.description.en!.length }));
  const sorted = [...rated].map((x) => x.r).sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const mad = [...rated]
    .map((x) => Math.abs(x.r - median))
    .sort((a, b) => a - b)[Math.floor(rated.length / 2)];
  const lo = median - MAD_MULTIPLIER * mad;
  const hi = median + MAD_MULTIPLIER * mad;
  for (const { id, r } of rated) {
    if ((r < lo || r > hi) && !RATIO_ALLOWLIST.has(id))
      violations.push(
        `[ratio] ${id} — FR/EN=${r.toFixed(2)} hors bande [${lo.toFixed(2)}, ${hi.toFixed(2)}] et hors allowlist : inversion/bleed/statblock ?`,
      );
  }

  return { violations, band: [lo, hi], median };
}
