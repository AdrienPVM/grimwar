/**
 * Garde-fou anti-chaîne UI non traduite (FR par défaut) + termes FR
 * non-officiels.
 *
 * Ajouté 2026-05-19 suite au bug « Mastery · Écorchure » trouvé en UAT visuel
 * 4a (plan 13.9) — un préfixe EN codé en dur sur le badge Weapon Mastery de
 * la fiche Combat, alors que tout le reste de la chaîne était localisé.
 *
 * Étendu 2026-05-20 (UAT 4c bis) à une seconde catégorie distincte —
 * `FORBIDDEN_NON_OFFICIAL_FR_TERMS` — pour les chaînes FR qui ne sont pas
 * des anglicismes mais des traductions non-officielles (terme issu d'un
 * jeu vidéo, d'un fan-glossaire, ou inventé par l'agent). Source de
 * vérité terminologique = traduction officielle D&D 5e (SRD/PHB FR).
 * Cf. règle « Source d'autorité terminologique FR » dans CLAUDE.md.
 *
 * Principe : maintenir DEUX listes figées (anglicismes + non-officiels FR)
 * dont l'apparition dans une chaîne user-visible côté FR signifie qu'on
 * a oublié de passer par la traduction officielle. Chaque entrée s'ajoute
 * au moment où on trouve une fuite — les tableaux ne cherchent pas à être
 * exhaustifs a priori, ils enregistrent les pièges connus pour ne pas
 * les reproduire.
 *
 * Usage recommandé :
 *   import { expectNoForbiddenEnglish, expectNoForbiddenNonOfficialFr } from 'tests/helpers/i18n-guard';
 *   ...
 *   expectNoForbiddenEnglish(node.textContent ?? '', '<contexte>');
 *   expectNoForbiddenNonOfficialFr(node.textContent ?? '', '<contexte>');
 *
 * Le test ne raisonne PAS sur la grammaire FR — uniquement sur des tokens
 * connus. Pas de faux-positifs sur les noms propres (« Sap » dans un slug
 * d'enum n'est jamais user-visible — c'est `t()` qui rend la valeur
 * localisée, pas le slug brut).
 */

export const FORBIDDEN_ENGLISH_IN_FR_UI = [
  // Trouvé 2026-05-19 UAT 4a — badge Combat. Doit dire « Maîtrise ».
  'Mastery',
  // Trouvé 2026-05-20 UAT 4c — modale Ordre primordial du Druide Mage.
  // Le bundle SRD FR contenait 10 fuites de « cantrip(s) » (anglicisme).
  // Variantes singulier et pluriel listées séparément : `\b…\b` n'enjambe
  // pas la lettre finale, donc `cantrip` ne matcherait pas `cantrips`.
  'cantrip',
  'cantrips',
] as const;

export const FORBIDDEN_NON_OFFICIAL_FR_TERMS = [
  // Trouvé 2026-05-20 UAT 4c bis — la 1ère correction du bug « cantrip »
  // avait remplacé l'anglicisme par « tour de magie », terme issu du
  // doublage Baldur's Gate 3 (non-officiel et critiqué par la communauté
  // joueurs). La traduction OFFICIELLE D&D 5e (SRD FR + PHB FR) est
  // « sort mineur » / « sorts mineurs ». 3 variantes listées car
  // `\b…\b` n'enjambe pas le `s` final ni les majuscules ne sont déjà
  // gérées par le matching insensible à la casse.
  'tour de magie',
  'tours de magie',
] as const;

export type ForbiddenWord = (typeof FORBIDDEN_ENGLISH_IN_FR_UI)[number];
export type ForbiddenNonOfficialFr =
  (typeof FORBIDDEN_NON_OFFICIAL_FR_TERMS)[number];

/**
 * Renvoie la liste des termes interdits qui apparaissent dans `text`. Le
 * match est insensible à la casse mais respecte les bordures de mot
 * (`\b…\b`), donc « Sapmastery » ne déclenche pas sur « Mastery » et
 * « contour de magie » (pure invention illustrative) ne déclencherait
 * pas sur « tour de magie ».
 */
function findIn<T extends string>(text: string, words: readonly T[]): T[] {
  const found: T[] = [];
  for (const word of words) {
    const re = new RegExp(`\\b${word}\\b`, 'i');
    if (re.test(text)) found.push(word);
  }
  return found;
}

export function findForbiddenEnglish(text: string): ForbiddenWord[] {
  return findIn(text, FORBIDDEN_ENGLISH_IN_FR_UI);
}

export function findForbiddenNonOfficialFr(
  text: string,
): ForbiddenNonOfficialFr[] {
  return findIn(text, FORBIDDEN_NON_OFFICIAL_FR_TERMS);
}

/**
 * Helper d'assertion utilisable dans n'importe quel test jsdom/Vitest.
 * Lève une erreur descriptive avec le `context` fourni pour faciliter le
 * triage en CI.
 */
export function expectNoForbiddenEnglish(text: string, context: string): void {
  const found = findForbiddenEnglish(text);
  if (found.length > 0) {
    throw new Error(
      `[i18n-guard:${context}] mots EN interdits dans une chaîne FR : ` +
        `${found.join(', ')}. Passe la chaîne par t() avec la traduction FR.`,
    );
  }
}

/**
 * Variante pour les termes FR non-officiels (cf. CLAUDE.md règle
 * d'autorité terminologique). L'erreur rappelle la source de vérité.
 */
export function expectNoForbiddenNonOfficialFr(
  text: string,
  context: string,
): void {
  const found = findForbiddenNonOfficialFr(text);
  if (found.length > 0) {
    throw new Error(
      `[i18n-guard:${context}] termes FR non-officiels dans une chaîne user-visible : ` +
        `${found.join(', ')}. Utilise la traduction officielle D&D 5e (SRD/PHB FR).`,
    );
  }
}
