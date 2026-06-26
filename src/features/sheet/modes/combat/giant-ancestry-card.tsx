import { useMemo, useState } from 'react';

import { Card, CardHeader } from '@/shared/components/card';
import { useContent } from '@/shared/hooks/use-content';
import { cn } from '@/shared/lib/cn';
import { localize } from '@/shared/lib/i18n';
import type { Character } from '@/shared/types/character';

import { useUpdateCharacter } from '../../use-update-character';
import {
  ancestryCombatUsageMax,
  remainingAncestryCombatUses,
  setAncestryCombatUses,
} from './ancestry-combat-usage';
import { UsageCounter } from './usage-counter';

interface GiantAncestryCardProps {
  character: Character;
  readOnly: boolean;
}

/** Identifiant de l'aptitude pour la clé `featureUsage` (une par personnage). */
const GIANT_FEATURE_ID = 'giant-ancestry';

/**
 * Carte d'ascendance gigante du Goliath (plan 13.8 step 32).
 *
 * Affichée uniquement pour les Goliath. Lit
 * `ancestrySubChoices.goliathAncestry` pour résoudre l'effet déclenchable.
 * Cadence d'utilisation SRD 5.2.1 : autant de fois que le bonus de maîtrise
 * par repos long.
 *
 * Le compteur d'utilisations est consommable via `featureUsage` (clé
 * `ancestry-combat:giant-ancestry`) : « − » dépense, « + » récupère, recharge
 * automatique au repos long (`applyLongRest`). Lecture seule (PJ mort / vue MJ)
 * ⇒ pas de boutons, seul `current / max` reste affiché.
 */
export function GiantAncestryCard({
  character,
  readOnly,
}: GiantAncestryCardProps): JSX.Element | null {
  const { data: ancestries } = useContent('ancestries');
  const { updateCharacter, isUpdating } = useUpdateCharacter(character);
  const [busy, setBusy] = useState(false);

  const giantOption = useMemo(() => {
    if (character.ancestryId !== 'goliath') return null;
    const id = character.ancestrySubChoices.goliathAncestry;
    if (!id) return null;
    const goliath = ancestries.find((a) => a.id === 'goliath');
    return goliath?.options.giantAncestries?.find((o) => o.id === id) ?? null;
  }, [character.ancestryId, character.ancestrySubChoices.goliathAncestry, ancestries]);

  if (!giantOption) return null;

  const max = ancestryCombatUsageMax(character.totalLevel);
  const current = remainingAncestryCombatUses(
    character,
    GIANT_FEATURE_ID,
    character.totalLevel,
  );
  const giantName = localize(giantOption.name);
  const effect = localize(giantOption.effect);

  async function setUses(next: number): Promise<void> {
    if (readOnly || isUpdating) return;
    const patch = setAncestryCombatUses(
      character,
      GIANT_FEATURE_ID,
      character.totalLevel,
      next,
    );
    if (!patch) return;
    setBusy(true);
    try {
      await updateCharacter({ featureUsage: patch });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <h3>Ascendance gigante</h3>
      </CardHeader>
      <div
        className={cn(
          'flex flex-col gap-3 rounded-card-sm border border-gold-dim/30 bg-gradient-to-b from-gold-bright/[0.06] to-gold/[0.02] p-4',
          readOnly && 'opacity-60',
        )}
        aria-label={`Trait Ascendance gigante : ${giantName}`}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="font-display text-[16px] text-gold-bright">{giantName}</span>
          <span className="font-title text-[10px] font-bold uppercase tracking-[0.18em] text-text-tertiary">
            Par repos long
          </span>
        </div>
        <p className="font-serif text-[13px] text-text">{effect}</p>
        <div className="flex items-center justify-between gap-3 border-t border-gold-dim/20 pt-3">
          <span className="font-title text-[10px] font-bold uppercase tracking-[0.18em] text-text-tertiary">
            Utilisations
          </span>
          <UsageCounter
            current={current}
            max={max}
            readOnly={readOnly}
            busy={busy}
            spendLabel={`Dépenser une utilisation d'Ascendance gigante (${giantName})`}
            restoreLabel={`Récupérer une utilisation d'Ascendance gigante (${giantName})`}
            onSpend={() => void setUses(current - 1)}
            onRestore={() => void setUses(current + 1)}
          />
        </div>
      </div>
    </Card>
  );
}
