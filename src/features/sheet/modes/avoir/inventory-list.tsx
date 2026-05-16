import { useMemo, useState } from 'react';

import { Card, CardAction, CardHeader } from '@/shared/components/card';
import { Chip } from '@/shared/components/chip';
import { cn } from '@/shared/lib/cn';
import { localize, t } from '@/shared/lib/i18n';
import type { Item, MagicItem, ItemCategory } from '@/shared/types/content';

import type { ResolvedInventoryRow } from './use-inventory-derived';

interface InventoryListProps {
  resolvedItems: readonly ResolvedInventoryRow[];
  onItemSelect: (row: ResolvedInventoryRow) => void;
  onAddItemClick: () => void;
  readOnly: boolean;
}

/**
 * Liste d'inventaire groupée par catégorie. La recherche FR-insensible aux
 * accents filtre par nom et par catégorie. Tap row → ouvre la modale détail.
 * Header bouton `+ Objet` ouvre l'AddItemModal.
 *
 * Groupage : weapon → armor+shield → tool → pack → gear → magic-items → misc.
 * Cet ordre suit le prototype qui ne groupe pas explicitement mais montre les
 * armes en premier. Ce groupage rend la liste exploitable même sur un perso
 * avec 30+ items sans avoir besoin de scroller pour trouver une potion.
 *
 * Items non résolus (content === null) apparaissent dans un groupe « Inconnus »
 * avec leur contentId — debug-friendly pour repérer un mismatch DB.
 */
