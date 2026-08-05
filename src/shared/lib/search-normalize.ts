/**
 * Normalisation d'une chaîne pour la recherche texte : minuscules, accents
 * retirés, espaces des bords rognés.
 *
 * Une recherche accent-sensible est un piège en français : personne ne tape
 * « Frère Élyas » avec l'accent dans un champ de filtre, et un annuaire qui ne
 * répond pas à « elyas » passe pour cassé. Le motif `NFD` + suppression des
 * diacritiques était déjà écrit à six endroits (contenu, inventaire, export de
 * journal, création de personnage) ; il vit désormais ici pour les appelants
 * nouveaux — les copies existantes sont à rapatrier au fil de l'eau.
 */
export function normalizeForSearch(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('fr')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

/**
 * `haystack` contient-il `needle`, aux accents et à la casse près ? Une requête
 * vide matche tout (le filtre est alors inactif, pas « rien ne correspond »).
 */
export function matchesSearch(haystack: string, needle: string): boolean {
  const q = normalizeForSearch(needle);
  if (q === '') return true;
  return normalizeForSearch(haystack).includes(q);
}
