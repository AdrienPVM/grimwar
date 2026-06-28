/**
 * Facteur de puissance (FP / Challenge Rating) affiché de façon lisible.
 *
 * Le SRD stocke les FP fractionnaires en décimal (0.125, 0.25, 0.5) ; on les
 * rend sous forme de fraction conventionnelle (1/8, 1/4, 1/2), entier sinon.
 * Helper partagé : bestiaire du Codex, fiche de créature, sélecteur de monstre
 * de la carte — une seule source pour éviter la dérive.
 */
export function formatCr(cr: number): string {
  if (cr === 0.125) return '1/8';
  if (cr === 0.25) return '1/4';
  if (cr === 0.5) return '1/2';
  return String(cr);
}
