import { useMemo } from 'react';

import { Card, CardHeader } from '@/shared/components/card';
import { useContent } from '@/shared/hooks/use-content';
import { cn } from '@/shared/lib/cn';
import { localize } from '@/shared/lib/i18n';
import { proficiencyBonus } from '@/shared/lib/rules/multiclass';
import type { Character } from '@/shared/types/character';

interface GiantAncestryCardProps {
  character: Character;
  readOnly: boolean;
}

/**
 * Carte d'ascendance gigante du Goliath (plan 13.8 step 32).
 *
 * Affichée uniquement pour les Goliath. Lit
 * `ancestrySubChoices.goliathAncestry` pour résoudre l'effet déclenchable.
 * Cadence d'utilisation SRD 5.2.1 : autant de fois que le bonus de maîtrise
 * par repos long.
 *
 * V1 = lecture seule. Le compteur d'utilisations consommables sera ajouté
 * avec `featureUsage` côté Firestore dans un plan ultérieur (radial menu
 * ou bouton dédié). Pour la création de personnage, ce qui compte c'est
 * que le trait soit VISIBLE et que le joueur sache qu'il existe.
 */
export function GiantAncestryCard({
  character,
  readOnly,
}: GiantAncestryCardProps): JSX.Element | null {
  const { data: ancestries } = useContent('ancestries');

  const giantOption = useMemo(() => {
    if (character.ancestryId !== 'goliath') return null;
    const id = character.ancestrySubChoices.goliathAncestry;
    if (!id) return null;
    const goliath = ancestries.find((a) => a.id === 'goliath');
    return goliath?.options.giantAncestries?.find((o) => o.id === id) ?? null;
  }, [character.ancestryId, character.ancestrySubChoices.goliathAncestry, ancestries]);

  if (!giantOption) return null;

  const usesPerLongRest = proficiencyBonus(character.totalLevel);
  const giantName = localize(giantOption.name);
  const effect = localize(giantOption.effect);

  return (
    <Card>
      <CardHeader>
        <h3>Ascendance gigante</h3>
      </CardHeader>
      <div
        className={cn(
          'flex flex-col gap-2 rounded-card-sm border border-gold-dim/30 bg-gradient-to-b from-gold-bright/[0.06] to-gold/[0.02] p-4',
          readOnly && 'opacity-60',
        )}
        aria-label={`Trait Ascendance gigante : ${giantName}`}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="font-display text-[16px] text-gold-bright">{giantName}</span>
          <span
            className="rounded-full border border-gold-dim/40 bg-bg-3/40 px-2.5 py-0.5 font-title text-meta uppercase tracking-[0.16em] text-gold"
            aria-hidden="true"
          >
            {usesPerLongRest}× / RL
          </span>
        </div>
        <p className="font-serif text-[13px] text-text">{effect}</p>
      </div>
    </Card>
  );
}
