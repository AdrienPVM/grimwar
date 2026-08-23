import type { JSX } from 'react';

import { Chip } from '@/shared/components/chip';
import { localize, t } from '@/shared/lib/i18n';
import type { Item } from '@/shared/types/content';

import { CodexField, CodexModalShell } from '../codex-ui';

/**
 * Corps de la modale détail d'un équipement. Extrait de `item-browser.tsx` pour
 * que la recherche transverse ouvre EXACTEMENT la même fiche que l'onglet
 * Équipement — un objet trouvé par la recherche globale ne doit pas offrir une
 * lecture appauvrie de celui trouvé dans son onglet.
 *
 * Le `<DetailModal>` (portal, fermeture, piège de focus) reste à l'appelant.
 */

export function formatItemCost(item: Item): string | null {
  if (!item.cost) return null;
  return `${item.cost.qty} ${item.cost.unit}`;
}

export function formatItemAc(item: Item): string | null {
  if (item.acBase === undefined) return null;
  if (item.acDexMax !== undefined && item.acDexMax !== null) {
    return `${item.acBase} + DEX (max ${item.acDexMax})`;
  }
  return `${item.acBase}`;
}

export function formatItemDamage(item: Item): string | null {
  if (!item.damage) return null;
  return `${item.damage.dice} ${localize(item.damage.typeLabel)}`;
}

export function ItemCodexDetail({
  item,
  titleId,
}: {
  item: Item;
  titleId: string;
}): JSX.Element {
  return (
    <CodexModalShell
      titleId={titleId}
      title={localize(item.name)}
      eyebrow={t(`item.category.${item.category}`)}
    >
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        {item.weight > 0 ? (
          <CodexField label={t('codex.item.weight')}>{item.weight} kg</CodexField>
        ) : null}
        {formatItemCost(item) ? (
          <CodexField label={t('codex.item.cost')}>
            {formatItemCost(item)}
          </CodexField>
        ) : null}
        {formatItemDamage(item) ? (
          <CodexField label={t('codex.item.damage')}>
            {formatItemDamage(item)}
          </CodexField>
        ) : null}
        {formatItemAc(item) ? (
          <CodexField label={t('codex.item.ac')}>{formatItemAc(item)}</CodexField>
        ) : null}
      </div>

      {item.properties && item.properties.length > 0 ? (
        <CodexField label={t('codex.item.properties')}>
          <div className="flex flex-wrap gap-1.5">
            {item.properties.map((prop) => (
              <Chip key={prop} variant="default">
                {prop}
              </Chip>
            ))}
          </div>
        </CodexField>
      ) : null}

      {item.description ? (
        <p className="whitespace-pre-line">{localize(item.description)}</p>
      ) : null}
    </CodexModalShell>
  );
}
