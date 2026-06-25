import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { Character } from '@/shared/types/character';

import { OriginFeatCard } from '../origin-feat-card';
import { expectNoForbiddenEnglish } from '../../../../../../tests/helpers/i18n-guard';

import backgroundsBundle from '../../../../../../public/data/backgrounds.json';

/**
 * Carte « Don d'origines » — Cat. 2 (identité, pas présence) + Cat. 3 (fidélité
 * bundle figée). Le don affiché vient de `backgrounds.json[id].feature` et doit
 * correspondre EXACTEMENT au champ `name.fr` / `description.fr` de l'entrée.
 *
 * Source = bundle réel (pas de mock de contenu), comme la carte Langues.
 */

vi.mock('@/shared/hooks/use-content', () => ({
  useContent: (type: string) => {
    if (type === 'backgrounds') {
      return { data: backgroundsBundle, isLoading: false, error: null };
    }
    return { data: [], isLoading: false, error: null };
  },
}));

function buildCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: 'feat',
    name: 'Feat',
    status: 'alive',
    classes: [],
    totalLevel: 1,
    primaryClassId: 'cleric',
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
    backgroundId: 'acolyte',
    extraLanguages: [],
    experience: 0,
    alignment: 'N',
    abilities: { for: 10, dex: 14, con: 10, int: 10, sag: 12, cha: 10 },
    saves: { for: false, dex: false, con: false, int: false, sag: true, cha: true },
    skills: {},
    hp: { current: 8, max: 8, temp: 0 },
    ac: 12,
    speed: 9,
    initiative: 2,
    hitDice: [],
    deathSaves: { success: 0, fail: 0 },
    conditions: [],
    inspiration: false,
    exhaustion: 0,
    currentConcentration: null,
    classResources: {},
    spellSlots: {},
    preparedSpells: {},
    knownSpells: {},
    spellcastingAbility: {},
    inventory: { items: [], coins: { cu: 0, ar: 0, el: 0, or: 0, pl: 0 }, weightCache: 0 },
    personality: { trait: '', ideal: '', bond: '', flaw: '', backstory: '' },
    featureUsage: {},
    extraProficiencies: { armor: [], weapons: [], tools: [], languages: [] },
    presentInCampaigns: [],
    homeCampaignId: null,
    stats: { totalRolls: 0, totalD20Sum: 0, crits: 0, fumbles: 0, skillUses: {} },
    portrait: { type: 'letter', value: 'F' },
    schemaVersion: 2,
    createdAt: null as never,
    updatedAt: null as never,
    updatedBy: 'uid',
    ...overrides,
  };
}

/** Entrée bundle réelle, pour figer la valeur de référence (Cat. 3). */
const acolyte = (backgroundsBundle as Array<{ id: string; feature: { name: { fr: string }; description: { fr: string } } }>).find(
  (b) => b.id === 'acolyte',
)!;

describe('<OriginFeatCard>', () => {
  it('affiche le don de l\'historique À L\'IDENTIQUE du bundle (Cat. 2/3)', () => {
    render(<OriginFeatCard character={buildCharacter()} />);
    expect(screen.getByText("Don d'origines")).toBeInTheDocument();
    // Identité, pas présence : le nom exact du bundle, pas « contient magie ».
    expect(acolyte.feature.name.fr).toBe('Don : Initié à la magie (Clerc)');
    expect(screen.getByText(acolyte.feature.name.fr)).toBeInTheDocument();
  });

  it('ouvre une modale détail montrant la description exacte du don', async () => {
    const user = userEvent.setup();
    render(<OriginFeatCard character={buildCharacter()} />);
    await user.click(screen.getByRole('button', { name: /Don d'origines : Don : Initié/ }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    // La description du bundle apparaît à l'identique dans la modale.
    const inDialog = screen.getAllByText(acolyte.feature.description.fr);
    expect(inDialog.length).toBeGreaterThan(0);
  });

  it('ne rend rien si l\'historique est introuvable', () => {
    const { container } = render(
      <OriginFeatCard character={buildCharacter({ backgroundId: 'inexistant' })} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('ne laisse fuir aucun anglais interdit dans le rendu FR', () => {
    const { container } = render(<OriginFeatCard character={buildCharacter()} />);
    expectNoForbiddenEnglish(container.textContent ?? '', 'origin-feat-card');
  });
});
