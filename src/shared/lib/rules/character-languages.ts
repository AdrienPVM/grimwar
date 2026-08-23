import { getLanguage, type LanguageEntry } from './languages';

/**
 * Résout la liste des langues connues d'un personnage à l'affichage.
 *
 * Sources agrégées (SRD 5.2.1) :
 *   • langues d'ascendance (`ancestry.languages`, toujours « common » au minimum,
 *     + langue propre des lignées Tieffelin/Elfe/Gnome le cas échéant) ;
 *   • langues bonus choisies au wizard (`character.extraLanguages`, ex. langue
 *     supplémentaire du Roublard) ;
 *   • langues issues d'autres sources (`character.extraProficiencies.languages`,
 *     ex. dons/objets — alimenté par les plans feat à venir).
 *
 * Dérivée, non dénormalisée : seule la langue d'ascendance « common » est
 * garantie ; le reste vient des champs persistés. On déduplique par id et on
 * place « Commun » en tête (langue universelle), puis un tri FR pour un rendu
 * stable.
 *
 * Un id HORS registre est rendu tel quel plutôt que jeté (M17). Le registre ne
 * contient que les 16 langues SRD, et une table joue des langues de son monde
 * (« thayen ») : les faire disparaître en silence de la fiche après les avoir
 * saisies serait pire qu'un libellé approximatif.
 *
 * Pas d'effet de bord, pas de Math.random — testable en isolation.
 */
export function resolveCharacterLanguages(input: {
  ancestryLanguages: readonly string[];
  extraLanguages: readonly string[];
  proficiencyLanguages?: readonly string[];
}): LanguageEntry[] {
  const ids = new Set<string>([
    ...input.ancestryLanguages,
    ...input.extraLanguages,
    ...(input.proficiencyLanguages ?? []),
  ]);
  const entries: LanguageEntry[] = [];
  for (const id of ids) {
    if (id.trim().length === 0) continue;
    entries.push(
      getLanguage(id) ?? {
        id,
        name: { fr: id, en: id },
        tier: 'rare',
        script: '—',
      },
    );
  }
  // Tri : Commun en tête, puis alphabétique FR (rendu stable, lisible).
  return entries.sort((a, b) => {
    if (a.id === 'common') return -1;
    if (b.id === 'common') return 1;
    return a.name.fr.localeCompare(b.name.fr, 'fr');
  });
}
