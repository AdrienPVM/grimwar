import {
  loadPublicContent,
  resolveContent,
  type ContentScope,
} from './content-loader';
import type { Item, MagicItem } from '../types/content';

/**
 * Inventaire — résolution stricte des items.
 *
 * Règle invariant (CLAUDE.md, docs/DATA-MODEL.md) : on n'autorise JAMAIS un
 * item en inventaire qui ne référence pas un objet existant dans le contenu
 * public, user, ou campagne. Cette contrainte évite les "free strings" qui
 * cassent les futurs calculs d'AC, de poids, de propriétés magiques, etc.
 *
 * `addItemToInventory` valide l'existence avant l'ajout et lève une exception
 * détaillée sur scope='public' avec un ID inconnu, pour que la cause soit
 * évidente dans les logs (mauvais ID dans le wizard, item retiré du SRD…).
 */

export interface InventoryItem {
  contentId: string;
  contentScope: ContentScope;
  contentSource?: string; // pour 'campaign' / 'user' : l'ID de la portée
  qty: number;
  equipped: boolean;
  attuned: boolean;
  notes: string;
}

export interface CharacterInventoryShape {
  inventory: {
    items: InventoryItem[];
    coins: { cu: number; ar: number; el: number; or: number; pl: number };
    weightCache: number;
  };
}

export type ResolvedInventoryItem = Item | MagicItem;

/**
 * Résout un item d'inventaire vers son entité de contenu complète.
 * Retourne null si l'item n'existe plus dans la portée donnée (ex : DM a
 * supprimé un item homebrew).
 */
export async function resolveInventoryItem(
  item: InventoryItem,
): Promise<ResolvedInventoryItem | null> {
  // Tente d'abord items basiques, puis magic-items (deux types possibles).
  const asItem = await resolveContent('items', item.contentId, {
    scope: item.contentScope,
    scopeId: item.contentSource,
  });
  if (asItem) return asItem;
  const asMagic = await resolveContent('magic-items', item.contentId, {
    scope: item.contentScope,
    scopeId: item.contentSource,
  });
  return asMagic;
}

/**
 * Vérifie qu'un contentId existe avant de l'ajouter.
 *
 * Pour scope='public' : on vérifie EN MÉMOIRE contre les bundles items + magic-items.
 * Pour scope='user' / 'campaign' : on vérifie via Firestore via resolveContent.
 *
 * Lève une `Error` détaillée si l'ID est inconnu — pas de free strings.
 */
export async function ensureContentExists(
  contentId: string,
  scope: ContentScope,
  scopeId?: string,
): Promise<ResolvedInventoryItem> {
  if (scope === 'public') {
    const items = await loadPublicContent('items');
    const found = items.find((i) => i.id === contentId);
    if (found) return found;
    const magicItems = await loadPublicContent('magic-items');
    const foundMagic = magicItems.find((i) => i.id === contentId);
    if (foundMagic) return foundMagic;
    throw new Error(
      `[inventory] contentId "${contentId}" introuvable dans public/data items + magic-items. ` +
        `Aucun free-string item autorisé : utilise un ID référencé.`,
    );
  }

  const resolved = await resolveInventoryItem({
    contentId,
    contentScope: scope,
    contentSource: scopeId,
    qty: 1,
    equipped: false,
    attuned: false,
    notes: '',
  });
  if (!resolved) {
    throw new Error(
      `[inventory] contentId "${contentId}" introuvable dans ${scope}${scopeId ? `/${scopeId}` : ''}.`,
    );
  }
  return resolved;
}

export interface AddItemOptions {
  qty?: number;
  equipped?: boolean;
  attuned?: boolean;
  notes?: string;
}

/**
 * Ajoute un item à l'inventaire d'un personnage. Mute la structure d'inventaire
 * passée en argument et retourne l'inventaire muté (pratique pour l'utiliser
 * dans une mise à jour Firestore atomique).
 *
 * Si un item identique (même contentId + même contentScope) existe déjà, on
 * incrémente sa quantité plutôt que d'ajouter une nouvelle ligne.
 */
export async function addItemToInventory(
  character: CharacterInventoryShape,
  contentId: string,
  scope: ContentScope,
  options: AddItemOptions = {},
  scopeId?: string,
): Promise<CharacterInventoryShape> {
  await ensureContentExists(contentId, scope, scopeId);

  const qty = options.qty ?? 1;
  const existing = character.inventory.items.find(
    (i) => i.contentId === contentId && i.contentScope === scope,
  );
  if (existing) {
    existing.qty += qty;
    return character;
  }

  character.inventory.items.push({
    contentId,
    contentScope: scope,
    contentSource: scopeId,
    qty,
    equipped: options.equipped ?? false,
    attuned: options.attuned ?? false,
    notes: options.notes ?? '',
  });
  return character;
}
