import { t } from '@/shared/lib/i18n';

import type { DuplicateMode } from './catalogue-picker-modal';

/**
 * Forme minimale commune aux 11 drafts de formulaire : tous portent `id`,
 * `nameFr` et `nameEn` à leur racine. C'est ce qui permet de traiter la
 * duplication une fois pour toutes plutôt qu'onze.
 */
export interface NamedDraft {
  id: string;
  nameFr: string;
  nameEn: string;
}

/** Suffixe d'identifiant d'une copie. Volontairement lisible, pas un hash. */
const COPY_ID_SUFFIX = '-maison';

/**
 * Prépare le draft issu d'une duplication (M50).
 *
 * En mode `replace`, on ne touche à rien : garder l'identifiant du catalogue
 * EST le geste — le merger `user > public` fera l'écrasement.
 *
 * En mode `copy`, on décale l'identifiant et le nom pour que les deux entrées
 * cohabitent. Les valeurs restent éditables : ce sont des propositions, pas
 * des verrous.
 */
export function prepareDuplicateDraft<D extends NamedDraft>(
  draft: D,
  mode: DuplicateMode,
): D {
  if (mode === 'replace') return draft;
  const suffix = t('customContent.duplicate.copySuffixName');
  return {
    ...draft,
    id: `${draft.id}${COPY_ID_SUFFIX}`,
    nameFr: `${draft.nameFr}${suffix}`,
    nameEn: draft.nameEn ? `${draft.nameEn}${suffix}` : '',
  };
}
