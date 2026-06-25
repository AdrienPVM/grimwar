import type { JSX } from 'react';

import { Card, CardHeader } from '@/shared/components/card';
import { Chip } from '@/shared/components/chip';
import { localize, t } from '@/shared/lib/i18n';

import type { ResolvedInventoryRow } from './use-inventory-derived';

/** Cap d'harmonisation 5e (SRD 5.2.1) — 3 objets liés simultanément. */
const ATTUNEMENT_CAP = 3;

interface AttunementSummaryProps {
  resolvedItems: readonly ResolvedInventoryRow[];
  attunedCount: number;
}

/**
 * Carte « Harmonisation » du mode Avoir.
 *
 * Surface en un coup d'œil le nombre d'objets harmonisés sur le cap de 3 (SRD
 * 5.2.1) + la liste des objets liés. Lecture seule — la bascule réelle vit dans
 * `ItemDetailModal` (qui applique aussi le cap au moment du toggle). Cette carte
 * est purement informative : elle évite d'ouvrir chaque objet pour savoir où on
 * en est, et signale visuellement la limite atteinte.
 *
 * Disparaît (null) si le personnage n'a aucun objet harmonisé — pas de carte
 * vide qui encombre l'inventaire d'un personnage sans objet magique.
 */
export function AttunementSummary({
  resolvedItems,
  attunedCount,
}: AttunementSummaryProps): JSX.Element | null {
  if (attunedCount === 0) return null;

  const attunedItems = resolvedItems.filter((row) => row.inventory.attuned);
  const atCap = attunedCount >= ATTUNEMENT_CAP;

  return (
    <Card>
      <CardHeader>
        <h3>{t('sheet.avoir.attunement.title')}</h3>
      </CardHeader>
      <div className="flex items-center justify-between gap-3">
        <Chip variant={atCap ? 'gold' : 'magic'}>
          {t('sheet.avoir.attunement.count')
            .replace('{count}', String(attunedCount))
            .replace('{cap}', String(ATTUNEMENT_CAP))}
        </Chip>
        {atCap && (
          <span className="font-title text-[10px] font-bold uppercase tracking-[0.16em] text-gold-bright">
            {t('sheet.avoir.attunement.atCap')}
          </span>
        )}
      </div>
      <ul className="mt-3 flex flex-wrap gap-2">
        {attunedItems.map((row, i) => (
          <li key={`${row.inventory.contentId}-${i}`}>
            <Chip variant="default">
              {row.content ? localize(row.content.name) : row.inventory.contentId}
            </Chip>
          </li>
        ))}
      </ul>
    </Card>
  );
}
