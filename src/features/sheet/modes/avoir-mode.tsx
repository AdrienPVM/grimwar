import { useState } from 'react';

import { BENTO_GRID, BentoTile } from '@/shared/components/bento';
import type { Character } from '@/shared/types/character';

import { useSheetReadOnly } from '../permissions-context';
import { AddItemModal } from './avoir/add-item-modal';
import { AttunementSummary } from './avoir/attunement-summary';
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
 * Read-only quand `status === 'dead'` OU lecture MJ (`!canEdit`, JALON 4A.3) :
 * édition désactivée partout (coins, équipement, attune, qty, ajout, création).
 */
export function AvoirMode({ character }: AvoirModeProps): JSX.Element {
  const readOnly = useSheetReadOnly(character);
  const derived = useInventoryDerived(character);

  const [activeRow, setActiveRow] = useState<ResolvedInventoryRow | null>(null);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  return (
    <section
      role="tabpanel"
      id="sheet-mode-panel-avoir"
      aria-labelledby="sheet-mode-tab-avoir"
      className={BENTO_GRID}
    >
      {/*
        Bento (cf. `shared/components/bento.tsx`). Poids et bourse forment le
        bandeau d'état : ce sont les deux seules cartes TOUJOURS rendues, donc
        la seule paire qui ne laisse jamais de trou en tête de mosaïque.
        L'harmonisation prend une rangée pleine — elle se masque d'elle-même
        sans objet harmonisé, et la tuile se retire avec elle (règle `:has()`),
        sans que ce parent ait à dupliquer la condition.
      */}
      <BentoTile span="md">
        <WeightBar
          weightTotal={derived.weightTotal}
          carryingCapacity={derived.carryingCapacity}
          level={derived.encumbranceLevel}
        />
      </BentoTile>
      <BentoTile span="md">
        <CoinsSection character={character} readOnly={readOnly} />
      </BentoTile>
      <BentoTile span="full">
        <AttunementSummary
          resolvedItems={derived.resolvedItems}
          attunedCount={derived.attunedCount}
        />
      </BentoTile>
      <BentoTile span="full">
        <InventoryList
          resolvedItems={derived.resolvedItems}
          onItemSelect={setActiveRow}
          onAddItemClick={() => setShowAddModal(true)}
          readOnly={readOnly}
        />
      </BentoTile>

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
