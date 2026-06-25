import { useId, type JSX } from 'react';

import { CodexModalShell } from '@/features/codex/codex-ui';
import { Button } from '@/shared/components/button';
import { DetailModal } from '@/shared/components/detail-modal';
import { useContent } from '@/shared/hooks/use-content';
import { localize, t } from '@/shared/lib/i18n';

interface ConditionDetailModalProps {
  /** Slug de l'état à détailler, ou `null` pour fermer la modale. */
  conditionId: string | null;
  /**
   * Callback de retrait de l'état. `null` ⇒ la fiche est en lecture seule
   * (perso mort, vue MJ cross-owner sans droit d'écriture…) : on affiche quand
   * même la règle SRD, mais sans bouton « Retirer ».
   */
  onRemove: (() => void) | null;
  onClose: () => void;
}

/**
 * Modale de détail d'un état (mode Combat). Affiche la règle SRD complète de
 * l'état actif tapé — au lieu de l'ancien comportement « tap = retrait immédiat »
 * (source d'erreurs au pouce + aucune lecture possible de l'effet). Réutilise la
 * coquille `CodexModalShell` pour une identité visuelle 1:1 avec le Codex (même
 * eyebrow doré, même titre, même corps `whitespace-pre-line`).
 *
 * La règle est dérivée du bundle SRD `conditions.json` (`description.fr`) — zéro
 * texte en dur.
 */
export function ConditionDetailModal({
  conditionId,
  onRemove,
  onClose,
}: ConditionDetailModalProps): JSX.Element {
  const { data: conditions } = useContent('conditions');
  const titleId = useId();
  const condition = conditionId
    ? (conditions.find((c) => c.id === conditionId) ?? null)
    : null;

  return (
    <DetailModal open={condition !== null} onClose={onClose} titleId={titleId} size="lg">
      {condition ? (
        <CodexModalShell
          titleId={titleId}
          title={localize(condition.name)}
          eyebrow={t('codex.cat.conditions')}
        >
          <p className="whitespace-pre-line">{localize(condition.description)}</p>
          {onRemove ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={onRemove}
              className="self-start"
            >
              Retirer cet état
            </Button>
          ) : null}
        </CodexModalShell>
      ) : null}
    </DetailModal>
  );
}
