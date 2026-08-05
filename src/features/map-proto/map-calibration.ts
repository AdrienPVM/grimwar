/**
 * Calibrage d'une carte : conversion entre l'échelle SAISIE (mètres, convention
 * d'affichage FR du projet) et l'échelle STOCKÉE (`feetPerSquare`, entier de
 * pieds — valeur canonique SRD, cf. `shared/lib/rules/distance.ts`).
 *
 * Isolé du composant pour être testé nu : c'est le seul endroit du mode carte
 * où une saisie utilisateur redéfinit l'unité dont dérivent ENSUITE toutes les
 * distances (règle, portées de vision, gabarits d'AoE, rayons de lumière). Une
 * erreur ici est silencieuse et contamine toute la carte.
 */

/** Facteur d'affichage FR officiel : 5 ft = 1,50 m (cf. `distance.ts`). */
const FEET_PER_METER_SQUARE = 5 / 1.5;

/** Plafond de bon sens : au-delà, la saisie est une faute de frappe. */
const MAX_METERS_PER_SQUARE = 300;

/**
 * Mètres par case → pieds par case (entier ≥ 1, exigé par `mapMetaSchema`).
 * Retourne `null` sur une saisie inutilisable — le formulaire refuse alors
 * d'enregistrer plutôt que d'écrire une échelle absurde.
 *
 * Les valeurs usuelles tombent juste : 1,5 m → 5 ft · 3 m → 10 ft · 6 m → 20 ft.
 */
export function feetPerSquareFromMeters(meters: number): number | null {
  if (!Number.isFinite(meters) || meters <= 0) return null;
  if (meters > MAX_METERS_PER_SQUARE) return null;
  const feet = Math.round(meters * FEET_PER_METER_SQUARE);
  return feet >= 1 ? feet : 1;
}

/**
 * Pieds par case → valeur en mètres prête à peupler le champ de saisie : entier
 * nu quand c'est rond (`10 ft → "3"`), virgule décimale française sinon
 * (`5 ft → "1,5"`). Même règle de rendu que `formatMetersValue`, mais sans
 * unité — le champ porte son propre suffixe.
 */
export function metersPerSquareValue(feetPerSquare: number): string {
  const meters = feetPerSquare / FEET_PER_METER_SQUARE;
  return Number.isInteger(meters)
    ? String(meters)
    : meters.toFixed(1).replace('.', ',');
}
