import type { Item } from '@/shared/types/content';

/**
 * Règles Weapon Mastery SRD 5.2.1 (plan 13.9).
 *
 * Source : `docs/AUDIT-SRD-COMPLETUDE.md > C.1` — table d'allocation par
 * classe. À L1, la classe accède à un sous-ensemble d'armes éligibles selon
 * ses maîtrises (proficiencies) :
 *
 * - Barbare / Guerrier / Paladin / Rôdeur : simple OU martiale → toutes les
 *   armes du SRD avec `masteryProperty` sont éligibles.
 * - Roublard : simple OU (martiale ayant Finesse OU Light) → sous-ensemble.
 *
 * Le moine n'a PAS Weapon Mastery au SRD (cf. plan 13.9 Notes — `weaponMasteryCount`
 * = 0 dans le bundle → pas d'appel à cette fonction).
 */

/**
 * Renvoie les ids d'items éligibles à Weapon Mastery pour une classe donnée.
 * Filtré sur `masteryProperty` présent ET sur les maîtrises de classe SRD.
 *
 * Le tri stable (par nom) est appliqué pour que l'ordre des cartes du chooser
 * reste constant entre les sessions — pas de "ça bouge à chaque F5".
 */
export function getEligibleWeaponMasteryIds(
  classId: string,
  items: readonly Item[],
  locale: 'fr' | 'en' = 'fr',
): readonly Item[] {
  const withMastery = items.filter(
    (it) => it.category === 'weapon' && it.masteryProperty,
  );
  let eligible: Item[];
  switch (classId) {
    case 'barbarian':
    case 'fighter':
    case 'paladin':
    case 'ranger':
      eligible = [...withMastery];
      break;
    case 'rogue':
      eligible = withMastery.filter((it) => {
        const props = it.properties ?? [];
        const isSimple =
          props.includes('simple-melee') || props.includes('simple-ranged');
        const isMartial =
          props.includes('martial-melee') || props.includes('martial-ranged');
        if (isSimple) return true;
        if (isMartial && (props.includes('Finesse') || props.includes('Light')))
          return true;
        return false;
      });
      break;
    default:
      eligible = [];
  }
  return eligible.sort((a, b) => {
    const an = a.name[locale] ?? a.name.fr;
    const bn = b.name[locale] ?? b.name.fr;
    return an.localeCompare(bn, locale);
  });
}
