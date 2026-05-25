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

/**
 * Fragments de mots cassés par insertions d'espaces parasites — typiquement
 * issus d'extractions PDF où le letter-spacing (tracking CSS-like) ou un
 * saut de colonne a injecté des espaces à l'intérieur d'un mot.
 *
 * Ajouté 2026-05-25 plan D15 — l'audit du bundle a confirmé des occurrences
 * réelles sur 4 fichiers (`spells.json`, `classes.json`, `subclasses.json`).
 * Liste : « Vot re » au lieu de « Votre », « heu r es » au lieu de
 * « heures », « no a ns wer » au lieu de « no answer », etc.
 *
 * Chaque entrée doit représenter une cassure SPÉCIFIQUE (pas un détecteur
 * générique — les heuristiques par token court produisent ~5000 faux-positifs
 * sur les bundles SRD à cause des articles, prépositions et noms courts FR
 * légitimes). On grave ici les cassures CONNUES pour bloquer leur
 * réintroduction. Toute nouvelle cassure découverte s'ajoute à la liste.
 *
 * Le regex `\b…\b` n'est PAS utilisé : on matche la sous-chaîne brute pour
 * que « Vot re » dans « Vot reChose » se déclenche aussi (au cas où une
 * concaténation pathologique survive un fix incomplet). Le test scanne
 * tous les bundles `public/data/*.json` indistinctement.
 */
export const FORBIDDEN_LETTER_SPACING_BREAKS = [
  // spells.json — atHigherLevels Bénédiction / Communication avec les morts
  // / variantes Drape de l'oubli / Domination de monstre. Cassure de « Votre ».
  'Vot re',
  // spells.json — atHigherLevels Bénédiction. Cassure de « heures ».
  'heu r es',
  // spells.json — description Augure (EN). Cassure de « no answer ».
  'no a ns wer',
  // spells.json — description Pétrification + Communication suprême (FR).
  // Cassure de « l'autre ». Apostrophe FR U+2019 (’), pas ASCII (').
  'l’aut re',
  // spells.json — Pétrification (FR) variante avec préfixe « dans ».
  // Capturé séparément car la cassure inclut « da n s ».
  'da n s l’aut re',
  // spells.json — description Création/Destruction d'eau (EN). Cassure
  // de « Destroy ».
  'Des t roy',
  // spells.json — description Lever malédiction (FR). Cassure de
  // « débarrasser ».
  'déba r ra sser',
  // spells.json — description Esprit du fé (EN). Cassure de « the fear ».
  't he fea r',
  // spells.json + classes.json — cassure de « saving throw » (EN).
  // Variantes : « saving t hrow » (spells.json) et « sav ing t hrow »
  // (classes.json). Listées séparément car le préfixe diffère.
  'saving t hrow',
  'sav ing t hrow',
  // classes.json — description Moine frappe étourdissante (FR). Cassure
  // de « l'Avantage ». Apostrophe FR U+2019 (’).
  '’Av a nt a g e',
  // classes.json — description Eldritch Smite (EN). Cassure de « smaller ».
  'sma l ler',
  // classes.json — table Monk Features (EN). Cassure de « 10 ft. » répétée
  // (« 1d62+10 f t . 3+2... »). Le bundle ne contient pas « +15 f t . »
  // (la même table a « +15 ft. » non-cassé) — on ne fige que le pattern réel.
  '+10 f t .',
  // subclasses.json — table Nature's Ward (FR). Cassure de « Tempéré » et
  // « Tropical ». Note : « Tempéré » contient un accent ; on matche la
  // cassure exacte sans `\b…\b`.
  'Te m pé ré',
  'Tropic al',
  // subclasses.json — table Nature's Ward (EN). Cassure de « Land Type »
  // et « Temperate ».
  'L a n d Ty p e',
  'Te m pe r at e',
  // subclasses.json — description Champion (EN). Cassure de « victor ».
  'v ic tor',
] as const;

export type ForbiddenWord = (typeof FORBIDDEN_ENGLISH_IN_FR_UI)[number];
export type ForbiddenNonOfficialFr =
  (typeof FORBIDDEN_NON_OFFICIAL_FR_TERMS)[number];
export type ForbiddenLetterSpacingBreak =
  (typeof FORBIDDEN_LETTER_SPACING_BREAKS)[number];

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
 * Cherche les cassures de letter-spacing. Contrairement aux mots interdits
 * EN ou FR non-officiels (match `\b…\b`), ici on cherche la SOUS-CHAÎNE
 * brute — une cassure pathologique reste pathologique même si elle s'imbrique
 * dans un mot composé (matche aussi « Vot reChose »).
 */
export function findForbiddenLetterSpacingBreaks(
  text: string,
): ForbiddenLetterSpacingBreak[] {
  const found: ForbiddenLetterSpacingBreak[] = [];
  for (const fragment of FORBIDDEN_LETTER_SPACING_BREAKS) {
    if (text.includes(fragment)) found.push(fragment);
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
