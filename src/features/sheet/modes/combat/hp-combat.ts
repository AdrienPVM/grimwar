/**
 * Logique pure HP/death-saves pour le mode Combat — extraite des composants
 * pour unit-testing fail-loud sans monter de DOM React.
 *
 * Règles (CLAUDE.md / DATA-MODEL.md) :
 *  - Damage absorbé d'abord par hp.temp puis hp.current.
 *  - Heal n'augmente jamais hp.temp et n'excède jamais hp.max.
 *  - Si current passe en-dessous de 0 et que les dégâts ≥ max, le PJ meurt
 *    instantanément (massive damage). Sinon il tombe à 0 et entre en death saves.
 *  - status:'dead' fige la fiche en read-only ; seul un revival peut sortir.
 */

import type { Character } from '@/shared/types/character';

export interface HpVitals {
  current: number;
  max: number;
  temp: number;
}

/** Renvoie le hp clampé à [0, max], jamais en dessous, jamais au-dessus du plafond. */
export function clampHpCurrent(value: number, max: number): number {
  if (max <= 0) return 0;
  if (value < 0) return 0;
  if (value > max) return max;
  return value;
}

/**
 * Bande de santé sémantique d'un ratio PV (current/max, supposé clampé à [0, 1]).
 * Pilote UNIQUEMENT la pastille d'état (point + mot) de la carte Vitalité — pas
 * un fond de jauge. Le grand nombre de PV reste doré ; le signal de santé passe
 * par une petite pastille colorée (vert sain → ambre blessé → rouge critique →
 * inconscient à 0 PV), jamais par une « barre de vie » qui remplit la carte.
 */
export type HpHealthBand = 'dead' | 'critical' | 'wounded' | 'healthy';

export function hpHealthBand(ratio: number): HpHealthBand {
  if (ratio <= 0) return 'dead';
  if (ratio < 0.25) return 'critical';
  if (ratio < 0.6) return 'wounded';
  return 'healthy';
}

/**
 * Libellé FR de la pastille d'état par bande. « Inconscient » = condition SRD FR
 * officielle pour 0 PV (le PJ chute inconscient + jets de mort). « À terre » est
 * proscrit : c'est la traduction officielle de la condition *Prone*, pas de 0 PV.
 */
export const HP_BAND_LABEL: Record<HpHealthBand, string> = {
  healthy: 'Sain',
  wounded: 'Blessé',
  critical: 'Critique',
  dead: 'Inconscient',
};

export interface ApplyDamageResult {
  hp: HpVitals;
  /** True si le PJ vient de tomber à 0 PV (déclenche la modale death-saves). */
  triggeredDying: boolean;
  /** True si dégâts ≥ max(absorbés inclus) — mort immédiate sans death saves. */
  triggeredMassiveDeath: boolean;
}

/**
 * Applique des dégâts à un PJ. Les dégâts négatifs ou nuls sont traités comme 0
 * (fail-loud serait disproportionné côté UI ; un long-press accidentel à 0 ne
 * doit pas crasher la fiche).
 */
export function applyDamage(hp: HpVitals, amount: number): ApplyDamageResult {
  const dmg = Math.max(0, Math.floor(amount));
  if (dmg === 0) {
    return { hp: { ...hp }, triggeredDying: false, triggeredMassiveDeath: false };
  }
  let tempLeft = hp.temp;
  let remaining = dmg;
  const absorbed = Math.min(tempLeft, remaining);
  tempLeft -= absorbed;
  remaining -= absorbed;
  const wasAlive = hp.current > 0;
  const newCurrent = clampHpCurrent(hp.current - remaining, hp.max);
  const overflow = hp.current - remaining; // négatif si massive
  const massive = wasAlive && newCurrent === 0 && -overflow >= hp.max;
  return {
    hp: { current: newCurrent, max: hp.max, temp: tempLeft },
    triggeredDying: wasAlive && newCurrent === 0 && !massive,
    triggeredMassiveDeath: massive,
  };
}

