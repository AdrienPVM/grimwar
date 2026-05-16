import { useState } from 'react';

import { Button } from '@/shared/components/button';
import { Chip } from '@/shared/components/chip';
import { cn } from '@/shared/lib/cn';
import { localize, t } from '@/shared/lib/i18n';
import { showToast } from '@/shared/lib/slices/toast-slice';
import type { Character } from '@/shared/types/character';
import type { Item, MagicItem } from '@/shared/types/content';
import type { InventoryItem } from '@/shared/lib/inventory';

import { useUpdateCharacter } from '../../use-update-character';
import type { ResolvedInventoryRow } from './use-inventory-derived';

interface ItemDetailModalProps {
  character: Character;
  row: ResolvedInventoryRow;
  attunedCount: number;
  readOnly: boolean;
  onClose: () => void;
}

/** Cap d'attunement SRD : 3 objets liés maximum. */
const ATTUNEMENT_CAP = 3;

/**
 * Modale détail d'un item d'inventaire. Affiche description, propriétés,
 * dégâts/AC, et propose les actions :
 *   - Équiper / Déséquiper (armures + armes ; AC recalculé via le hook au
 *     prochain rendu, pas besoin de patch explicite).
 *   - Lier / Délier (magic items qui requièrent attunement ; cap 3).
 *   - Quantité : −/+ avec floor à 1 (descendre à 0 = passe par « Retirer »).
 *   - Notes : textarea libre, sauvegardé au blur.
 *   - Retirer : retire complètement la ligne d'inventaire (confirm inline).
 *
 * Tous les patchs passent par `updateCharacter({ inventory: ... })` — un seul
 * write Firestore par action. Toasts pour feedback. ReadOnly désactive toutes
 * les actions.
 */
