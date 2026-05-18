import type { JSX } from 'react';

import { cn } from '@/shared/lib/cn';
import { t, type StringKey } from '@/shared/lib/i18n';

/**
 * Hint neutre rendu à la place d'un chooser dont le pool est **calculé** à
 * partir d'étapes pas encore remplies (plan 13.9 UAT 2026-05-18 — fix Roublard).
 *
 * Distinct de `ChooserMissingDataBanner` qui est réservée à un VRAI bug de
 * données (bundle disque vide / parse cassé). Là, rien n'est cassé : on attend
 * juste que l'utilisateur fasse les étapes précédentes. Une bannière rouge "panne"
 * mentirait — c'est exactement le bug qui a fait perdre du temps au Roublard.
 *
 * UI sobre, non alarmant : pas de rouge, pas de "recharge la page". Juste un
 * encart serif italique avec un texte explicatif courte.
 *
 * Pose `data-chooser-pending` pour assertion test sans coupler au texte FR/EN.
 */
interface Props {
  /** Identifiant test/log, ex. `rogue-expertise-at-class`. */
  readonly chooserKey: string;
  /** Clé i18n du message à rendre. */
  readonly messageKey: StringKey;
  readonly className?: string;
}

export function ChooserDependencyHint({
  chooserKey,
  messageKey,
  className,
}: Props): JSX.Element {
  return (
    <div
      role="status"
      data-chooser-pending={chooserKey}
      className={cn(
        'rounded-card-sm border border-soft bg-bg-3/30 p-3 font-serif text-[13px] italic text-text-tertiary',
        'transition-opacity duration-200 ease-base',
        className,
      )}
    >
      {t(messageKey)}
    </div>
  );
}
