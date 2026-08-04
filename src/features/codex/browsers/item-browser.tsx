import { useMemo, useState, type JSX } from 'react';
import { useId } from 'react';

import { Chip } from '@/shared/components/chip';
import { DetailModal } from '@/shared/components/detail-modal';
import { useContent } from '@/shared/hooks/use-content';
import { localize, t } from '@/shared/lib/i18n';
import type { Item, ItemCategory } from '@/shared/types/content';

import {
  CodexEmpty,
  CodexLoading,
  CodexResultCount,
  CodexRow,
  CodexSearchField,
} from '../codex-ui';
import {
  ItemCodexDetail,
  formatItemAc,
  formatItemDamage,
} from './item-codex-detail';

type CategoryFilter = ItemCategory | 'all';

/** Ordre d'affichage des catégories d'équipement. */
const CATEGORY_ORDER: readonly ItemCategory[] = [
  'weapon',
  'armor',
  'shield',
  'gear',
  'tool',
  'pack',
  'mount',
  'vehicle',
];

/**
 * Navigateur d'équipement du Codex (plan 19). Recherche par nom + filtre par
 * catégorie ; modale = grille de méta (poids, coût, dégâts, CA) + propriétés +
 * description. Tout dérivé de `items.json` (DB stricte d'objets).
 */
export function ItemBrowser(): JSX.Element {
  const { data: items, loading } = useContent('items');
  const [query, setQuery] = useState<string>('');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [active, setActive] = useState<Item | null>(null);
  const titleId = useId();

  const presentCategories = useMemo(() => {
    const set = new Set<ItemCategory>();
    for (const item of items) set.add(item.category);
    return CATEGORY_ORDER.filter((c) => set.has(c));
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('fr');
    return items
      .filter((item) => {
        if (category !== 'all' && item.category !== category) return false;
        if (q && !localize(item.name).toLocaleLowerCase('fr').includes(q))
          return false;
        return true;
      })
      .sort((a, b) => localize(a.name).localeCompare(localize(b.name), 'fr'));
  }, [items, query, category]);

  if (loading) return <CodexLoading />;

  return (
    <div className="flex flex-col gap-3">
      <CodexSearchField
        value={query}
        onChange={setQuery}
        placeholder={t('codex.search.items')}
      />

      <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
        <Chip active={category === 'all'} onToggle={() => setCategory('all')}>
          {t('codex.item.allCategories')}
        </Chip>
        {presentCategories.map((c) => (
          <Chip
            key={c}
            active={category === c}
            onToggle={() => setCategory(c)}
            className="whitespace-nowrap"
          >
            {t(`item.category.${c}`)}
          </Chip>
        ))}
      </div>

      <CodexResultCount count={filtered.length} />

      {filtered.length === 0 ? (
        <CodexEmpty />
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((item) => (
            <li key={item.id}>
              <CodexRow
                title={localize(item.name)}
                onClick={() => setActive(item)}
                meta={
                  <>
                    <span>{t(`item.category.${item.category}`)}</span>
                    {formatItemDamage(item) ? (
                      <span className="text-crimson">
                        {formatItemDamage(item)}
                      </span>
                    ) : null}
                    {formatItemAc(item) ? (
                      <span className="text-teal">
                        {t('codex.item.ac')} {formatItemAc(item)}
                      </span>
                    ) : null}
                  </>
                }
              />
            </li>
          ))}
        </ul>
      )}

      <DetailModal
        open={active !== null}
        onClose={() => setActive(null)}
        titleId={titleId}
        size="lg"
      >
        {active ? <ItemCodexDetail item={active} titleId={titleId} /> : null}
      </DetailModal>
    </div>
  );
}
