import { useMemo, useState } from 'react';

import { Button } from '@/shared/components/button';
import { useContent } from '@/shared/hooks/use-content';
import { cn } from '@/shared/lib/cn';
import { localize, t } from '@/shared/lib/i18n';
import { addItemToInventory } from '@/shared/lib/inventory';
import { showToast } from '@/shared/lib/slices/toast-slice';
import type { Character } from '@/shared/types/character';
import type { Item, MagicItem } from '@/shared/types/content';

import { useUpdateCharacter } from '../../use-update-character';
import { CustomItemForm } from './custom-item-form';

interface AddItemModalProps {
  character: Character;
  onClose: () => void;
  /** Appelé après la création d'un objet maison pour rafraîchir le hook. */
  onUserItemCreated: () => Promise<void>;
}

type View = 'browse' | 'custom';

/**
 * Modale d'ajout d'objet. Vue par défaut : recherche dans les bundles publics
 * (items + magic-items). Tap un item → input qty inline → confirmer. La
 * création se fait via `addItemToInventory` qui valide STRICT vs items DB.
 *
 * Vue secondaire : « Créer un objet maison » → ouvre `CustomItemForm` qui écrit
 * dans `users/{uid}/customContent/items/{newId}` puis l'ajoute à l'inventaire.
 */
export function AddItemModal({
  character,
  onClose,
  onUserItemCreated,
}: AddItemModalProps): JSX.Element {
  const { updateCharacter } = useUpdateCharacter(character.id);
  const { data: items } = useContent('items');
  const { data: magicItems } = useContent('magic-items');

  const [view, setView] = useState<View>('browse');
  const [query, setQuery] = useState<string>('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIsMagic, setSelectedIsMagic] = useState<boolean>(false);
  const [qty, setQty] = useState<number>(1);
  const [busy, setBusy] = useState<boolean>(false);

  const normalizedQuery = useMemo(() => normalize(query), [query]);

  const filtered = useMemo(() => {
    const combined: { item: Item | MagicItem; isMagic: boolean }[] = [
      ...items.map((i) => ({ item: i as Item | MagicItem, isMagic: false })),
      ...magicItems.map((i) => ({ item: i as Item | MagicItem, isMagic: true })),
    ];
    if (!normalizedQuery) return combined.slice(0, 50);
    return combined
      .filter((entry) => normalize(localize(entry.item.name)).includes(normalizedQuery))
      .slice(0, 50);
  }, [items, magicItems, normalizedQuery]);

  async function confirmAdd(): Promise<void> {
    if (!selectedId || busy) return;
    setBusy(true);
    try {
      // addItemToInventory mute son argument mais on lui passe une copie
      // shallow pour respecter l'immutabilité côté React.
      const inventoryClone = {
        inventory: {
          ...character.inventory,
          items: [...character.inventory.items],
          coins: { ...character.inventory.coins },
        },
      };
      await addItemToInventory(inventoryClone, selectedId, 'public', { qty });
      await updateCharacter({ inventory: inventoryClone.inventory });
      showToast({
        kind: 'crit',
        title: 'Objet ajouté',
        sub: `${qty} × ${
          (filtered.find((f) => f.item.id === selectedId)?.item.name &&
            localize(filtered.find((f) => f.item.id === selectedId)!.item.name)) ??
          selectedId
        }`,
      });
      onClose();
    } catch (err) {
      showToast({
        kind: 'fumble',
        title: 'Ajout impossible',
        sub: err instanceof Error ? err.message : 'Erreur inconnue',
        durationMs: 4000,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-item-title"
      className="fixed inset-0 z-[80] flex items-end justify-center bg-ink/85 px-4 py-6 backdrop-blur-xl sm:items-center"
    >
      <div className="flex max-h-[90vh] w-full max-w-[460px] flex-col overflow-hidden rounded-card border border-soft bg-glass shadow-card-lg">
        <header className="flex items-start justify-between gap-3 border-b border-white-8 px-6 py-4">
          <div className="min-w-0">
            <h2
              id="add-item-title"
              className="font-display text-[20px] font-black tracking-[-0.02em] text-gold-bright"
            >
              {view === 'browse' ? 'Ajouter un objet' : 'Créer un objet maison'}
            </h2>
            <p className="font-ui text-[10px] uppercase tracking-[0.18em] text-text-tertiary">
              {view === 'browse'
                ? `${items.length} objets + ${magicItems.length} magiques`
                : 'Référence personnelle (user scope)'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-full border border-white-8 px-3 py-1 font-title text-[10px] uppercase tracking-[0.18em] text-text-tertiary transition-colors hover:border-soft hover:text-gold-bright"
          >
            ✕
          </button>
        </header>

        {view === 'browse' ? (
          <>
            <div className="border-b border-white-8 px-6 py-3">
              <label className="flex items-center gap-2 rounded-card-sm border border-white-8 bg-ink/40 px-3 py-2">
                <input
                  type="search"
                  autoFocus
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSelectedId(null);
                  }}
                  placeholder="Rechercher un objet…"
                  className="w-full bg-transparent font-serif text-body text-text placeholder:text-text-tertiary focus:outline-none"
                />
              </label>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-3">
              {filtered.length === 0 ? (
                <p className="rounded-card-sm border border-soft bg-ink/30 px-6 py-8 text-center font-serif italic text-text-tertiary">
                  Aucun objet ne correspond.
                </p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {filtered.map(({ item, isMagic }) => {
                    const isSelected = item.id === selectedId && isMagic === selectedIsMagic;
                    return (
                      <li key={`${isMagic ? 'magic' : 'item'}:${item.id}`}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedId(item.id);
                            setSelectedIsMagic(isMagic);
                            setQty(1);
                          }}
                          className={cn(
                            'flex w-full items-center justify-between gap-2 rounded-card-sm border px-3 py-2 text-left transition-all',
                            isSelected
                              ? 'border-gold-bright bg-gold-bright/10'
                              : 'border-white-8 bg-ink/30 hover:border-gold-dim',
                          )}
                        >
                          <div className="min-w-0">
                            <p className="truncate font-serif text-body text-text">
                              {localize(item.name)}
                            </p>
                            <p className="font-title text-[9px] font-bold uppercase tracking-[0.16em] text-text-tertiary">
                              {t(`item.category.${item.category}`)}
                              {isMagic && ` · ${t(`rarity.${(item as MagicItem).rarity}`)}`}
                              {!isMagic && (item as Item).weight > 0 && ` · ${(item as Item).weight} kg`}
                            </p>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <footer className="flex items-center gap-3 border-t border-white-8 px-6 py-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setView('custom')}
                className="shrink-0"
              >
                + Maison
              </Button>
              <div className="flex flex-1 items-center justify-end gap-2">
                {selectedId && (
                  <input
                    type="number"
                    min={1}
                    value={qty}
                    onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
                    aria-label="Quantité"
                    className="w-16 rounded-card-sm border border-white-8 bg-ink/40 px-2 py-1.5 text-center font-display text-[18px] font-bold text-gold-bright focus:border-gold-dim focus:outline-none"
                  />
                )}
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => void confirmAdd()}
                  disabled={!selectedId || busy}
                >
                  {busy ? '…' : 'Ajouter'}
                </Button>
              </div>
            </footer>
          </>
        ) : (
          <CustomItemForm
            character={character}
            onCancel={() => setView('browse')}
            onCreated={async () => {
              await onUserItemCreated();
              onClose();
            }}
          />
        )}
      </div>
    </div>
  );
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}
