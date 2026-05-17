import { useMemo } from 'react';

import { Card, CardHeader } from '@/shared/components/card';
import { useContent } from '@/shared/hooks/use-content';
import { cn } from '@/shared/lib/cn';
import { localize } from '@/shared/lib/i18n';
import { abilityModifier } from '@/shared/lib/rules/abilities';
import { proficiencyBonus } from '@/shared/lib/rules/multiclass';
import type { Character } from '@/shared/types/character';

interface BreathWeaponCardProps {
  character: Character;
  readOnly: boolean;
}

/**
 * Carte du Souffle draconique (plan 13.8 step 29).
 *
 * Affichée uniquement pour les Drakéides. Lit le sous-choix
 * `ancestrySubChoices.dragonAncestry` pour résoudre le type de dégâts
 * et la résistance. Échelle SRD 5.2.1 :
 *   - 1d10 à L1, 2d10 à L5, 3d10 à L11, 4d10 à L17.
 *
 * DC du jet de sauvegarde de Dextérité = 8 + modificateur de Con + PB.
 *
 * Lecture seule pour la V1 — le tap-pour-rouler arrive avec le radial
 * (plan 11) ou un binding direct vers useDice (post-13.8). La carte
 * documente ce qu'on doit annoncer au MJ.
 */
export function BreathWeaponCard({
  character,
  readOnly,
}: BreathWeaponCardProps): JSX.Element | null {
  const { data: ancestries } = useContent('ancestries');

  const dragonOption = useMemo(() => {
    if (character.ancestryId !== 'dragonborn') return null;
    const id = character.ancestrySubChoices.dragonAncestry;
    if (!id) return null;
    const dragon = ancestries.find((a) => a.id === 'dragonborn');
    return dragon?.options.dragonAncestries?.find((o) => o.id === id) ?? null;
  }, [character.ancestryId, character.ancestrySubChoices.dragonAncestry, ancestries]);

  if (!dragonOption) return null;

  const conMod = abilityModifier(character.abilities.con);
  const pb = proficiencyBonus(character.totalLevel);
  const dc = 8 + conMod + pb;

  // Échelle des dés : 1d10 / 2d10 / 3d10 / 4d10 selon le niveau total.
  const lvl = character.totalLevel;
  const diceCount = lvl >= 17 ? 4 : lvl >= 11 ? 3 : lvl >= 5 ? 2 : 1;
  const diceFormula = `${diceCount}d10`;

  const damageLabel = localize(dragonOption.damageTypeLabel);
  const dragonName = localize(dragonOption.name);

  return (
    <Card>
      <CardHeader>
        <h3>Souffle draconique</h3>
      </CardHeader>
      <div
        className={cn(
          'flex flex-col gap-3 rounded-card-sm border border-gold-dim/30 bg-gradient-to-b from-gold-bright/[0.06] to-gold/[0.02] p-4',
          readOnly && 'opacity-60',
        )}
        aria-label={`Souffle draconique du dragon ${dragonName}`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="font-display text-[16px] text-gold-bright">
              Dragon {dragonName}
            </span>
            <span className="font-serif text-[13px] text-text-tertiary">
              Cône de 4,50 m ou Ligne de 9 m × 1,50 m
            </span>
          </div>
          <span
            className="rounded-full border border-gold-dim/40 bg-bg-3/40 px-2.5 py-0.5 font-title text-meta uppercase tracking-[0.16em] text-gold"
            aria-hidden="true"
          >
            {damageLabel}
          </span>
        </div>
        <dl className="grid grid-cols-3 gap-3 font-serif text-[13px]">
          <div className="flex flex-col">
            <dt className="font-title text-[10px] uppercase tracking-[0.18em] text-text-tertiary">
              Dégâts
            </dt>
            <dd className="text-text">{diceFormula}</dd>
          </div>
          <div className="flex flex-col">
            <dt className="font-title text-[10px] uppercase tracking-[0.18em] text-text-tertiary">
              DD Dextérité
            </dt>
            <dd className="text-text">{dc}</dd>
          </div>
          <div className="flex flex-col">
            <dt className="font-title text-[10px] uppercase tracking-[0.18em] text-text-tertiary">
              Résistance
            </dt>
            <dd className="text-text">{damageLabel}</dd>
          </div>
        </dl>
        <p className="font-serif text-[12px] italic text-text-tertiary">
          Action Attaque · usable autant de fois que ton bonus de maîtrise par
          repos long.
        </p>
      </div>
    </Card>
  );
}
