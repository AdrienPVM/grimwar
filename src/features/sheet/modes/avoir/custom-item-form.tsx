import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useState } from 'react';

import { useAuth } from '@/features/auth/use-auth';
import { Button } from '@/shared/components/button';
import { invalidateUserContent } from '@/shared/lib/content-loader';
import { getDb } from '@/shared/lib/firebase';
import { addItemToInventory } from '@/shared/lib/inventory';
import { showToast } from '@/shared/lib/slices/toast-slice';
import {
  ItemSchema,
  type ItemCategory,
} from '@/shared/types/content';
import type { Character } from '@/shared/types/character';

import { useUpdateCharacter } from '../../use-update-character';

interface CustomItemFormProps {
  character: Character;
  onCancel: () => void;
  onCreated: () => Promise<void>;
}

const CATEGORY_OPTIONS: readonly { value: ItemCategory; label: string }[] = [
  { value: 'weapon', label: 'Arme' },
  { value: 'armor', label: 'Armure' },
  { value: 'shield', label: 'Bouclier' },
  { value: 'tool', label: 'Outil' },
  { value: 'pack', label: 'Sac / Kit' },
  { value: 'gear', label: 'Équipement' },
  { value: 'mount', label: 'Monture' },
  { value: 'vehicle', label: 'Véhicule' },
];

/** Slugify simple : minuscules, ASCII, kebab-case, suffixe court random. */
function slugify(name: string): string {
  const slug = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'objet';
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${slug}-${suffix}`;
}

/**
 * Formulaire de création d'objet maison (user scope). Écrit dans
 * `users/{uid}/customContent/items/{id}` puis ajoute à l'inventaire via
 * `addItemToInventory` qui repassera par `ensureContentExists` pour valider
 * la lecture Firestore — garantie stricte que l'item est bien en DB avant
 * l'ajout.
 *
 * Champs minimaux : nom (FR), catégorie, poids (kg, défaut 0), description.
 * Le coût et les propriétés détaillées sont éditables plus tard dans la fiche
 * (plan 19 polira les forms maison). Pas de magic item maison ici — l'item
 * créé suit le schéma Item standard.
 */
export function CustomItemForm({
  character,
  onCancel,
  onCreated,
}: CustomItemFormProps): JSX.Element {
  const { user } = useAuth();
  const { updateCharacter } = useUpdateCharacter(character.id);

  const [name, setName] = useState<string>('');
  const [category, setCategory] = useState<ItemCategory>('gear');
  const [weight, setWeight] = useState<string>('0');
  const [description, setDescription] = useState<string>('');
  const [busy, setBusy] = useState<boolean>(false);

  const canSubmit = name.trim().length > 0 && !busy && user !== null;

  async function handleSubmit(): Promise<void> {
    if (!canSubmit || !user) return;
    setBusy(true);
    try {
      const id = slugify(name);
      const item = {
        id,
        name: { fr: name.trim() },
        category,
        cost: null,
        weight: Math.max(0, Number(weight) || 0),
        description: description.trim() ? { fr: description.trim() } : null,
        source: 'aidedd-homebrew',
      };
      // Validation Zod locale avant écriture — défense en profondeur.
      const parsed = ItemSchema.safeParse(item);
      if (!parsed.success) {
        throw new Error(
          `Schéma invalide : ${parsed.error.errors.map((e) => e.message).join(', ')}`,
        );
      }
      const itemRef = doc(
        getDb(),
        'users',
        user.uid,
        'customContent',
        'items',
        id,
      );
      await setDoc(itemRef, { ...parsed.data, createdAt: serverTimestamp() });
      // Invalidation du cache user pour que refreshUserItems voie l'objet.
      await invalidateUserContent('items', user.uid);

      // Ajout immédiat à l'inventaire (resolveContent fera un round-trip
      // Firestore pour vérifier — strict comme tout autre item).
      const inventoryClone = {
        inventory: {
          ...character.inventory,
          items: [...character.inventory.items],
          coins: { ...character.inventory.coins },
        },
      };
      await addItemToInventory(inventoryClone, id, 'user', { qty: 1 }, user.uid);
      await updateCharacter({ inventory: inventoryClone.inventory });

      showToast({
        kind: 'crit',
        title: 'Objet maison créé',
        sub: name.trim(),
      });
      await onCreated();
    } catch (err) {
      showToast({
        kind: 'fumble',
        title: 'Création impossible',
        sub: err instanceof Error ? err.message : 'Erreur inconnue',
        durationMs: 4000,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <label className="mb-3 block">
          <span className="mb-1 block font-title text-[9px] font-bold uppercase tracking-[0.22em] text-text-tertiary">
            Nom
          </span>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            placeholder="Grimoire personnel de Lyralei"
            className="w-full rounded-card-sm border border-white-8 bg-ink/40 px-3 py-2 font-serif text-body text-text placeholder:text-text-tertiary focus:border-gold-dim focus:outline-none"
          />
        </label>

        <label className="mb-3 block">
          <span className="mb-1 block font-title text-[9px] font-bold uppercase tracking-[0.22em] text-text-tertiary">
            Catégorie
          </span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ItemCategory)}
            className="w-full rounded-card-sm border border-white-8 bg-bg-2/60 px-3 py-2 font-serif text-body text-text focus:border-gold-dim focus:outline-none"
          >
            {CATEGORY_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="mb-3 block">
          <span className="mb-1 block font-title text-[9px] font-bold uppercase tracking-[0.22em] text-text-tertiary">
            Poids (kg)
          </span>
          <input
            type="number"
            min={0}
            step={0.1}
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="w-full rounded-card-sm border border-white-8 bg-ink/40 px-3 py-2 font-display text-body text-text focus:border-gold-dim focus:outline-none"
          />
        </label>

        <label className="block">
          <span className="mb-1 block font-title text-[9px] font-bold uppercase tracking-[0.22em] text-text-tertiary">
            Description (optionnelle)
          </span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Notes, propriétés, histoire…"
            rows={3}
            className="w-full rounded-card-sm border border-white-8 bg-ink/40 px-3 py-2 font-serif text-body-sm text-text placeholder:text-text-tertiary focus:border-gold-dim focus:outline-none"
          />
        </label>
      </div>

      <footer className="flex gap-2 border-t border-white-8 px-6 py-4">
        <Button variant="secondary" size="sm" onClick={onCancel} className="flex-1">
          Annuler
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={() => void handleSubmit()}
          disabled={!canSubmit}
          className="flex-1"
        >
          {busy ? '…' : 'Créer & ajouter'}
        </Button>
      </footer>
    </div>
  );
}
