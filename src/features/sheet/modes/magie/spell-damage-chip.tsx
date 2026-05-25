import { localize } from '@/shared/lib/i18n';
import type { Spell } from '@/shared/types/content';

/**
 * Plan D1 — chip de dégâts pour les listes de sorts (SpellList générique +
 * WizardSpellbookSections mono-class). Extrait en module partagé pour éviter
 * la divergence entre les deux surfaces de rendu.
 *
 * Rend uniquement si le sort a au moins une entrée `damage[]` canonique
 * (les sorts SRD non encore peuplés ne portent rien — pas de chip
 * spéculatif depuis la prose). Affiche la formule + le label FR du type ;
 * couleur cinabre pour distinguer des chips source classe (doré) et
 * ascendance (améthyste).
 *
 * Multi-types (ex. tempete-de-grele = contondants + froid) : le label
 * combine « contondants +1 » pour signaler la présence sans surcharger
 * la liste — détail complet dans la modale via SpellDamageCard.
 */
export function SpellDamageChip({ spell }: { spell: Spell }): JSX.Element | null {
  const first = spell.damage?.[0];
  if (!first) return null;
  const allTypes = (spell.damage ?? []).map((d) => localize(d.typeLabel));
  const typeLabel =
    allTypes.length === 1 ? allTypes[0]! : `${allTypes[0]!} +${allTypes.length - 1}`;
  return (
    <span
      className="rounded-full border border-crimson/40 bg-crimson/10 px-1.5 py-0.5 text-[8px] text-crimson"
      title={`Dégâts : ${first.formula} ${localize(first.typeLabel)}`}
    >
      {first.formula} {typeLabel}
    </span>
  );
}
