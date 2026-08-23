import { useState, type JSX } from 'react';

import { useAuth } from '@/features/auth/use-auth';
import {
  EMPTY_ITEM_DRAFT,
  ItemForm,
  type ItemFormDraft,
} from '@/features/custom-content/forms/item-form';
import { t } from '@/shared/lib/i18n';
import { addItemToInventory } from '@/shared/lib/inventory';
import { showToast } from '@/shared/lib/slices/toast-slice';
import type { Item } from '@/shared/types/content';
import type { Character } from '@/shared/types/character';

import { useUpdateCharacter } from '../../use-update-character';
import { addItemToPersonalPack } from './personal-item-pack';

interface CustomItemFormProps {
  character: Character;
  onCancel: () => void;
  onCreated: () => Promise<void>;
}

/**
 * Création d'un objet maison depuis l'inventaire, puis ajout immédiat.
 *
 * Deux défauts réparés d'un coup (M27) :
 *
 * 1. **Le formulaire ne collectait que nom / catégorie / poids / description.**
 *    Une « arme » sans `damage` est rejetée en silence par la liste d'attaques
 *    — elle apparaissait dans le sac et restait injouable. On réutilise donc
 *    le formulaire des packs, qui couvre dégâts, propriétés, portée, maîtrise
 *    et CA de base. Une implémentation, deux points d'entrée.
 * 2. **L'écriture visait un chemin invalide.**
 *    `users/{uid}/customContent/items/{id}` compte CINQ segments : `doc()` le
 *    refuse. La création LEVAIT, et l'objet n'existait nulle part. Elle passe
 *    désormais par le pack personnel, la seule source que
 *    `resolveContent(scope:'user')` interroge réellement.
 */
export function CustomItemForm({
  character,
  onCancel,
  onCreated,
}: CustomItemFormProps): JSX.Element {
  const { user } = useAuth();
  const { updateCharacter } = useUpdateCharacter(character);
  const [draft, setDraft] = useState<ItemFormDraft>(EMPTY_ITEM_DRAFT);
  const [busy, setBusy] = useState<boolean>(false);

  async function handleConfirm(item: Item): Promise<void> {
    if (!user || busy) return;
    setBusy(true);
    try {
      await addItemToPersonalPack(user.uid, item, new Date().toISOString());

      const inventoryClone = {
        inventory: {
          ...character.inventory,
          items: [...character.inventory.items],
          coins: { ...character.inventory.coins },
        },
      };
      // Scope `user` : l'objet vient du pack personnel, pas du SRD. Poser
      // « public » ici le rendrait introuvable à la relecture.
      await addItemToInventory(inventoryClone, item.id, 'user', { qty: 1 }, user.uid);
      await updateCharacter({ inventory: inventoryClone.inventory });

      showToast({
        kind: 'crit',
        title: t('sheet.avoir.customForm.created'),
        sub: item.name.fr,
      });
      setDraft(EMPTY_ITEM_DRAFT);
      await onCreated();
    } catch (err) {
      showToast({
        kind: 'fumble',
        title: t('sheet.avoir.customForm.failTitle'),
        sub: err instanceof Error ? err.message : t('sheet.avoir.unknownError'),
        durationMs: 4000,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto px-6 py-4">
      <ItemForm
        draft={draft}
        onChange={setDraft}
        onConfirm={(item) => void handleConfirm(item)}
        onCancel={onCancel}
      />
    </div>
  );
}
