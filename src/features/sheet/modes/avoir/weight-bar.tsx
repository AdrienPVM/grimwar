import { Card, CardHeader } from '@/shared/components/card';
import { cn } from '@/shared/lib/cn';
import { t, type StringKey } from '@/shared/lib/i18n';

import type { EncumbranceLevel } from './use-inventory-derived';

interface WeightBarProps {
  weightTotal: number;
  carryingCapacity: number;
  level: EncumbranceLevel;
}

const LEVEL_LABEL_KEY: Record<EncumbranceLevel, StringKey> = {
  normal: 'sheet.avoir.weight.normal',
  encumbered: 'sheet.avoir.weight.encumbered',
  'heavily-encumbered': 'sheet.avoir.weight.heavilyEncumbered',
};

// Rampe sémantique 100% tokens (l'ambre Tailwind par défaut jurait avec l'or
// chaud du manuscrit) : or sobre (charge normale) → or vif d'alerte (encombré)
// → crimson de danger (fortement encombré). Escalade de luminosité = escalade
// de gravité.
const LEVEL_BAR_CLASS: Record<EncumbranceLevel, string> = {
  normal: 'bg-gradient-to-r from-gold to-gold-deep',
  encumbered: 'bg-gradient-to-r from-gold-bright to-gold-lite',
  'heavily-encumbered': 'bg-gradient-to-r from-crimson to-crimson/70',
};

const LEVEL_LABEL_CLASS: Record<EncumbranceLevel, string> = {
  normal: 'text-text-tertiary',
  encumbered: 'text-gold-text',
  'heavily-encumbered': 'text-crimson',
};

/**
 * Barre de poids transporté. Affiche `cur / max kg` + barre de remplissage
 * teintée selon le niveau d'encombrement (gold normal, amber encombré, crimson
 * lourd). La barre clamp à 100% visuellement même quand le perso dépasse la
 * capacité — l'info est dans le label.
 *
 * Plan 10 step 3 : variant `grittyRealism` non couvert en S1 (settings vivent
 * sur la campagne en S2). En attendant on applique le calcul standard SRD.
 */
export function WeightBar({
  weightTotal,
  carryingCapacity,
  level,
}: WeightBarProps): JSX.Element {
  const fillPercent =
    carryingCapacity > 0
      ? Math.min(100, Math.round((weightTotal / carryingCapacity) * 100))
      : 0;

  return (
    // Même gabarit que la bourse (`Card` + `CardHeader` orné) : les deux cartes
    // se font face dans la première rangée du mode Avoir, et l'ancienne boîte
    // brute — padding plus serré, titre gris sans fleuron — cassait la
    // symétrie de la paire.
    <Card>
      <CardHeader>
        <h3>{t('sheet.avoir.weight.title')}</h3>
      </CardHeader>
      <p className="mb-3 text-right font-display text-[22px] font-bold">
        <span className="tracking-[-0.02em] text-gold-bright">{formatWeight(weightTotal)}</span>{' '}
        <span className="font-serif font-normal italic text-text-tertiary">
          / {formatWeight(carryingCapacity)} kg
        </span>
      </p>
      <div className="relative h-2 overflow-hidden rounded-full bg-white-8">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300 ease-base',
            LEVEL_BAR_CLASS[level],
          )}
          style={{ width: `${fillPercent}%` }}
        />
      </div>
      <p
        className={cn(
          'mt-2 text-right font-title text-[9px] font-bold uppercase tracking-[0.2em]',
          LEVEL_LABEL_CLASS[level],
        )}
      >
        {t(LEVEL_LABEL_KEY[level])}
      </p>
    </Card>
  );
}

function formatWeight(kg: number): string {
  if (Number.isInteger(kg)) return kg.toString();
  return kg.toLocaleString('fr-FR', { maximumFractionDigits: 1 });
}
