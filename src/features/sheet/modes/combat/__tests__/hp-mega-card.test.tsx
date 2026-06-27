import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Character } from '@/shared/types/character';

import { HpMegaCard } from '../hp-mega-card';

/**
 * Carte Vitalité — UAT 2026-06-25 : le « fond de couleur qui fait barre de vie »
 * a été retiré au profit d'une pastille d'état (point + mot). Ces tests figent :
 *  1. l'IDENTITÉ du libellé d'état par ratio de PV (Sain/Blessé/Critique/Inconscient) ;
 *  2. l'absence de toute jauge de fond (anti-régression « rouge avant vert » :
 *     ces assertions échouaient sur l'ancien code à fond dégradé pleine largeur).
 */

vi.mock('@/features/sheet/use-update-character', () => ({
  useUpdateCharacter: () => ({
    updateCharacter: vi.fn().mockResolvedValue(undefined),
    isUpdating: false,
    error: null,
  }),
}));

function buildCharacter(hp: Character['hp']): Character {
  return {
    id: 'test',
    name: 'Test',
    status: 'alive',
    classes: [],
    totalLevel: 1,
    primaryClassId: 'fighter',
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
    backgroundId: 'soldier',
    extraLanguages: [],
    experience: 0,
    alignment: 'N',
    abilities: { for: 16, dex: 12, con: 14, int: 10, sag: 10, cha: 10 },
    saves: { for: true, dex: false, con: true, int: false, sag: false, cha: false },
    skills: {},
    hp,
    ac: 13,
    speed: 30,
    initiative: 1,
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
    portrait: { type: 'letter', value: 'T' },
    schemaVersion: 2,
    createdAt: null as never,
    updatedAt: null as never,
    updatedBy: 'test-uid',
  };
}

describe('<HpMegaCard> — pastille d\'état', () => {
  it.each([
    { current: 24, max: 24, label: 'Sain' },
    { current: 18, max: 24, label: 'Sain' }, // 75 %
    { current: 10, max: 24, label: 'Blessé' }, // ~42 %
    { current: 4, max: 24, label: 'Critique' }, // ~17 %
    { current: 0, max: 24, label: 'Inconscient' }, // 0 PV → condition SRD FR
  ])('$current/$max PV → pastille « $label »', ({ current, max, label }) => {
    render(<HpMegaCard character={buildCharacter({ current, max, temp: 0 })} readOnly={false} />);
    expect(screen.getByText(label)).toBeInTheDocument();
    // Le nombre courant reste affiché tel quel.
    expect(screen.getByText(String(current))).toBeInTheDocument();
  });

  it('affiche les PV temporaires quand temp > 0, les masque sinon', () => {
    const { rerender, queryByText } = render(
      <HpMegaCard character={buildCharacter({ current: 12, max: 24, temp: 6 })} readOnly={false} />,
    );
    expect(queryByText('PV temp.')).toBeInTheDocument();
    rerender(
      <HpMegaCard character={buildCharacter({ current: 12, max: 24, temp: 0 })} readOnly={false} />,
    );
    expect(queryByText('PV temp.')).not.toBeInTheDocument();
  });
});

describe('<HpMegaCard> — infobulles explicites des contrôles', () => {
  it('les boutons − / + portent une infobulle qui explique le geste (appui long)', () => {
    render(<HpMegaCard character={buildCharacter({ current: 12, max: 24, temp: 0 })} readOnly={false} />);
    const tips = screen.getAllByRole('tooltip', { hidden: true }).map((el) => el.textContent ?? '');
    expect(tips).toContain('Subir 1 dégât — appui long pour saisir un montant');
    expect(tips).toContain('Soigner de 1 PV — appui long pour saisir un montant');
  });

  it('le bouton « + PV temp. » explique le tampon avant les PV', () => {
    render(<HpMegaCard character={buildCharacter({ current: 12, max: 24, temp: 0 })} readOnly={false} />);
    const tips = screen.getAllByRole('tooltip', { hidden: true }).map((el) => el.textContent ?? '');
    expect(tips).toContain('Ajouter des PV temporaires (tampon avant les PV)');
  });
});

describe('<HpMegaCard> — anti-régression « barre de vie »', () => {
  it('ne contient aucune jauge de fond (ni largeur en %, ni dégradé horizontal)', () => {
    const { container } = render(
      <HpMegaCard character={buildCharacter({ current: 24, max: 24, temp: 0 })} readOnly={false} />,
    );
    // L'ancienne jauge pilotait sa largeur en inline-style (`style={{ width }}`).
    const widthDriven = container.querySelectorAll('[style*="width"]');
    expect(widthDriven.length).toBe(0);
    // L'ancien fond était un `bg-gradient-to-r` opacité 40 % derrière le texte.
    expect(container.querySelector('.bg-gradient-to-r')).toBeNull();
  });
});
