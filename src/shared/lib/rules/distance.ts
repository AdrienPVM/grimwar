/**
 * Conversion de distance pieds → mètres pour l'AFFICHAGE.
 *
 * Le contenu SRD stocke les distances en PIEDS (valeur canonique : une espèce a
 * `speed: 30`, une portée d'arme `range: 20`, etc.). L'app, elle, affiche TOUT
 * en mètres — convention officielle D&D 5e FR : 1 case = 5 ft = 1,50 m, soit le
 * facteur `×0,3 m/pied` (cf. `FR_SRD_CC_v5.2.1.pdf`, et le bundle `spells.json`
 * où « 30 feet » est déjà rendu « 9 m »).
 *
 * On garde donc la valeur interne en pieds (source SRD, utilisée par les règles)
 * et on convertit UNIQUEMENT au rendu — jamais une seconde échelle stockée,
 * exactement comme la règle de mesure de la carte (`ruler-state.ts`) et le Codex.
 */

/** Pieds SRD → mètres (convention FR officielle : 5 ft = 1,50 m, soit ×0,3). */
export function feetToMeters(feet: number): number {
  return (feet / 5) * 1.5;
}

/**
 * Valeur en mètres formatée à la française, SANS unité : un entier reste nu
 * (`30 ft → "9"`), une valeur fractionnaire prend une décimale et la virgule
 * décimale française (`35 ft → "10,5"`). L'unité « m » est ajoutée par l'appelant
 * (label `sub`, suffixe « m », etc.) — séparer valeur et unité laisse le rendu
 * libre de styler l'unité distinctement.
 */
export function formatMetersValue(feet: number): string {
  const meters = feetToMeters(feet);
  return Number.isInteger(meters)
    ? String(meters)
    : meters.toFixed(1).replace('.', ',');
}
