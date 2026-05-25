import { localize, t } from '@/shared/lib/i18n';
import { resolveSpellDamage } from '@/shared/lib/rules/spell-damage';
import type { Spell, SpellDamage } from '@/shared/types/content';

interface SpellDamageCardProps {
  spell: Spell;
  /** Niveau d'emplacement actuellement sélectionné dans la modale (sort L1+). */
  chosenSlotLevel: number;
  /** Niveau total de personnage — utilisé pour le scaling cantrip. */
  casterLevel: number;
}

/**
 * Plan D1 — section structurée « Dégâts » de la modale détail d'un sort.
 *
 * Rendue uniquement si `spell.damage[]` est non vide (les sorts non couverts
 * par la curation SRD ne voient PAS cette section — la prose reste source
 * de vérité dans ce cas). Pour chaque entrée :
 *
 *  - Formule résolue contre `chosenSlotLevel` (sort L1+) ou `casterLevel`
 *    (cantrip), via `resolveSpellDamage`.
 *  - Type + label localisé.
 *  - Mode de résolution (« jet d'attaque » / « jet de sauvegarde » / « auto »).
 *  - Condition descriptive du SRD (Magic Missile, Eldritch Blast multi-rayons, etc.).
 *
 * Pour les sorts avec scaling upcast actif, on affiche aussi la formule de
 * base et la progression — utile pour le joueur qui veut comprendre le
 * coût/bénéfice de monter d'un niveau.
 */
export function SpellDamageCard({
  spell,
  chosenSlotLevel,
  casterLevel,
}: SpellDamageCardProps): JSX.Element | null {
  const damage = spell.damage;
  if (!damage || damage.length === 0) return null;

  return (
    <div
      className="mt-4 rounded-card-sm border border-crimson/30 bg-crimson/[0.06] px-4 py-3"
      data-testid="spell-damage-card"
    >
      <p className="mb-2 font-title text-[10px] font-bold uppercase tracking-[0.2em] text-crimson">
        Dégâts
      </p>
      <ul className="flex flex-col gap-2">
        {damage.map((entry, i) => (
          <DamageRow
            key={`${entry.type}-${i}`}
            entry={entry}
            spell={spell}
            chosenSlotLevel={chosenSlotLevel}
            casterLevel={casterLevel}
          />
        ))}
      </ul>
    </div>
  );
}

function DamageRow({
  entry,
  spell,
  chosenSlotLevel,
  casterLevel,
}: {
  entry: SpellDamage;
  spell: Spell;
  chosenSlotLevel: number;
  casterLevel: number;
}): JSX.Element {
  const resolved = resolveSpellDamage(entry, spell, {
    slotLevel: chosenSlotLevel,
    casterLevel,
  });
  const typeLabel = localize(entry.typeLabel);
  const baseFormula = entry.formula;
  const showUpcastPreview =
    spell.level > 0 && resolved.formula !== baseFormula;
  const showCantripPreview =
    spell.level === 0 && resolved.formula !== baseFormula;
  return (
    <li className="font-serif text-body-sm text-text-secondary">
      <div className="flex flex-wrap items-baseline gap-2">
        <span
          className="font-display text-[16px] font-bold text-crimson"
          data-testid="spell-damage-formula"
        >
          {resolved.formula}
        </span>
        <span className="font-ui text-[10px] uppercase tracking-[0.16em] text-text-tertiary">
          {typeLabel}
        </span>
        {resolved.resolution ? (
          <span className="rounded-full border border-white-8 bg-white/[0.04] px-1.5 py-0.5 font-ui text-[9px] uppercase tracking-[0.16em] text-text-tertiary">
            {t(`spell.damage.resolution.${resolved.resolution}`)}
          </span>
        ) : null}
      </div>
      {showUpcastPreview ? (
        <p className="mt-1 text-[11px] italic text-text-tertiary">
          Base au niveau {spell.level} : {baseFormula} (
          {entry.atHigherLevels?.perLevel ?? '—'} par niveau supérieur)
        </p>
      ) : null}
      {showCantripPreview && entry.cantripScaling ? (
        <p className="mt-1 text-[11px] italic text-text-tertiary">
          Progression cantrip : {baseFormula} → {entry.cantripScaling.tier5} (L5) →{' '}
          {entry.cantripScaling.tier11} (L11) → {entry.cantripScaling.tier17} (L17)
        </p>
      ) : null}
      {entry.condition ? (
        <p className="mt-1 whitespace-pre-line text-[12px] text-text-tertiary">
          {localize(entry.condition)}
        </p>
      ) : null}
    </li>
  );
}
