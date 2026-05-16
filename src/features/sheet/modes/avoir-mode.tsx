import { useState } from 'react';

import type { Character } from '@/shared/types/character';

import { isSheetReadOnly } from './combat/hp-combat';
import { AddItemModal } from './avoir/add-item-modal';
import { CoinsSection } from './avoir/coins-section';
import { InventoryList } from './avoir/inventory-list';
import { ItemDetailModal } from './avoir/item-detail-modal';
import {
  useInventoryDerived,
  type ResolvedInventoryRow,
} from './avoir/use-inventory-derived';
import { WeightBar } from './avoir/weight-bar';

interface AvoirModeProps {
  character: Character;
}

/**
 * Mode Avoir : poids transporté + bourse + inventaire groupé par catégorie.
 *
 * STRICT items DB : chaque item référence un contentId réel (public ou user
 * scope). Pas de free-string possible — `addItemToInventory` throw sur ID
 * inconnu, vérifiable via la modale AddItemModal qui n'a pas de champ texte
 * libre pour l'ajout.
 *
 * Read-only quand `status === 'dead'` : édition désactivée partout (coins,
 * équipement, attune, qty, ajout, création maison).
 */
export function AvoirMode({ character }: AvoirModeProps): JSX.Element {
  const readOnly = isSheetReadOnly(character);
  const derived = useInventoryDerived(character);

  const [activeRow, setActiveRow] = useState<ResolvedInventoryRow | null>(null);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  return (
    <section
      role="tabpanel"
      id="sheet-mode-panel-avoir"
      aria-labelledby="sheet-mode-tab-avoir"
      className="mx-auto mt-4 flex w-full max-w-[460px] flex-col gap-3 px-4"
    >
      <WeightBar
        weightTotal={derived.weightTotal}
        carryingCapacity={derived.carryingCapacity}
        level={derived.encumbranceLevel}
      />
      <CoinsSection character={character} readOnly={readOnly} />
      <InventoryList
        resolvedItems={derived.resolvedItems}
        onItemSelect={setActiveRow}
        onAddItemClick={() => setShowAddModal(true)}
        readOnly={readOnly}
      />

      {activeRow && (
        <ItemDetailModal
          character={character}
          row={activeRow}
          attunedCount={derived.attunedCount}
          readOnly={readOnly}
          onClose={() => setActiveRow(null)}
        />
      )}

      {showAddModal && (
        <AddItemModal
          character={character}
          onClose={() => setShowAddModal(false)}
          onUserItemCreated={derived.refreshUserItems}
        />
      )}
    </section>
  );
}
