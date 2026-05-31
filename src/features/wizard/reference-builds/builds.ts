import {
  pointBuyRemaining,
  STANDARD_ARRAY,
} from '@/shared/lib/rules/abilities';
import type { AbilityMethod } from '@/shared/lib/slices/wizard-slice';
import type { AbilityCode } from '@/shared/types/character';

/**
 * Reference builds (plan 05 §D.2.b) — « Choisir pour moi » par classe.
 *
 * Chaque entrée définit :
 *   - une distribution de caractéristiques cohérente pour la classe (priorise
 *     les stats clés sans tomber sous le seuil utile).
 *   - une présélection de compétences (ID kebab-case).
 *   - le choix de starting equipment (index dans `class.startingEquipment.options`).
 *   - des sorts par défaut (cantrips + niveau 1) keyés par classId, parmi les
 *     candidats listés.
 *
 * On expose l'API via 4 `apply*` plutôt que de retourner un gros objet, pour
 * que les composants n'aient à connaître que ce qu'ils consomment.
 *
 * Test : `reference-builds.test.ts` valide qu'un build de référence soumis au
 * wizard produit un Character valide vs CharacterSchema (cf. plan 05 §G.1).
 */

export interface ReferenceBuild {
  classId: string;
  /** Tableau standard distribué (ordre = FOR/DEX/CON/INT/SAG/CHA). */
  standardArray: readonly [number, number, number, number, number, number];
  /** Point buy distribution (somme = 27, valeurs ∈ [8, 15]). */
  pointBuy: readonly [number, number, number, number, number, number];
  /** Skills favorites pour cette classe — sera filtré contre `allowed`. */
  preferredSkills: readonly string[];
  /** Index dans `class.startingEquipment.options` (0 = A par défaut). */
  equipmentOption: number;
  /** Cantrips favoris (par ordre de préférence). */
  preferredCantrips: readonly string[];
  /** Sorts de niveau 1 favoris. */
  preferredLevel1Spells: readonly string[];
}

import { BARBARIAN_BUILD } from './barbarian';
import { BARD_BUILD } from './bard';
import { CLERIC_BUILD } from './cleric';
import { DRUID_BUILD } from './druid';
import { FIGHTER_BUILD } from './fighter';
import { MONK_BUILD } from './monk';
import { PALADIN_BUILD } from './paladin';
import { RANGER_BUILD } from './ranger';
import { ROGUE_BUILD } from './rogue';
import { SORCERER_BUILD } from './sorcerer';
import { WARLOCK_BUILD } from './warlock';
import { WIZARD_BUILD } from './wizard';

export const REFERENCE_BUILDS: Record<string, ReferenceBuild> = {
  barbarian: BARBARIAN_BUILD,
  bard: BARD_BUILD,
  cleric: CLERIC_BUILD,
  druid: DRUID_BUILD,
  fighter: FIGHTER_BUILD,
  monk: MONK_BUILD,
  paladin: PALADIN_BUILD,
  ranger: RANGER_BUILD,
  rogue: ROGUE_BUILD,
  sorcerer: SORCERER_BUILD,
  warlock: WARLOCK_BUILD,
  wizard: WIZARD_BUILD,
};

/**
 * Retourne une distribution de stats prête à plugger dans le draft Zustand.
 * Tombe sur un fallback "10 partout" si la classe est inconnue ou si la méthode
 * choisie est "manual" (on n'écrase pas le draft manuel).
 */
