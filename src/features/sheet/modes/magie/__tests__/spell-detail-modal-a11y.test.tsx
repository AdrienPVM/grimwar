import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Character } from '@/shared/types/character';
import type { Spell } from '@/shared/types/content';

import { SpellDetailModal } from '../spell-detail-modal';

import spellsBundle from '../../../../../../public/data/spells.json';

/**
 * Plan 13.9 commit 4d — accessibilité de la `SpellDetailModal` (rouge-puis-vert).
 *
 * Question d'Adrien : « la modale de sort doit se fermer à Échap, au clic
 * backdrop, et vivre dans un portal — comme `<DetailModal>` partagée ».
 *
 * Avant la migration, `SpellDetailModal` rend un `<div fixed inset-0>` dans
 * l'arbre du parent SANS portal, SANS handler Échap, SANS handler backdrop,
 * SANS body lock. Ces tests sont écrits pour échouer sur ce comportement et
 * passer une fois `<SpellDetailModal>` migrée sur `<DetailModal>`.
 *
 * Source de vérité = bundle SRD (`public/data/spells.json`) — on prend un sort
 * réel (`bouclier`) pour rester aligné avec la catégorie 2 de la testing
 * policy (identité, pas présence).
 */

interface SpellBundleEntry {
  id: string;
  name: { fr: string; en?: string };
  level: number;
  school: string;
  description?: { fr?: string; en?: string };
}

function spellFromBundle(id: string): Spell {
  const found = (spellsBundle as SpellBundleEntry[]).find((s) => s.id === id);
  if (!found) {
    throw new Error(
      `[spell-detail-modal-a11y] sort ${id} absent de spells.json — le bundle a régressé`,
    );
  }
  return found as unknown as Spell;
}

vi.mock('@/shared/hooks/use-content', () => ({
  useContent: () => ({ data: [], isLoading: false, error: null }),
}));
vi.mock('@/features/dice/use-dice', () => ({
  useDice: () => ({
    rollDamageWithMode: vi.fn(),
  }),
}));

const character: Character = {
  id: 'test',
  name: 'Test',
  status: 'alive',
  classes: [
    {
      classId: 'wizard',
      subclassId: null,
      level: 3,
      clericDivineOrder: null,
      druidPrimalOrder: null,
      fighterFightingStyle: null,
      weaponMasteries: [],
      expertiseSkills: [],
      eldritchInvocations: [],
      wizardSpellbookL1: [],
    },
  ],
  totalLevel: 3,
  primaryClassId: 'wizard',
  ancestryId: 'human',
  ancestrySubChoices: {
    dragonAncestry: null,
    tieflingLegacy: null,
    elfLineage: null,
    gnomeLineage: null,
    goliathAncestry: null,
    ancestryCastingAbility: null,
    ancestryExtraSkill: null,
    ancestrySize: null,
  },
  backgroundId: 'sage',
  extraLanguages: [],
  experience: 0,
  alignment: 'N',
  abilities: { for: 8, dex: 14, con: 12, int: 16, sag: 13, cha: 10 },
  saves: { for: false, dex: false, con: false, int: true, sag: true, cha: false },
  skills: {},
  hp: { current: 18, max: 18, temp: 0 },
  ac: 12,
  speed: 30,
  initiative: 2,
  hitDice: [{ classId: 'wizard', current: 3, max: 3, die: 'd6' }],
  deathSaves: { success: 0, fail: 0 },
  conditions: [],
  inspiration: false,
  exhaustion: 0,
  currentConcentration: null,
  classResources: {},
  spellSlots: { '1': { max: 4, current: 4 }, '2': { max: 2, current: 2 } },
  preparedSpells: {},
  knownSpells: { wizard: ['bouclier'] },
  spellcastingAbility: { wizard: 'int' },
  inventory: { items: [], coins: { cu: 0, ar: 0, el: 0, or: 0, pl: 0 }, weightCache: 0 },
  personality: { trait: '', ideal: '', bond: '', flaw: '', backstory: '' },
  featureUsage: {},
  extraProficiencies: { armor: [], weapons: [], tools: [], languages: [] },
  presentInCampaigns: [],
  homeCampaignId: null,
  stats: { totalRolls: 0, totalD20Sum: 0, crits: 0, fumbles: 0, skillUses: {} },
  portrait: { type: 'letter', value: 'T' },
  schemaVersion: 2,
  createdAt: null as never,
  updatedAt: null as never,
  updatedBy: 'test-uid',
};

function renderModal(onClose = vi.fn()): { onClose: ReturnType<typeof vi.fn> } {
  const spell = spellFromBundle('bouclier');
  render(
    <div data-testid="parent-tree">
      <SpellDetailModal
        character={character}
        spell={spell}
        spellcastingClasses={[
          { classId: 'wizard', name: 'Magicien', level: 3, ability: 'int', progression: 'full' },
        ]}
        ancestrySource={null}
        pactTomeSource={null}
        readOnly={false}
        onClose={onClose}
      />
    </div>,
  );
  return { onClose };
}

describe('SpellDetailModal — a11y (Échap + backdrop + portal + body lock) [plan 13.9 commit 4d]', () => {
  it('Échap ferme la modale (appelle onClose)', () => {
    const { onClose } = renderModal();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Clic sur le backdrop (hors panneau) ferme la modale', () => {
    const { onClose } = renderModal();
    const dialog = screen.getByRole('dialog');
    fireEvent.mouseDown(dialog);
    fireEvent.click(dialog);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Clic à l\'intérieur du panneau NE ferme PAS', () => {
    const { onClose } = renderModal();
    const dialog = screen.getByRole('dialog');
    const heading = dialog.querySelector('h2');
    expect(heading).not.toBeNull();
    fireEvent.mouseDown(heading!);
    fireEvent.click(heading!);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('rend via createPortal hors de l\'arbre du parent (cible = document.body)', () => {
    renderModal();
    const dialog = screen.getByRole('dialog');
    const parent = screen.getByTestId('parent-tree');
    // L'arbre du parent ne contient PAS la modale (portal).
    expect(parent.contains(dialog)).toBe(false);
    // En revanche, document.body la contient.
    expect(document.body.contains(dialog)).toBe(true);
  });

  it('verrouille le scroll de la page (body.overflow = hidden) tant que la modale est rendue', () => {
    // Pré-condition : body.overflow vide au départ.
    document.body.style.overflow = '';
    const { onClose: _ } = renderModal();
    void _;
    expect(document.body.style.overflow).toBe('hidden');
  });
});
