/**
 * Verite du contenu — normalisation de texte (cat. 2).
 *
 * Strategie D15 (CLAUDE.md > Required at every commit) : on compare les
 * descriptions de bundle apres normalisation des espaces. Le but est de
 * detecter « la modale du sort A affiche le contenu du sort B », PAS « il
 * manque un espace ici » (artefacts de letter-spacing residuels, dette D15).
 *
 * On reduit toute sequence d'espaces blancs (espaces, tabulations, retours
 * ligne, espaces insecables U+00A0, fines U+202F) a un espace simple, puis on
 * trim. `\s` en JS inclut deja U+00A0 et U+202F, donc une seule classe suffit.
 * Pas de toLowerCase, pas de suppression d'accents : l'identite FR/EN reste
 * significative.
 */
export function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}
