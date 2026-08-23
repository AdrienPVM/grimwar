/**
 * États maison (M8 de l'audit de malléabilité).
 *
 * Les sélecteurs d'états ne lisaient que `conditions.json` (SRD), et
 * `conditions` est explicitement hors des catégories de packs de contenu. Un MJ
 * ne pouvait donc pas poser « Marqué par le Chasseur » sur un monstre, alors
 * que le STOCKAGE accepte déjà n'importe quelle chaîne
 * (`encounterParticipantSchema.conditions: array(string().max(64))`) et que
 * l'affichage a déjà un repli pour un slug inconnu.
 *
 * Choix de représentation : on stocke le libellé **verbatim** derrière un
 * préfixe de namespace (`custom:Marqué par le Chasseur`) plutôt qu'un slug.
 * Slugifier perdrait les accents et la casse au retour (« Marque par le
 * chasseur »), ce que la table verrait à l'écran. Le préfixe garantit qu'un état
 * maison ne peut jamais entrer en collision avec un id SRD.
 *
 * Zéro schéma, zéro rule : c'est de la convention de valeur, pas de structure.
 */

export const CUSTOM_CONDITION_PREFIX = 'custom:';

/** Longueur max d'un état au schéma (`conditions: array(string().max(64))`). */
export const CONDITION_MAX_LENGTH = 64;

/** Longueur utile du libellé, une fois le préfixe déduit. */
export const CUSTOM_CONDITION_LABEL_MAX =
  CONDITION_MAX_LENGTH - CUSTOM_CONDITION_PREFIX.length;

/**
 * Construit l'identifiant d'un état maison à partir de ce que le MJ a tapé.
 * Renvoie `null` pour une saisie vide — rien à poser.
 */
export function toCustomConditionId(label: string): string | null {
  const trimmed = label.trim().slice(0, CUSTOM_CONDITION_LABEL_MAX);
  if (trimmed.length === 0) return null;
  return `${CUSTOM_CONDITION_PREFIX}${trimmed}`;
}

/** `true` si cet identifiant d'état est un état maison. */
export function isCustomCondition(id: string): boolean {
  return id.startsWith(CUSTOM_CONDITION_PREFIX);
}

/**
 * Libellé affichable d'un état maison, ou `null` si l'id n'en est pas un —
 * l'appelant retombe alors sur la résolution SRD habituelle.
 */
export function customConditionLabel(id: string): string | null {
  if (!isCustomCondition(id)) return null;
  return id.slice(CUSTOM_CONDITION_PREFIX.length);
}