export function ItemDetailModal({
  character,
  row,
  attunedCount,
  readOnly,
  onClose,
}: ItemDetailModalProps): JSX.Element {
  const { updateCharacter } = useUpdateCharacter(character.id);
  const [busy, setBusy] = useState<boolean>(false);
  const [confirmRemove, setConfirmRemove] = useState<boolean>(false);

  const { inventory, content, isMagic } = row;
  const name = content ? localize(content.name) : `(introuvable) ${inventory.contentId}`;
  const description = content?.description ? localize(content.description) : null;
  const magicDescription = isMagic ? localize((content as MagicItem).magicDescription) : null;

  // Une armure ou une arme est « équipable ». Magic items équipables ssi catégorie compatible.
  const canEquip =
    content !== null && ['weapon', 'armor', 'shield'].includes(content.category);
  // Attunement : seulement pour magic items qui le requièrent.
  const requiresAttunement =
    isMagic && (content as MagicItem).attunement !== false;

  async function patchInventoryItem(updates: Partial<InventoryItem>): Promise<void> {
    if (readOnly || busy) return;
    setBusy(true);
    try {
      const nextItems = character.inventory.items.map((i) =>
        i.contentId === inventory.contentId && i.contentScope === inventory.contentScope
          ? { ...i, ...updates }
          : i,
      );
      await updateCharacter({
        inventory: { ...character.inventory, items: nextItems },
      });
    } finally {
      setBusy(false);
    }
  }

  async function removeItem(): Promise<void> {
    if (readOnly || busy) return;
    setBusy(true);
    try {
      const nextItems = character.inventory.items.filter(
        (i) =>
          !(i.contentId === inventory.contentId && i.contentScope === inventory.contentScope),
      );
      await updateCharacter({
        inventory: { ...character.inventory, items: nextItems },
      });
      showToast({ kind: 'info', title: 'Objet retiré', sub: name });
      onClose();
    } finally {
      setBusy(false);
    }
  }

  async function toggleEquipped(): Promise<void> {
    await patchInventoryItem({ equipped: !inventory.equipped });
    showToast({
      kind: inventory.equipped ? 'info' : 'roll',
      title: !inventory.equipped ? 'Équipé' : 'Déséquipé',
      sub: name,
    });
  }

  async function toggleAttuned(): Promise<void> {
    if (!inventory.attuned && attunedCount >= ATTUNEMENT_CAP) {
      showToast({
        kind: 'fumble',
        title: 'Limite d\'attunement',
        sub: `Cap ${ATTUNEMENT_CAP} objets liés simultanément.`,
      });
      return;
    }
    await patchInventoryItem({ attuned: !inventory.attuned });
    showToast({
      kind: inventory.attuned ? 'info' : 'crit',
      title: inventory.attuned ? 'Lien rompu' : 'Lien établi',
      sub: name,
    });
  }

  async function changeQty(delta: number): Promise<void> {
    const next = Math.max(1, inventory.qty + delta);
    if (next === inventory.qty) return;
    await patchInventoryItem({ qty: next });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="item-detail-title"
      className="fixed inset-0 z-[80] flex items-end justify-center bg-ink/85 px-4 py-6 backdrop-blur-xl sm:items-center"
    >
      <div className="flex max-h-[90vh] w-full max-w-[460px] flex-col overflow-hidden rounded-card border border-soft bg-glass shadow-card-lg">
        <header className="flex items-start justify-between gap-3 border-b border-white-8 px-6 py-4">
          <div className="min-w-0">
            <h2
              id="item-detail-title"
              className="font-display text-[20px] font-black tracking-[-0.02em] text-gold-bright"
            >
              {name}
            </h2>
            <p className="font-ui text-[10px] uppercase tracking-[0.18em] text-text-tertiary">
              {content && (
                <>
                  {t(`item.category.${content.category}`)}
                  {isMagic && ` · ${t(`rarity.${(content as MagicItem).rarity}`)}`}
                </>
              )}
              {!content && 'Item non résolu'}
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

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {content && !isMagic && (
            <dl className="mb-4 grid grid-cols-2 gap-3 font-serif text-body-sm">
              <Meta label="Poids">
                {(content as Item).weight > 0 ? `${(content as Item).weight} kg` : '—'}
              </Meta>
              <Meta label="Coût">{formatCost(content as Item)}</Meta>
              {(content as Item).damage && (
                <Meta label="Dégâts">
                  {(content as Item).damage!.dice} {localize((content as Item).damage!.typeLabel)}
                </Meta>
              )}
              {(content as Item).acBase !== undefined && (
                <Meta label="CA">
                  {(content as Item).acBase}
                  {(content as Item).acDexMax !== undefined &&
                    (content as Item).acDexMax !== null &&
                    ` + DEX (max ${(content as Item).acDexMax})`}
                </Meta>
              )}
            </dl>
          )}

          {(content as Item | undefined)?.properties &&
            (content as Item).properties!.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-1.5">
                {(content as Item).properties!.map((prop) => (
                  <Chip key={prop} variant="default">
                    {prop}
                  </Chip>
                ))}
              </div>
            )}

          {magicDescription && (
            <p className="mb-3 whitespace-pre-line font-serif text-body text-amethyst">
              {magicDescription}
            </p>
          )}
          {description && (
            <p className="whitespace-pre-line font-serif text-body text-text-secondary">
              {description}
            </p>
          )}
          {!description && !magicDescription && content && !isMagic && !(content as Item).damage && (
            <p className="font-serif text-body-sm italic text-text-tertiary">
              Aucun descriptif détaillé pour cet objet.
            </p>
          )}

          {/* Quantité */}
          <div className="mt-4 flex items-center justify-between rounded-card-sm border border-white-8 bg-ink/30 px-4 py-2">
            <span className="font-title text-[9px] font-bold uppercase tracking-[0.22em] text-text-tertiary">
              Quantité
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => void changeQty(-1)}
                disabled={readOnly || busy || inventory.qty <= 1}
                aria-label="Diminuer la quantité"
                className={cn(
                  'h-8 w-8 rounded-full border border-white-8 bg-ink/40 font-display text-[16px] text-text transition-colors',
                  'hover:border-gold-dim hover:text-gold-bright disabled:cursor-not-allowed disabled:opacity-40',
                )}
              >
                −
              </button>
              <span className="min-w-[2rem] text-center font-display text-[22px] font-bold text-gold-bright">
                {inventory.qty}
              </span>
              <button
                type="button"
                onClick={() => void changeQty(1)}
                disabled={readOnly || busy}
                aria-label="Augmenter la quantité"
                className={cn(
                  'h-8 w-8 rounded-full border border-white-8 bg-ink/40 font-display text-[16px] text-text transition-colors',
                  'hover:border-gold-dim hover:text-gold-bright disabled:cursor-not-allowed disabled:opacity-40',
                )}
              >
                +
              </button>
            </div>
          </div>

          {/* Notes */}
          <label className="mt-3 block">
            <span className="mb-1 block font-title text-[9px] font-bold uppercase tracking-[0.22em] text-text-tertiary">
              Notes
            </span>
            <textarea
              defaultValue={inventory.notes}
              onBlur={(e) => {
                if (e.target.value !== inventory.notes) {
                  void patchInventoryItem({ notes: e.target.value });
                }
              }}
              disabled={readOnly}
              placeholder="Origine, histoire, runes gravées…"
              rows={2}
              className="w-full rounded-card-sm border border-white-8 bg-ink/40 px-3 py-2 font-serif text-body-sm text-text placeholder:text-text-tertiary focus:border-gold-dim focus:outline-none disabled:opacity-50"
            />
          </label>
        </div>

        <footer className="flex flex-col gap-2 border-t border-white-8 px-6 py-4">
          <div className="flex flex-wrap gap-2">
            {canEquip && (
              <Button
                variant={inventory.equipped ? 'secondary' : 'primary'}
                size="sm"
                onClick={() => void toggleEquipped()}
                disabled={readOnly || busy}
                className="flex-1"
              >
                {inventory.equipped ? 'Déséquiper' : 'Équiper'}
              </Button>
            )}
            {requiresAttunement && (
              <Button
                variant={inventory.attuned ? 'secondary' : 'primary'}
                size="sm"
                onClick={() => void toggleAttuned()}
                disabled={readOnly || busy}
                className="flex-1"
              >
                {inventory.attuned ? 'Délier' : 'Lier'}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={onClose} className="flex-1">
              Fermer
            </Button>
            {confirmRemove ? (
              <Button
                variant="danger"
                size="sm"
                onClick={() => void removeItem()}
                disabled={readOnly || busy}
                className="flex-1"
              >
                Confirmer le retrait
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmRemove(true)}
                disabled={readOnly || busy}
                className="flex-1"
              >
                Retirer
              </Button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}

function Meta({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <div>
      <dt className="font-title text-[9px] font-bold uppercase tracking-[0.22em] text-text-tertiary">
        {label}
      </dt>
      <dd className="text-text">{children}</dd>
    </div>
  );
}

function formatCost(item: Item): string {
  if (!item.cost) return '—';
  return `${item.cost.qty} ${item.cost.unit}`;
}
