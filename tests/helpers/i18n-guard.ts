/**
 * Garde-fou anti-chaîne UI non traduite (FR par défaut).
 *
 * Ajouté 2026-05-19 suite au bug « Mastery · Écorchure » trouvé en UAT visuel
 * 4a (plan 13.9) — un préfixe EN codé en dur sur le badge Weapon Mastery de
 * la fiche Combat, alors que tout le reste de la chaîne était localisé.
 *
 * Principe : maintenir une liste figée de mots EN dont l'apparition dans une
 * chaîne user-visible côté FR signifie qu'on a oublié de passer par `t()`.
 * Chaque entrée s'ajoute au moment où on trouve une fuite — le tableau ne
 * cherche pas à être exhaustif a priori, il enregistre les pièges connus
 * pour ne pas les reproduire.
 *
 * Usage recommandé :
 *   import { expectNoForbiddenEnglish } from 'tests/helpers/i18n-guard';
 *   ...
 *   expectNoForbiddenEnglish(node.textContent ?? '', '<contexte>');
 *
 * Le test ne raisonne PAS sur la grammaire FR — uniquement sur des mots
 * EN tokens connus. Pas de faux-positifs sur les noms propres (« Sap » dans
 * un slug d'enum n'est jamais user-visible — c'est `t()` qui rend la valeur
 * localisée, pas le slug brut).
 */

export const FORBIDDEN_ENGLISH_IN_FR_UI = [
  // Trouvé 2026-05-19 UAT 4a — badge Combat. Doit dire « Maîtrise ».
  'Mastery',
] as const;

export type ForbiddenWord = (typeof FORBIDDEN_ENGLISH_IN_FR_UI)[number];

/**
 * Renvoie la liste des mots EN interdits qui apparaissent dans `text`. Le
 * match est insensible à la casse mais respecte les bordures de mot
 * (`\b…\b`), donc « Sapmastery » ne déclenche pas sur « Mastery ».
 */
export function findForbiddenEnglish(text: string): ForbiddenWord[] {
  const found: ForbiddenWord[] = [];
  for (const word of FORBIDDEN_ENGLISH_IN_FR_UI) {
    const re = new RegExp(`\\b${word}\\b`, 'i');
    if (re.test(text)) found.push(word);
  }
  return found;
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
