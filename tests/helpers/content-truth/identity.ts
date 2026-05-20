import { expect } from 'vitest';

import { normalizeText } from './normalize';

/**
 * Cat. 2 — Contenu affiche = contenu attendu (identite, pas presence).
 * (CLAUDE.md > Required at every commit > Verite du contenu.)
 *
 * `expectIdentityRender` compare ce qu'une modale/carte rend REELLEMENT contre
 * les champs EXACTS de l'entree de bundle correspondante, apres normalisation
 * des espaces (strategie D15 — cf. normalize.ts). On detecte « la modale du
 * sort A affiche le contenu du sort B », pas un espace en trop.
 *
 * Le helper accepte des CHAINES deja extraites (titre, description, meta) plutot
 * qu'un noeud DOM, pour rester utilisable a la fois en test de composant (on
 * extrait `node.textContent`) et en test de donnees pur (on passe les champs
 * localises du bundle). L'extraction DOM reste a la charge de l'appelant.
 */

/**
 * Sorts grandfathered D14 (DEBT.md > D14). Ces 4 sorts SRD embarquent un profil
 * de creature invoquee que l'extraction texte a aplati ; le bundle porte un
 * marqueur visible `[Profil de la creature invoquee non inclus ici ...]` a la
 * place. C'est une dette ASSUMEE — le helper tolere le marqueur pour ces slugs
 * uniquement, et echoue si un marqueur de dette apparait sur N'IMPORTE QUEL
 * autre contenu (= une nouvelle dette qui fuit silencieusement en prod).
 */
export const DEBT_D14_SPELL_SLUGS = [
  'appel-de-destrier',
  'animation-des-objets',
  'insecte-geant',
  'convocation-de-dragon',
] as const;

/** Marqueurs editoriaux de dette qui ne doivent jamais fuir dans le contenu. */
const DEBT_MARKER_RE = /\[(?:dette\b|Profil de la cr[eé]ature invoqu[eé]e|TODO\b|FIXME\b)/i;

export interface IdentityField {
  /** Nom du champ pour les messages d'erreur (ex. 'title', 'description'). */
  readonly label: string;
  /** Valeur attendue (champ localise du bundle). */
  readonly expected: string;
  /** Valeur rendue (extraite de la modale / carte). */
  readonly rendered: string;
}

export function expectIdentityRender(args: {
  /** Slug de l'entree, pour les messages + l'allowlist D14. */
  readonly slug: string;
  readonly fields: readonly IdentityField[];
}): void {
  const isD14 = (DEBT_D14_SPELL_SLUGS as readonly string[]).includes(args.slug);

  for (const field of args.fields) {
    expect(
      normalizeText(field.rendered),
      `[content-truth] identite "${args.slug}" · ${field.label} : le contenu rendu doit egaler EXACTEMENT le champ du bundle (apres normalisation des espaces)`,
    ).toBe(normalizeText(field.expected));

    // Garde anti-dette : un marqueur editorial qui fuit en prod est un bug,
    // sauf pour les 4 sorts D14 grandfathered.
    if (!isD14) {
      expect(
        DEBT_MARKER_RE.test(field.rendered),
        `[content-truth] identite "${args.slug}" · ${field.label} : marqueur de dette inattendu dans le contenu rendu (slug hors allowlist D14)`,
      ).toBe(false);
    }
  }
}
