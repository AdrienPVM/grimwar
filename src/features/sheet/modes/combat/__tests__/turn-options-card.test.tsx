import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { Character } from '@/shared/types/character';

import { TurnOptionsCard } from '../turn-options-card';

import spellsBundle from '../../../../../../public/data/spells.json';

/**
 * Carte « En dehors de ton action » — Cat. 2 (identité : les noms affichés sont
 * EXACTEMENT les `name.fr` du bundle) + Cat. 6 (cas-limite : un sort à l'action
 * connu du personnage ne doit PAS remonter ici, sans quoi la carte recopierait
 * le mode Magie et noierait ce qu'elle sert à faire ressortir).
 *
 * Valeurs de référence figées contre le bundle réel :
 *  - `marque-du-chasseur` → « Marque du chasseur », action Bonus ;
 *  - `bouclier`           → « Bouclier », Réaction ;
 *  - `boule-de-feu`       → sort à l'action, donc exclu.
 */

vi.mock('@/shared/hooks/use-content', () => ({
  useContent: (type: string) =>
    type === 'spells'
      ? { data: spellsBundle, isLoading: false, error: null }
      : { data: [], isLoading: false, error: null },
}));

function buildCharacter(spells: Record<string, string[]>): Character {
  return {
    id: 'c1',
    name: 'Tessa',
    status: 'alive',
    classes: [],
    totalLevel: 5,
    primaryClassId: 'ranger',
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
    backgroundId: 'outlander',
    extraLanguages: [],
    experience: 0,
    alignment: 'N',
    abilities: { for: 12, dex: 16, con: 14, int: 10, sag: 14, cha: 10 },
    saves: { for: true, dex: true, con: false, int: false, sag: false, cha: false },
    skills: {},
    hp: { current: 30, max: 30, temp: 0 },
    ac: 15,
    speed: 30,
    initiative: 3,
    hitDice: [],
    deathSaves: { success: 0, fail: 0 },
    conditions: [],
    inspiration: false,
    exhaustion: 0,
    currentConcentration: null,
    classResources: {},
    spellSlots: {},
    preparedSpells: {},
    knownSpells: spells,
    spellcastingAbility: {},
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
    updatedBy: 'uid',
  };
}

describe('<TurnOptionsCard>', () => {
  it("range un sort d'action Bonus sous « Action Bonus », au nom exact du bundle", () => {
    render(
      <TurnOptionsCard
        character={buildCharacter({ ranger: ['marque-du-chasseur'] })}
        onOpenMagie={() => undefined}
      />,
    );
    expect(screen.getByRole('button', { name: 'Marque du chasseur' })).toBeInTheDocument();
  });

  it('range un sort de Réaction sous « Réaction »', () => {
    render(
      <TurnOptionsCard
        character={buildCharacter({ wizard: ['bouclier'] })}
        onOpenMagie={() => undefined}
      />,
    );
    expect(screen.getByRole('button', { name: 'Bouclier' })).toBeInTheDocument();
  });

  it("n'affiche PAS un sort à l'action", () => {
    // Le cœur du parti pris : lister les 257 sorts à l'action recopierait le
    // mode Magie et noierait la part rare, qui est tout l'objet de la carte.
    render(
      <TurnOptionsCard
        character={buildCharacter({ wizard: ['boule-de-feu', 'bouclier'] })}
        onOpenMagie={() => undefined}
      />,
    );
    expect(screen.queryByText('Boule de feu')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bouclier' })).toBeInTheDocument();
  });

  it('rappelle toujours l’attaque d’Opportunité, même sans aucun sort', () => {
    // Terme du SRD FR 5.2.1. C'est la Réaction que tout le monde possède, et
    // celle qu'on oublie le plus — elle ne dépend d'aucune donnée de perso.
    render(<TurnOptionsCard character={buildCharacter({})} onOpenMagie={() => undefined} />);
    expect(screen.getByText('Attaque d’Opportunité')).toBeInTheDocument();
  });

  it("annonce l'absence d'action Bonus plutôt que de laisser un vide", () => {
    render(<TurnOptionsCard character={buildCharacter({})} onOpenMagie={() => undefined} />);
    expect(screen.getByText('Aucun sort d’action Bonus connu.')).toBeInTheDocument();
  });

  it('renvoie vers le mode Magie, où le sort se lance réellement', async () => {
    const user = userEvent.setup();
    const onOpenMagie = vi.fn();
    render(
      <TurnOptionsCard
        character={buildCharacter({ ranger: ['marque-du-chasseur'] })}
        onOpenMagie={onOpenMagie}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Marque du chasseur' }));
    expect(onOpenMagie).toHaveBeenCalledTimes(1);
  });

  it("laisse l'attaque d'Opportunité inerte — c'est une règle, pas un sort", async () => {
    const user = userEvent.setup();
    const onOpenMagie = vi.fn();
    render(<TurnOptionsCard character={buildCharacter({})} onOpenMagie={onOpenMagie} />);
    const entry = screen.getByText('Attaque d’Opportunité');
    expect(entry.tagName).not.toBe('BUTTON');
    await user.click(entry);
    expect(onOpenMagie).not.toHaveBeenCalled();
  });

  it('couvre aussi les sorts préparés, pas seulement les sorts connus', () => {
    render(
      <TurnOptionsCard
        character={{
          ...buildCharacter({}),
          preparedSpells: { cleric: ['mot-de-guerison'] },
        }}
        onOpenMagie={() => undefined}
      />,
    );
    expect(screen.getByRole('button', { name: 'Mot de guérison' })).toBeInTheDocument();
  });
});
