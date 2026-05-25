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
 * Marqueurs editoriaux de dette qui ne doivent JAMAIS fuir dans le contenu.
 *
 * Historique : jusqu'au plan D14, une allowlist `DEBT_D14_SPELL_SLUGS` tolerait
 * le marqueur `[Profil de la creature invoquee ...]` sur 4 sorts (Find Steed,
 * Animate Objects, Giant Insect, Summon Dragon). D14 a injecte le bundle
 * `summoned-creatures` et retire les marqueurs des 4 sorts → l'allowlist est
 * desormais SANS OBJET. La classe entiere du bug « un marqueur de dette
 * apparait en prod sur n'importe quel slug » devient structurellement
 * impossible : le helper echoue HARD pour TOUT slug, sans exception.
 */
const DEBT_MARKER_RE = /\[(?:dette\b|Profil de la cr[eé]ature invoqu[eé]e|Summoned[- ]creature stat block omitted|TODO\b|FIXME\b)/i;

export interface IdentityField {
  /** Nom du champ pour les messages d'erreur (ex. 'title', 'description'). */
  readonly label: string;
  /** Valeur attendue (champ localise du bundle). */
  readonly expected: string;
  /** Valeur rendue (extraite de la modale / carte). */
  readonly rendered: string;
}

export function expectIdentityRender(args: {
  /** Slug de l'entree, pour les messages. */
  readonly slug: string;
  readonly fields: readonly IdentityField[];
}): void {
  for (const field of args.fields) {
    expect(
      normalizeText(field.rendered),
      `[content-truth] identite "${args.slug}" · ${field.label} : le contenu rendu doit egaler EXACTEMENT le champ du bundle (apres normalisation des espaces)`,
    ).toBe(normalizeText(field.expected));

    // Garde anti-dette : un marqueur editorial qui fuit en prod est un bug,
    // sans exception (post-D14).
    expect(
      DEBT_MARKER_RE.test(field.rendered),
      `[content-truth] identite "${args.slug}" · ${field.label} : marqueur de dette inattendu dans le contenu rendu`,
    ).toBe(false);
  }
}
