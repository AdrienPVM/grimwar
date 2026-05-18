import { useEffect, type JSX } from 'react';

import { invalidatePublicContent } from '@/shared/lib/content-loader';
import { t } from '@/shared/lib/i18n';

/**
 * Bannière "données manquantes" — durcissement A généralisé (plan 13.8 UAT
 * 2026-05-17).
 *
 * Affichée à la place d'un `return null` silencieux quand un chooser de
 * sous-choix se retrouve avec 0 option alors qu'il en attendait. C'est le
 * filet de sécurité visible quand le schéma strict + freshness mechanism
 * n'ont pas suffi (cache piégé dans un onglet alterné, profil navigateur
 * autre, hoquet réseau).
 *
 * Comportement :
 *  1. Render `role="alert"` rouge visible avec instruction de reload.
 *  2. Invalide le cache `ancestries` en arrière-plan (`invalidatePublicContent`)
 *     pour qu'un simple F5 résolve sans wipe manuel.
 *  3. Pose `data-chooser-empty` pour assertion test sans dépendre du texte FR/EN.
 *
 * À réutiliser tel quel en plan 13.9 pour les sous-choix de classe.
 */
interface Props {
  /** Identifiant test/log, ex. `dragon-ancestry`, `goliath-ancestry`. */
  readonly chooserKey: string;
}

export function ChooserMissingDataBanner({ chooserKey }: Props): JSX.Element {
  useEffect(() => {
    // Best-effort, fire-and-forget : on invalide le cache local pour que le
    // prochain reload reparse depuis le bundle disque (sain).
    void invalidatePublicContent('ancestries').catch(() => {
      // Silencieux : la bannière reste le signal utilisateur ; un échec
      // d'invalidation Dexie n'est pas bloquant pour l'UX courante.
    });
  }, []);

  return (
    <div
      role="alert"
      data-chooser-empty={chooserKey}
      className="rounded-md border border-crimson/40 bg-crimson/10 p-4 font-serif text-[14px] text-crimson transition-opacity duration-200 ease-base"
    >
      <p className="mb-1 font-title">⚠ {t('wizard.subchoice.missingData.title')}</p>
      <p>{t('wizard.subchoice.missingData.body')}</p>
    </div>
  );
}
