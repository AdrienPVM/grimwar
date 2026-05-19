import { localize } from '@/shared/lib/i18n';
import type { Character } from '@/shared/types/character';
import type { Ancestry } from '@/shared/types/content';

/**
 * Calcule le label de source à afficher pour un sort d'ascendance — partagé
 * entre `AncestrySpellsCard` (titre par entrée) et `SpellList` (chip de
 * source dans la liste générale du mode Magie).
 *
 * Renvoie `null` si l'ascendance n'a aucun sous-choix qui produit des sorts
 * (Drakéide, Nain, Halfling, etc.) — l'appelant peut alors décider de ne pas
 * afficher de chip.
 *
 * Exemples : « Lignage Drow », « Héritage Infernal », « Lignage Forêts ».
 */
export function computeAncestrySourceLabel(
  character: Character,
  ancestries: readonly Ancestry[],
): string | null {
  const ancestry = ancestries.find((a) => a.id === character.ancestryId);
  if (!ancestry) return null;
  const sc = character.ancestrySubChoices;

  if (ancestry.id === 'tiefling' && sc.tieflingLegacy) {
    const legacy = ancestry.options.tieflingLegacies?.find(
      (o) => o.id === sc.tieflingLegacy,
    );
    if (!legacy) return null;
    return `Héritage ${localize(legacy.name)}`;
  }
  if (ancestry.id === 'elf' && sc.elfLineage) {
    const lineage = ancestry.options.elfLineages?.find((o) => o.id === sc.elfLineage);
    if (!lineage) return null;
    return `Lignage ${localize(lineage.name)}`;
  }
  if (ancestry.id === 'gnome' && sc.gnomeLineage) {
    const lineage = ancestry.options.gnomeLineages?.find(
      (o) => o.id === sc.gnomeLineage,
    );
    if (!lineage) return null;
    return `Lignage ${localize(lineage.name)}`;
  }
  return null;
}