/**
 * DD du jet de sauvegarde de Constitution pour maintenir la Concentration après
 * avoir subi des dégâts (SRD 5.2.1, glossaire « Concentration ») : « Le DD est
 * égal à 10 ou à la moitié des dégâts subis (arrondir à l'inférieur), le nombre
 * le plus élevé étant retenu, jusqu'à un DD maximal de 30. »
 *
 * `damage` = montant de dégâts effectivement subis. Le calcul se fonde sur les
 * dégâts subis (les PV temporaires absorbent mais on « subit » quand même les
 * dégâts au sens de la Concentration). Valeurs négatives/nulles → plancher 10.
 */
export function concentrationSaveDc(damage: number): number {
  const half = Math.floor(Math.max(0, damage) / 2);
  return Math.min(30, Math.max(10, half));
}

/** Soigne — jamais au-dessus de hp.max, jamais touche à hp.temp. */
export function applyHeal(hp: HpVitals, amount: number): HpVitals {
  const heal = Math.max(0, Math.floor(amount));
  if (heal === 0) return { ...hp };
  return { current: clampHpCurrent(hp.current + heal, hp.max), max: hp.max, temp: hp.temp };
}

// ─────────────────────────────────────────────────────────────────────
// Death-save state machine
// ─────────────────────────────────────────────────────────────────────

export interface DeathSavesState {
  success: number;
  fail: number;
}

export type DeathSaveOutcome =
  | { kind: 'pending'; deathSaves: DeathSavesState }
  | { kind: 'stabilized'; deathSaves: DeathSavesState }
  | { kind: 'dead'; deathSaves: DeathSavesState }
  | { kind: 'revived'; deathSaves: DeathSavesState; restoredHp: number };

/**
 * Applique le résultat d'un lancer de d20 sur l'état des death saves.
 * Règles SRD 5.2.1 :
 *   - natural 1  : +2 échecs
 *   - natural 20 : revival immédiat à 1 PV, deathSaves remis à 0
 *   - ≥ 10 : +1 succès
 *   - < 10 : +1 échec
 *   - 3 succès cumulés → stabilisation (deathSaves reset)
 *   - 3 échecs cumulés → mort confirmée
 */
export function applyDeathSaveOutcome(
  current: DeathSavesState,
  naturalRoll: number,
): DeathSaveOutcome {
  if (naturalRoll < 1 || naturalRoll > 20 || !Number.isInteger(naturalRoll)) {
    throw new Error(`[death-saves] natural roll out of bounds: ${naturalRoll}`);
  }
  if (naturalRoll === 20) {
    return { kind: 'revived', deathSaves: { success: 0, fail: 0 }, restoredHp: 1 };
  }
  if (naturalRoll === 1) {
    const fail = Math.min(3, current.fail + 2);
    const next: DeathSavesState = { success: current.success, fail };
    if (fail >= 3) return { kind: 'dead', deathSaves: next };
    return { kind: 'pending', deathSaves: next };
  }
  if (naturalRoll >= 10) {
    const success = Math.min(3, current.success + 1);
    const next: DeathSavesState = { success, fail: current.fail };
    if (success >= 3) return { kind: 'stabilized', deathSaves: { success: 0, fail: 0 } };
    return { kind: 'pending', deathSaves: next };
  }
  const fail = Math.min(3, current.fail + 1);
  const next: DeathSavesState = { success: current.success, fail };
  if (fail >= 3) return { kind: 'dead', deathSaves: next };
  return { kind: 'pending', deathSaves: next };
}

/**
 * La fiche entière passe en read-only quand le PJ est mort. Seul le bouton
 * "Ressusciter" (DM only) reste interactif côté UI.
 */
export function isSheetReadOnly(character: Pick<Character, 'status'>): boolean {
  return character.status === 'dead';
}
