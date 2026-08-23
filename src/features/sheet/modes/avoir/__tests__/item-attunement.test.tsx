import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Character } from '@/shared/types/character';
import type { MagicItem } from '@/shared/types/content';

import { ItemDetailModal } from '../item-detail-modal';
import type { ResolvedInventoryRow } from '../use-inventory-derived';

/**
 * M38 — l'harmonisation.
 *
 * Deux murs, tous deux dans cette modale : le bouton « Lier » n'apparaissait que
 * si l'entité déclarait `attunement !== false`, et le plafond de 3 REFUSAIT
 * durement la 4ᵉ liaison. Or « chez moi un artificier en harmonise 4 » et « ce
 * caillou banal est lié au personnage » sont des décisions de table, pas des
 * bugs — et `inventory.attuned` est un booléen libre.
 */

const { updateCharacterMock, showToastMock } = vi.hoisted(() => ({
  updateCharacterMock: vi.fn().mockResolvedValue(undefined),
  showToastMock: vi.fn(),
}));

vi.mock('@/features/sheet/use-update-character', () => ({
  useUpdateCharacter: () => ({
    updateCharacter: updateCharacterMock,
    isUpdating: false,
  }),
}));

vi.mock('@/shared/lib/slices/toast-slice', () => ({
  showToast: showToastMock,
}));

function magicItem(overrides: Partial<MagicItem> = {}): MagicItem {
  return {
    id: 'caillou-terne',
    name: { fr: 'Caillou terne', en: 'Dull pebble' },
    category: 'gear',
    rarity: 'common',
    // Le SRD dit : cet objet NE REQUIERT PAS d'harmonisation.
    attunement: false,
    magicDescription: { fr: 'Il ne fait rien de particulier.', en: '' },
    description: null,
    source: 'srd-5.2.1',
    ...overrides,
  } as unknown as MagicItem;
}

function row(attuned = false, content = magicItem()): ResolvedInventoryRow {
  return {
    inventory: {
      contentId: content.id,
      contentScope: 'public',
      qty: 1,
      equipped: false,
      attuned,
      notes: '',
    },
    content,
    isMagic: true,
  };
}

function character(): Character {
  return {
    id: 'c1',
    name: 'Test',
    inventory: {
      items: [row().inventory],
      coins: { cu: 0, ar: 0, el: 0, or: 0, pl: 0 },
      weightCache: 0,
    },
  } as unknown as Character;
}

describe('ItemDetailModal — harmonisation', () => {
  beforeEach(() => {
    updateCharacterMock.mockClear();
    showToastMock.mockClear();
  });

  it('propose la liaison sur un objet magique qui ne la requiert PAS', () => {
    render(
      <ItemDetailModal
        character={character()}
        row={row()}
        attunedCount={0}
        readOnly={false}
        onClose={() => undefined}
      />,
    );
    expect(screen.getByRole('button', { name: /Lier/i })).toBeInTheDocument();
  });

  it('lie effectivement l’objet', async () => {
    const user = userEvent.setup();
    render(
      <ItemDetailModal
        character={character()}
        row={row()}
        attunedCount={0}
        readOnly={false}
        onClose={() => undefined}
      />,
    );
    await user.click(screen.getByRole('button', { name: /Lier/i }));
    expect(updateCharacterMock).toHaveBeenCalledWith({
      inventory: expect.objectContaining({
        items: [expect.objectContaining({ attuned: true })],
      }),
    });
  });

  it('AVERTIT au-delà de 3 liaisons, mais lie quand même', async () => {
    // Le refus dur rendait la variante « 4 objets » injouable, sans recours.
    const user = userEvent.setup();
    render(
      <ItemDetailModal
        character={character()}
        row={row()}
        attunedCount={3}
        readOnly={false}
        onClose={() => undefined}
      />,
    );
    await user.click(screen.getByRole('button', { name: /Lier/i }));
    expect(showToastMock).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'fumble' }),
    );
    expect(updateCharacterMock).toHaveBeenCalledWith({
      inventory: expect.objectContaining({
        items: [expect.objectContaining({ attuned: true })],
      }),
    });
  });

  it('délier reste possible au-delà du plafond, sans avertissement', async () => {
    const user = userEvent.setup();
    render(
      <ItemDetailModal
        character={character()}
        row={row(true)}
        attunedCount={4}
        readOnly={false}
        onClose={() => undefined}
      />,
    );
    await user.click(screen.getByRole('button', { name: /Délier/i }));
    expect(showToastMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'fumble' }),
    );
    expect(updateCharacterMock).toHaveBeenCalledWith({
      inventory: expect.objectContaining({
        items: [expect.objectContaining({ attuned: false })],
      }),
    });
  });
});
