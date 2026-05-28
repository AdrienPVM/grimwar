import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Character } from '@/shared/types/character';
import type { Spell } from '@/shared/types/content';

import { SpellDetailModal } from '../spell-detail-modal';

import spellsBundle from '../../../../../../public/data/spells.json';

/**
 * Plan D1 — la section structurée « Dégâts » de la modale détail rend
 * la formule canonique, le label de type FR, le mode de résolution et le
 * scaling (slot upcast pour L1+, cantrip char-level pour L0).
 *
 * Trois invariants couverts :
 *   cat. 4 — Formule chiffrée (Fireball = 8d6 ; Fireball L5 = 8d6 + 2d6).
 *   cat. 2 — Identité du label de type (« feu » FR pour Fire, « force » pour Force).
 *   cat. 6 — Sorts sans damage[] : aucun bloc Dégâts (gardé contre faux signal).
 */

interface SpellBundleEntry extends Omit<Spell, 'summonedCreatureIds'> {
  summonedCreatureIds?: string[];
}

function spellFromBundle(id: string): Spell {
  const found = (spellsBundle as SpellBundleEntry[]).find((s) => s.id === id);
  if (!found) throw new Error(`[damage-test] sort ${id} absent du bundle`);
  return found as Spell;
}

vi.mock('@/shared/hooks/use-content', () => ({
  // Le test ne touche pas aux statblocks invoqués → renvoyer un bundle vide.
  useContent: () => ({ data: [], isLoading: false, error: null }),
}));
vi.mock('@/features/dice/use-dice', () => ({
  useDice: () => ({ rollDamageWithMode: vi.fn() }),
}));

function makeCharacter(opts: { totalLevel: number; slotsFilled?: boolean } = { totalLevel: 5 }): Character {
  const slots: Record<string, { max: number; current: number }> = opts.slotsFilled
    ? {
        '1': { max: 4, current: 4 },
        '2': { max: 3, current: 3 },
        '3': { max: 2, current: 2 },
        '4': { max: 1, current: 1 },
        '5': { max: 1, current: 1 },
      }
    : { '3': { max: 2, current: 2 }, '5': { max: 1, current: 1 } };
  return {
    id: 'test',
    name: 'Test',
    status: 'alive',
    classes: [
      {
        classId: 'wizard',
        subclassId: null,
        level: opts.totalLevel,
        clericDivineOrder: null,
        druidPrimalOrder: null,
        fighterFightingStyle: null,
        weaponMasteries: [],
        expertiseSkills: [],
        eldritchInvocations: [],
        wizardSpellbookL1: [],
      },
    ],
    totalLevel: opts.totalLevel,
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
    hp: { current: 22, max: 22, temp: 0 },
    ac: 12,
    speed: 30,
    initiative: 2,
    hitDice: [{ classId: 'wizard', current: opts.totalLevel, max: opts.totalLevel, die: 'd6' }],
    deathSaves: { success: 0, fail: 0 },
    conditions: [],
    inspiration: false,
    exhaustion: 0,
    currentConcentration: null,
    classResources: {},
    spellSlots: slots,
    preparedSpells: {},
    knownSpells: { wizard: ['boule-de-feu', 'trait-de-feu', 'projectile-magique'] },
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
}

function renderModal(character: Character, spell: Spell) {
  return render(
    <SpellDetailModal
      character={character}
      spell={spell}
      spellcastingClasses={[
        { classId: 'wizard', name: 'Magicien', level: character.totalLevel, ability: 'int', progression: 'full' },
      ]}
      ancestrySource={null}
        pactTomeSource={null}
      readOnly={false}
      onClose={() => undefined}
    />,
  );
}

describe('SpellDetailModal — section Dégâts canoniques (plan D1)', () => {
  it('Boule de feu L3 (au niveau de base) : 8d6 feu, jet de sauvegarde', () => {
    const character = makeCharacter({ totalLevel: 5 });
    renderModal(character, spellFromBundle('boule-de-feu'));

    const card = screen.getByTestId('spell-damage-card');
    expect(within(card).getByTestId('spell-damage-formula')).toHaveTextContent('8d6');
    expect(within(card).getByText('feu')).toBeInTheDocument();
    expect(within(card).getByText('Jet de sauvegarde')).toBeInTheDocument();
  });

  it('Boule de feu upcast L5 (+2) : 8d6 + 2d6 feu', () => {
    // L5 fighter caster avec slot L5 dispo — la modale sélectionne L5 par
    // défaut si dispo (ordre croissant).
    const character = makeCharacter({ totalLevel: 9, slotsFilled: true });
    // Force le slot L5 en marquant L3+L4 indisponibles.
    character.spellSlots = {
      '5': { max: 1, current: 1 },
    };
    renderModal(character, spellFromBundle('boule-de-feu'));
    const card = screen.getByTestId('spell-damage-card');
    expect(within(card).getByTestId('spell-damage-formula')).toHaveTextContent('8d6 + 2d6');
  });

  it('Trait de feu cantrip à L1-4 : 1d10 feu', () => {
    const character = makeCharacter({ totalLevel: 1 });
    renderModal(character, spellFromBundle('trait-de-feu'));
    const card = screen.getByTestId('spell-damage-card');
    expect(within(card).getByTestId('spell-damage-formula')).toHaveTextContent('1d10');
    expect(within(card).getByText("Jet d'attaque")).toBeInTheDocument();
  });

  it('Trait de feu cantrip à L5 : 2d10 feu (char-level scaling)', () => {
    const character = makeCharacter({ totalLevel: 5 });
    renderModal(character, spellFromBundle('trait-de-feu'));
    const card = screen.getByTestId('spell-damage-card');
    expect(within(card).getByTestId('spell-damage-formula')).toHaveTextContent('2d10');
  });

  it('Trait de feu cantrip à L11 : 3d10 feu', () => {
    const character = makeCharacter({ totalLevel: 11 });
    renderModal(character, spellFromBundle('trait-de-feu'));
    const card = screen.getByTestId('spell-damage-card');
    expect(within(card).getByTestId('spell-damage-formula')).toHaveTextContent('3d10');
  });

  it('Trait de feu cantrip à L17 : 4d10 feu (tier 4)', () => {
    const character = makeCharacter({ totalLevel: 17 });
    renderModal(character, spellFromBundle('trait-de-feu'));
    const card = screen.getByTestId('spell-damage-card');
    expect(within(card).getByTestId('spell-damage-formula')).toHaveTextContent('4d10');
  });

  it('Projectile magique : 1d4+1 force, touche automatique, condition décrite', () => {
    const character = makeCharacter({ totalLevel: 5 });
    renderModal(character, spellFromBundle('projectile-magique'));
    const card = screen.getByTestId('spell-damage-card');
    expect(within(card).getByTestId('spell-damage-formula')).toHaveTextContent('1d4+1');
    expect(within(card).getByText('force')).toBeInTheDocument();
    expect(within(card).getByText('Touche automatique')).toBeInTheDocument();
    // La condition descriptive doit apparaître dans la modale (3 projectiles).
    expect(within(card).getByText(/3 projectiles/i)).toBeInTheDocument();
  });

  it('Cat. 6 — Sort sans damage[] : aucune carte Dégâts (sort utilitaire)', () => {
    // « alarme » est un sort utilitaire sans damage[].
    const character = makeCharacter({ totalLevel: 5 });
    renderModal(character, spellFromBundle('alarme'));
    expect(screen.queryByTestId('spell-damage-card')).not.toBeInTheDocument();
  });
});