export function applyReferenceAbilities(
  classId: string,
  method: AbilityMethod,
): Record<AbilityCode, number> {
  const build = REFERENCE_BUILDS[classId];
  // `manual` et `rolled` ne sont pas écrasables par un autofill : `manual`
  // attend une saisie libre, `rolled` a son propre flow de tirage (cf.
  // abilities-step.tsx). Pour les deux on retourne le baseline 10/partout.
  if (!build || method === 'manual' || method === 'rolled') {
    return { for: 10, dex: 10, con: 10, int: 10, sag: 10, cha: 10 };
  }
  const tuple = method === 'point-buy' ? build.pointBuy : build.standardArray;
  // ABILITY_ORDER et le tuple ont tous deux exactement 6 éléments — typage
  // statique sûr mais TS strict ne le déduit pas du `readonly` array.
  const [forV, dexV, conV, intV, sagV, chaV] = tuple;
  return { for: forV, dex: dexV, con: conV, int: intV, sag: sagV, cha: chaV };
}

/**
 * Picks N skills parmi ceux autorisés, en privilégiant les preferredSkills du
 * build. Fallback : prend les premiers `allowed` si on n'a pas assez de favoris.
 */
export function applyReferenceSkills(
  classId: string,
  allowed: readonly string[],
  count: number,
): string[] {
  const build = REFERENCE_BUILDS[classId];
  if (!build) return allowed.slice(0, count);
  const picked: string[] = [];
  for (const fav of build.preferredSkills) {
    if (allowed.includes(fav) && !picked.includes(fav)) picked.push(fav);
    if (picked.length >= count) break;
  }
  for (const s of allowed) {
    if (picked.length >= count) break;
    if (!picked.includes(s)) picked.push(s);
  }
  return picked.slice(0, count);
}

/** Retourne l'index d'option de starting equipment recommandé pour la classe. */
export function applyReferenceEquipment(classId: string): number {
  return REFERENCE_BUILDS[classId]?.equipmentOption ?? 0;
}

/** Choisit cantrips + sorts de niveau 1 dans les options disponibles. */
export function applyReferenceSpells(
  classId: string,
  availableCantrips: readonly string[],
  availableLevel1: readonly string[],
  cantripQuota: number,
  level1Quota: number,
): { cantrips: string[]; level1: string[] } {
  const build = REFERENCE_BUILDS[classId];
  const fallback = (avail: readonly string[], n: number): string[] =>
    avail.slice(0, n);
  if (!build) {
    return {
      cantrips: fallback(availableCantrips, cantripQuota),
      level1: fallback(availableLevel1, level1Quota),
    };
  }
  const cantrips: string[] = [];
  for (const fav of build.preferredCantrips) {
    if (availableCantrips.includes(fav) && !cantrips.includes(fav)) cantrips.push(fav);
    if (cantrips.length >= cantripQuota) break;
  }
  for (const c of availableCantrips) {
    if (cantrips.length >= cantripQuota) break;
    if (!cantrips.includes(c)) cantrips.push(c);
  }

  const level1: string[] = [];
  for (const fav of build.preferredLevel1Spells) {
    if (availableLevel1.includes(fav) && !level1.includes(fav)) level1.push(fav);
    if (level1.length >= level1Quota) break;
  }
  for (const s of availableLevel1) {
    if (level1.length >= level1Quota) break;
    if (!level1.includes(s)) level1.push(s);
  }

  return {
    cantrips: cantrips.slice(0, cantripQuota),
    level1: level1.slice(0, level1Quota),
  };
}

/** Garde-fou test : la somme du tuple point-buy doit valoir 27. */
export function pointBuyValid(build: ReferenceBuild): boolean {
  const [forV, dexV, conV, intV, sagV, chaV] = build.pointBuy;
  return (
    pointBuyRemaining({ for: forV, dex: dexV, con: conV, int: intV, sag: sagV, cha: chaV }) ===
    0
  );
}

/** Garde-fou test : le standard-array doit consommer exactement [15,14,13,12,10,8]. */
export function standardArrayValid(build: ReferenceBuild): boolean {
  const sorted = [...build.standardArray].sort((a, b) => b - a);
  const std = [...STANDARD_ARRAY].sort((a, b) => b - a);
  return sorted.length === std.length && sorted.every((v, i) => v === std[i]);
}
