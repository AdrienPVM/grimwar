import { useEffect, type JSX } from 'react';

import { invalidatePublicContent } from '@/shared/lib/content-loader';
import { t } from '@/shared/lib/i18n';
import type { ContentTypeKey } from '@/shared/types/content';

/**
 * Bannière "données manquantes" — durcissement A généralisé (plan 13.8 UAT
 * 2026-05-17, étendu plan 13.9 step 56).
 *
 * Affichée à la place d'un `return null` silencieux quand un chooser de
 * sous-choix se retrouve avec 0 option alors qu'il en attendait. C'est le
 * filet de sécurité visible quand le schéma strict + freshness mechanism
 * n'ont pas suffi (cache piégé dans un onglet alterné, profil navigateur
 * autre, hoquet réseau).
 *
 * Comportement :
 *  1. Render `role="alert"` rouge visible avec instruction de reload.
 *  2. Invalide le cache Dexie pour le `contentType` concerné en arrière-plan
 *     (`invalidatePublicContent`) — un simple F5 résout sans wipe manuel.
 *  3. Pose `data-chooser-empty` pour assertion test sans dépendre du texte FR/EN.
 *
 * Réutilisé en 13.9 pour les sous-choix de classe — le `contentType` doit
 * matcher la source du chooser (`classes`, `feats`, `invocations`, `items`,
 * `spells`, `ancestries`...).
 */
interface Props {
  /** Identifiant test/log, ex. `dragon-ancestry`, `fighter-fighting-style`. */
  readonly chooserKey: string;
  /**
   * Bundle Dexie à invalider en arrière-plan. Doit correspondre au contenu
   * que le chooser consomme — sinon un cache fautif resterait piégé.
   */
  readonly contentType: ContentTypeKey;
}

export function ChooserMissingDataBanner({
  chooserKey,
  contentType,
}: Props): JSX.Element {
  useEffect(() => {
    // Best-effort, fire-and-forget : on invalide le cache local pour que le
    // prochain reload reparse depuis le bundle disque (sain).
    void invalidatePublicContent(contentType).catch(() => {
      // Silencieux : la bannière reste le signal utilisateur ; un échec
      // d'invalidation Dexie n'est pas bloquant pour l'UX courante.
    });
  }, [contentType]);

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