export function InventoryList({
  resolvedItems,
  onItemSelect,
  onAddItemClick,
  readOnly,
}: InventoryListProps): JSX.Element {
  const [query, setQuery] = useState<string>('');
  const normalizedQuery = normalize(query);

  const filteredItems = useMemo(() => {
    if (!normalizedQuery) return resolvedItems;
    return resolvedItems.filter((row) => {
      if (!row.content) return row.inventory.contentId.includes(normalizedQuery);
      const name = normalize(localize(row.content.name));
      return name.includes(normalizedQuery);
    });
  }, [resolvedItems, normalizedQuery]);

  const groups = useMemo(() => groupItems(filteredItems), [filteredItems]);

  return (
    <Card>
      <CardHeader>
        <h3>Inventaire</h3>
        <CardAction onClick={onAddItemClick} disabled={readOnly}>
          + Objet
        </CardAction>
      </CardHeader>
      <label className="mb-4 flex items-center gap-2 rounded-card-sm border border-white-8 bg-ink/40 px-3 py-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher…"
          className="w-full bg-transparent font-serif text-body text-text placeholder:text-text-tertiary focus:outline-none"
        />
      </label>

      {resolvedItems.length === 0 ? (
        <p className="rounded-card-sm border border-soft bg-ink/30 px-6 py-8 text-center font-serif italic text-text-tertiary">
          Inventaire vide. Touche « + Objet » pour ajouter un premier objet.
        </p>
      ) : groups.length === 0 ? (
        <p className="rounded-card-sm border border-soft bg-ink/30 px-6 py-8 text-center font-serif italic text-text-tertiary">
          Aucun objet ne correspond à « {query} ».
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((group) => (
            <GroupBlock
              key={group.key}
              label={group.label}
              rows={group.rows}
              onItemSelect={onItemSelect}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

interface GroupBlockProps {
  label: string;
  rows: readonly ResolvedInventoryRow[];
  onItemSelect: (row: ResolvedInventoryRow) => void;
}

function GroupBlock({ label, rows, onItemSelect }: GroupBlockProps): JSX.Element {
  return (
    <div>
      <p className="mb-2 font-title text-[9px] font-bold uppercase tracking-[0.24em] text-text-tertiary">
        {label}
      </p>
      <ul className="flex flex-col gap-1.5">
        {rows.map((row) => (
          <ItemRow key={row.inventory.contentId + ':' + row.inventory.contentScope} row={row} onSelect={onItemSelect} />
        ))}
      </ul>
    </div>
  );
}

interface ItemRowProps {
  row: ResolvedInventoryRow;
  onSelect: (row: ResolvedInventoryRow) => void;
}

function ItemRow({ row, onSelect }: ItemRowProps): JSX.Element {
  const { inventory, content, isMagic } = row;
  const name = content ? localize(content.name) : `(introuvable) ${inventory.contentId}`;
  const meta = content ? buildMetaLine(content, isMagic) : 'Item non résolu — vérifier la DB';
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(row)}
        className={cn(
          'flex w-full items-center justify-between gap-3 rounded-card-sm border border-white-8 bg-ink/30 px-4 py-3 text-left transition-all',
          'hover:border-gold-dim hover:bg-ink/50',
        )}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-serif text-body text-text">{name}</span>
            {inventory.equipped && <Chip variant="gold">Équipé</Chip>}
            {inventory.attuned && <Chip variant="magic">Lié</Chip>}
          </div>
          <p className="mt-0.5 font-title text-[9px] font-bold uppercase tracking-[0.16em] text-text-tertiary">
            {meta}
          </p>
        </div>
        {inventory.qty > 1 && (
          <span className="shrink-0 font-display text-[22px] font-bold tracking-[-0.02em] text-gold-bright">
            ×{inventory.qty}
          </span>
        )}
      </button>
    </li>
  );
}

function buildMetaLine(content: Item | MagicItem, isMagic: boolean): string {
  if (isMagic) {
    const mi = content as MagicItem;
    return `${t(`rarity.${mi.rarity}`)} · ${t(`item.category.${mi.category}`)}`;
  }
  const it = content as Item;
  const parts: string[] = [];
  if (it.weight > 0) parts.push(`${formatWeight(it.weight)} kg`);
  if (it.damage) parts.push(`${it.damage.dice} ${localize(it.damage.typeLabel)}`);
  else if (it.acBase !== undefined) parts.push(`AC ${it.acBase}${it.acDexMax !== undefined && it.acDexMax !== null ? ` + DEX max ${it.acDexMax}` : ''}`);
  else parts.push(t(`item.category.${it.category}`));
  return parts.join(' · ');
}

function formatWeight(kg: number): string {
  if (Number.isInteger(kg)) return kg.toString();
  return kg.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
}

interface CategoryGroup {
  key: string;
  label: string;
  /** Ordre d'affichage du groupe dans la liste. */
  order: number;
  rows: ResolvedInventoryRow[];
}

const GROUP_ORDER: ReadonlyMap<string, { label: string; order: number }> = new Map([
  ['weapon', { label: 'Armes', order: 1 }],
  ['armor', { label: 'Armures & boucliers', order: 2 }],
  ['tool', { label: 'Outils', order: 3 }],
  ['pack', { label: 'Sacs & kits', order: 4 }],
  ['gear', { label: 'Équipement', order: 5 }],
  ['magic', { label: 'Objets magiques', order: 6 }],
  ['misc', { label: 'Divers', order: 7 }],
  ['unknown', { label: 'Inconnus', order: 8 }],
]);

function groupKeyFor(row: ResolvedInventoryRow): string {
  if (row.content === null) return 'unknown';
  if (row.isMagic) return 'magic';
  const cat = row.content.category as ItemCategory;
  if (cat === 'weapon') return 'weapon';
  if (cat === 'armor' || cat === 'shield') return 'armor';
  if (cat === 'tool') return 'tool';
  if (cat === 'pack') return 'pack';
  if (cat === 'gear') return 'gear';
  return 'misc';
}

function groupItems(rows: readonly ResolvedInventoryRow[]): readonly CategoryGroup[] {
  const buckets = new Map<string, ResolvedInventoryRow[]>();
  for (const row of rows) {
    const key = groupKeyFor(row);
    const bucket = buckets.get(key);
    if (bucket) bucket.push(row);
    else buckets.set(key, [row]);
  }
  return Array.from(buckets.entries())
    .map(([key, rowList]) => {
      const meta = GROUP_ORDER.get(key)!;
      return { key, label: meta.label, order: meta.order, rows: rowList };
    })
    .sort((a, b) => a.order - b.order);
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}
