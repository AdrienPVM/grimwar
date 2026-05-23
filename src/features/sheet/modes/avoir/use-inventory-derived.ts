import { useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/features/auth/use-auth';
import { useContent } from '@/shared/hooks/use-content';
import { loadUserContent } from '@/shared/lib/content-loader';
import type { Character } from '@/shared/types/character';
import type { Item, MagicItem } from '@/shared/types/content';
import type { InventoryItem } from '@/shared/lib/inventory';

import {
  carryingCapacity,
  computeAcFromArmor,
  computeEncumbrance,
  hasEquippedBodyArmor,
  type EncumbranceLevel,
  type EquippedRow,
} from './inventory-rules';

export type { EncumbranceLevel };

/**
 * Hook dérivé de l'inventaire : résout chaque entrée vers son contenu (public
 * Item, public MagicItem, ou user custom Item), calcule poids total, capacité
 * de charge (FOR × 7.5 kg, SRD 2024), niveau d'encombrement et AC issue de
 * l'armure équipée.
 *
 * Stratégie de résolution :
 *  - `public` : on croise contre les bundles items + magic-items chargés via
 *    useContent (cache Dexie 7j).
 *  - `user`   : on charge `users/{uid}/customContent/items` une fois et on
 *    indexe par id. `refreshUserItems()` permet de re-fetch après création
 *    d'un nouvel objet maison. Pas d'onSnapshot pour limiter la consommation
 *    Firestore en S1 — la création passe par invalidation explicite.
 *  - `campaign` : non géré ici (plan 19, S2). Les items campaign-scopés
 *    apparaissent comme `content: null` en attendant.
 */

export type ResolvedInventoryRow =
  | { inventory: InventoryItem; content: Item; isMagic: false }
  | { inventory: InventoryItem; content: MagicItem; isMagic: true }
  | { inventory: InventoryItem; content: null; isMagic: false };

export interface InventoryDerived {
  resolvedItems: readonly ResolvedInventoryRow[];
  weightTotal: number;
  carryingCapacity: number;
  encumbranceLevel: EncumbranceLevel;
  /** AC issue de l'armure équipée (ou null si aucune armure équipée). */
  acFromArmor: number | null;
  /**
   * Vrai si au moins une armure (light/medium/heavy) est portée. Gate du
   * Fighting Style Defense — un bouclier seul ne déclenche pas le +1 CA.
   */
  hasEquippedBodyArmor: boolean;
  /** Items équipés en attunement (cap 5e = 3). */
  attunedCount: number;
  loading: boolean;
  refreshUserItems: () => Promise<void>;
}

/** Poids des MagicItem : le schéma SRD ne porte pas `weight`. Approximation = 0. */
const MAGIC_ITEM_WEIGHT = 0;

export function useInventoryDerived(character: Character): InventoryDerived {
  const { user } = useAuth();
  const { data: items, loading: itemsLoading } = useContent('items');
  const { data: magicItems, loading: magicLoading } = useContent('magic-items');

  const [userItems, setUserItems] = useState<readonly Item[]>([]);
  const [userLoading, setUserLoading] = useState<boolean>(false);

  // Détecte si on a au moins un item user-scope dans l'inventaire avant de
  // charger la collection custom — pas de fetch si zéro custom item.
  const hasUserItems = useMemo(
    () => character.inventory.items.some((i) => i.contentScope === 'user'),
    [character.inventory.items],
  );

  async function loadCustom(): Promise<void> {
    if (!user || !hasUserItems) {
      setUserItems([]);
      return;
    }
    setUserLoading(true);
    try {
      const fetched = await loadUserContent('items', user.uid);
      setUserItems(fetched);
    } finally {
      setUserLoading(false);
    }
  }

  useEffect(() => {
    void loadCustom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, hasUserItems]);

  const itemsById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const magicById = useMemo(() => new Map(magicItems.map((i) => [i.id, i])), [magicItems]);
  const userById = useMemo(() => new Map(userItems.map((i) => [i.id, i])), [userItems]);

  const resolvedItems = useMemo<readonly ResolvedInventoryRow[]>(() => {
    return character.inventory.items.map<ResolvedInventoryRow>((inv) => {
      if (inv.contentScope === 'public') {
        const asItem = itemsById.get(inv.contentId);
        if (asItem) return { inventory: inv, content: asItem, isMagic: false };
        const asMagic = magicById.get(inv.contentId);
        if (asMagic) return { inventory: inv, content: asMagic, isMagic: true };
        return { inventory: inv, content: null, isMagic: false };
      }
      if (inv.contentScope === 'user') {
        const asUser = userById.get(inv.contentId);
        if (asUser) return { inventory: inv, content: asUser, isMagic: false };
        return { inventory: inv, content: null, isMagic: false };
      }
      // campaign scope — non géré en S1 (plan 19)
      return { inventory: inv, content: null, isMagic: false };
    });
  }, [character.inventory.items, itemsById, magicById, userById]);

  const weightTotal = useMemo(() => {
    let total = 0;
    for (const row of resolvedItems) {
      if (!row.content) continue;
      const weight = row.isMagic ? MAGIC_ITEM_WEIGHT : row.content.weight;
      total += weight * row.inventory.qty;
    }
    return Math.round(total * 10) / 10;
  }, [resolvedItems]);

  const capacity = useMemo(
    () => carryingCapacity(character.abilities.for),
    [character.abilities.for],
  );

  const encumbranceLevel = useMemo<EncumbranceLevel>(
    () => computeEncumbrance(weightTotal, character.abilities.for),
    [weightTotal, character.abilities.for],
  );

  const equippedRows = useMemo<EquippedRow[]>(() => {
    const equipped: EquippedRow[] = [];
    for (const row of resolvedItems) {
      if (!row.content) continue;
      equipped.push({
        item: row.content,
        inventory: row.inventory,
        isMagic: row.isMagic,
      });
    }
    return equipped;
  }, [resolvedItems]);

  const acFromArmor = useMemo(
    () => computeAcFromArmor(equippedRows, character.abilities.dex),
    [equippedRows, character.abilities.dex],
  );

  const hasBodyArmor = useMemo(
    () => hasEquippedBodyArmor(equippedRows),
    [equippedRows],
  );

  const attunedCount = useMemo(
    () => character.inventory.items.filter((i) => i.attuned).length,
    [character.inventory.items],
  );

  return {
    resolvedItems,
    weightTotal,
    carryingCapacity: capacity,
    encumbranceLevel,
    acFromArmor,
    hasEquippedBodyArmor: hasBodyArmor,
    attunedCount,
    loading: itemsLoading || magicLoading || userLoading,
    refreshUserItems: loadCustom,
  };
}
