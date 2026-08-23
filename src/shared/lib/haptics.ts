import { hapticsEnabled } from './slices/device-prefs-slice';
import type { ToastKind } from './slices/toast-slice';

/**
 * Retour haptique des issues de jeu.
 *
 * POURQUOI : GrimWar se joue en présentiel, téléphone posé sur la table à côté
 * des dés. Le joueur qui lance ne regarde pas son écran au moment où le
 * résultat tombe — il regarde le MJ. Une vibration porte l'issue jusqu'à la
 * main sans exiger le coup d'œil, et distingue le coup critique du reste sans
 * rien lire.
 *
 * Les motifs sont volontairement TRÈS courts. Une vibration longue autour d'une
 * table est un bruit : le téléphone résonne sur le bois et couvre la parole.
 *   - jet ordinaire  : une impulsion sèche, à peine perceptible.
 *   - critique       : deux impulsions rapprochées — « c'est arrivé, et c'est
 *                      remarquable ».
 *   - échec critique : une impulsion plus longue, plus sourde.
 *   - soin / dégâts  : impulsion unique, plus douce que le jet.
 *
 * `navigator.vibrate` n'existe pas sur iOS Safari. Ce n'est pas une erreur à
 * corriger : la garde renvoie simplement `false` et rien ne se produit. Aucun
 * appelant n'a besoin de savoir sur quelle plateforme il tourne.
 */

/** Motifs en millisecondes, au format attendu par `navigator.vibrate`. */
const PATTERNS: Partial<Record<ToastKind, number | readonly number[]>> = {
  roll: 12,
  crit: [16, 40, 26],
  fumble: 60,
  damage: 18,
  heal: 14,
  // `info` et `grim` sont muets : ce sont des messages d'application
  // (sauvegarde, avertissement), pas des issues de jeu. Faire vibrer une
  // confirmation d'enregistrement transformerait la vibration en bruit de fond,
  // et le jour où elle compte vraiment on ne la remarquerait plus.
};

/**
 * Déclenche le motif correspondant à une issue de jeu. Silencieux si l'appareil
 * ne sait pas vibrer, si le joueur a coupé le retour haptique, ou si le type
 * d'événement n'est pas une issue de jeu.
 *
 * Retourne `true` quand une vibration a effectivement été demandée — utile aux
 * tests, jamais consulté par l'UI.
 */
export function vibrateForOutcome(kind: ToastKind): boolean {
  const pattern = PATTERNS[kind];
  if (pattern === undefined) return false;
  if (!hapticsEnabled()) return false;
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return false;
  try {
    return navigator.vibrate(pattern as number | number[]);
  } catch {
    // Certains navigateurs lèvent si l'onglet n'a jamais reçu d'interaction
    // utilisateur. Un retour tactile raté ne doit jamais casser un jet de dés.
    return false;
  }
}
