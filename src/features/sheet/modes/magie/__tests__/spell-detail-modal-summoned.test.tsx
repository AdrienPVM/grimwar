import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Character } from '@/shared/types/character';
import type { Spell, SummonedCreatureStatBlock } from '@/shared/types/content';

import { SpellDetailModal } from '../spell-detail-modal';

import spellsBundle from '../../../../../../public/data/spells.json';
import summonedBundle from '../../../../../../public/data/summoned-creatures.json';

/**
 * Plan D14 — la modale détail d'un sort qui invoque une créature rend
 * proprement le statblock (cat. 2 — identité du contenu). Vérifie sur les
 * 4 sorts SRD (Find Steed / Animate Objects / Giant Insect / Summon Dragon)
 * que (a) le statblock est rendu, (b) son nom + formule de CA + au moins une
 * action correspondent EXACTEMENT au bundle.
 *
 * Cat. 5 — l'absence de marqueur `[dette D14]` dans le rendu prouve que la
 * dette est levée structurellement, pas seulement masquée.
 */

interface SpellBundleEntry extends Omit<Spell, 'summonedCreatureIds'> {
  summonedCreatureIds?: string[];
}

const D14_SPELLS = [
  { spellId: 'appel-de-destrier', creatureId: 'monture-d-outre-monde' },
  { spellId: 'animation-des-objets', creatureId: 'objet-anime' },
  { spellId: 'insecte-geant', creatureId: 'insecte-geant-invoque' },
  { spellId: 'convocation-de-dragon', creatureId: 'esprit-draconique' },
] as const;

function spellFromBundle(id: string): Spell {
  const found = (spellsBundle as SpellBundleEntry[]).find((s) => s.id === id);
  if (!found) throw new Error(`[summoned-test] sort ${id} absent du bundle`);
  return found as Spell;
}

function creatureFromBundle(id: string): SummonedCreatureStatBlock {
  const found = (summonedBundle as SummonedCreatureStatBlock[]).find((c) => c.id === id);
  if (!found) throw new Error(`[summoned-test] statblock ${id} absent du bundle`);
  return found;
}

// Le hook `useContent` est mocké pour servir le bundle direct (ne pas dépendre
// du runtime Dexie + fetch dans les tests). La data résolue est le bundle réel.
vi.mock('@/shared/hooks/use-content', () => ({
  useContent: () => ({ data: summonedBundle, isLoading: false, error: null }),
}));
vi.mock('@/features/dice/use-dice', () => ({
  useDice: () => ({ rollDamageWithMode: vi.fn() }),
}));

const character: Character = {
  id: 'test',
  name: 'Test',
  status: 'alive',
  classes: [
    {
      classId: 'wizard',
      subclassId: null,
      level: 5,
      clericDivineOrder: null,
      druidPrimalOrder: null,
      fighterFightingStyle: null,
      weaponMasteries: [],
      expertiseSkills: [],
      eldritchInvocations: [],
      wizardSpellbookL1: [],
    },
  ],
  totalLevel: 5,
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
  hitDice: [{ classId: 'wizard', current: 5, max: 5, die: 'd6' }],
  deathSaves: { success: 0, fail: 0 },
  conditions: [],
  inspiration: false,
  exhaustion: 0,
  currentConcentration: null,
  classResources: {},
  spellSlots: {
    '1': { max: 4, current: 4 },
    '2': { max: 3, current: 3 },
    '3': { max: 2, current: 2 },
    '4': { max: 1, current: 1 },
    '5': { max: 1, current: 1 },
  },
  preparedSpells: {},
  knownSpells: { wizard: D14_SPELLS.map((s) => s.spellId) },
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

describe('SpellDetailModal — rendu statblock créature invoquée (plan D14)', () => {
  it.each(D14_SPELLS)(
    'sort $spellId : rend le statblock $creatureId avec nom, CA et 1 action vérifiés contre le bundle',
    ({ spellId, creatureId }) => {
      const spell = spellFromBundle(spellId);
      const creature = creatureFromBundle(creatureId);

      render(
        <SpellDetailModal
          character={character}
          spell={spell}
          spellcastingClasses={[
            { classId: 'wizard', name: 'Magicien', level: 5, ability: 'int', progression: 'full' },
          ]}
          ancestrySource={null}
          readOnly={false}
          onClose={() => undefined}
        />,
      );

      const dialog = screen.getByRole('dialog');
      const statblock = within(dialog).getByTestId('summoned-creature-statblock');
      expect(statblock).toHaveAttribute('data-creature-id', creatureId);

      // Identité : nom EXACT depuis le bundle
      expect(within(statblock).getByText(creature.name.fr)).toBeInTheDocument();

      // Identité : CA EXACTE depuis le bundle (formule texte)
      expect(within(statblock).getByText(creature.acFormula.fr)).toBeInTheDocument();

      // Identité : au moins une action canonique présente
      expect(creature.actions.length).toBeGreaterThan(0);
      const firstAction = creature.actions[0]!;
      // Le nom d'action est suivi d'un point typographique dans le rendu : on
      // matche en flexible — sans dépendre du formatage exact.
      expect(
        within(statblock).getByText((content) => content.includes(firstAction.name.fr)),
      ).toBeInTheDocument();
    },
  );

  it('cat. 5 — aucun marqueur de dette D14 ne fuit dans la modale (régression de la dette levée)', () => {
    const spell = spellFromBundle('appel-de-destrier');
    render(
      <SpellDetailModal
        character={character}
        spell={spell}
        spellcastingClasses={[
          { classId: 'wizard', name: 'Magicien', level: 5, ability: 'int', progression: 'full' },
        ]}
        ancestrySource={null}
        readOnly={false}
        onClose={() => undefined}
      />,
    );
    const dialog = screen.getByRole('dialog');
    // Le marqueur historique « [Profil de la créature invoquée non inclus … D14] »
    // ne doit JAMAIS réapparaître dans le rendu — la dette est levée
    // structurellement.
    expect(within(dialog).queryByText(/dette D14/)).not.toBeInTheDocument();
    expect(
      within(dialog).queryByText(/Profil de la créature invoquée non inclus/),
    ).not.toBeInTheDocument();
  });

  it('cat. 3 — fidélité bundle figée : Esprit draconique stats clés (For 19/+4, CA 14+lvl, breath)', () => {
    const draconic = creatureFromBundle('esprit-draconique');
    expect(draconic.abilities.for).toBe(19);
    expect(draconic.abilities.con).toBe(17);
    expect(draconic.acFormula.fr).toBe('CA 14 + niveau du sort');
    expect(draconic.hpFormula.fr).toBe('PV 50 + 10 par niveau du sort au-delà du 5ᵉ');
    expect(draconic.actions.find((a) => a.name.fr === 'Souffle')).toBeDefined();
    expect(draconic.actions.find((a) => a.name.fr === 'Saignée')).toBeDefined();
  });

  it('cat. 3 — fidélité bundle figée : Monture d\'outre-monde stats clés (CA 10+lvl, Lien vital)', () => {
    const steed = creatureFromBundle('monture-d-outre-monde');
    expect(steed.abilities.for).toBe(18);
    expect(steed.acFormula.fr).toBe('CA 10 + 1 par niveau du sort');
    expect(steed.traits.find((tr) => tr.name.fr === 'Lien vital')).toBeDefined();
    expect(steed.bonusActions.length).toBe(3); // Contact guérisseur + Foulée féerique + Regard fiélon
  });
});
