import { useState } from 'react';

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
      className="mx-auto mt-4 flex w-full max-w-[420px] flex-col gap-3 px-4 lg:max-w-[720px] lg:px-0 xl:max-w-none xl:grid xl:grid-cols-2 xl:items-start xl:gap-4"
    >
      {/*
        xl: grid 2-col (DEBT D6). Poids et bourse se posent côte à côte — ce
        sont les deux seules cartes TOUJOURS rendues, donc la seule paire qui ne
        laisse jamais de trou. `AttunementSummary` se masque de lui-même quand
        rien n'est harmonisé (`attunedCount === 0`) : le mettre en 1 colonne
        ouvrait une demi-rangée vide à côté de la bourse sur la majorité des
        fiches. Il prend donc la pleine largeur, comme l'inventaire, qui profite
        de la largeur pour passer ses lignes en 2 colonnes.
      */}
      <WeightBar
        weightTotal={derived.weightTotal}
        carryingCapacity={derived.carryingCapacity}
        level={derived.encumbranceLevel}
      />
      <CoinsSection character={character} readOnly={readOnly} />
      {/*
        Garde explicite au parent : un composant qui rend `null` ne crée PAS de
        cellule de grille, mais le <div> qui l'enveloppe, si. Sans cette
        condition, la fiche sans objet harmonisé gagnait une rangée vide.
      */}
      {derived.attunedCount > 0 && (
        <div className="xl:col-span-2">
          <AttunementSummary
            resolvedItems={derived.resolvedItems}
            attunedCount={derived.attunedCount}
          />
        </div>
      )}
      <div className="xl:col-span-2">
        <InventoryList
          resolvedItems={derived.resolvedItems}
          onItemSelect={setActiveRow}
          onAddItemClick={() => setShowAddModal(true)}
          readOnly={readOnly}
        />
      </div>

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
