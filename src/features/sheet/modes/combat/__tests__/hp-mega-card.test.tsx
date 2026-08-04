import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Character } from '@/shared/types/character';

import { HpMegaCard } from '../hp-mega-card';

/**
 * Carte Vitalité — UAT 2026-06-25 : le « fond de couleur qui fait barre de vie »
 * a été retiré au profit d'une pastille d'état (point + mot). Ces tests figent :
 *  1. l'IDENTITÉ du libellé d'état par ratio de PV (Sain/Blessé/Critique/Inconscient) ;
 *  2. l'absence de toute jauge de fond (anti-régression « rouge avant vert » :
 *     ces assertions échouaient sur l'ancien code à fond dégradé pleine largeur).
 */

const updateCharacterMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock('@/features/sheet/use-update-character', () => ({
  useUpdateCharacter: () => ({
    updateCharacter: updateCharacterMock,
    isUpdating: false,
    error: null,
  }),
}));

beforeEach(() => updateCharacterMock.mockClear());

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

  it('les aria-labels des boutons PV utilisent « appui long » (FR), jamais l’anglicisme « long-press »', () => {
    render(<HpMegaCard character={buildCharacter({ current: 12, max: 24, temp: 0 })} readOnly={false} />);
    const minus = screen.getByRole('button', { name: /^Subir 1 dégât/ });
    const plus = screen.getByRole('button', { name: /^Soigner de 1 PV/ });
    expect(minus.getAttribute('aria-label')).toBe(
      'Subir 1 dégât (appui long pour saisir un montant)',
    );
    expect(plus.getAttribute('aria-label')).toBe(
      'Soigner de 1 PV (appui long pour saisir un montant)',
    );
    expect(minus.getAttribute('aria-label')).not.toContain('long-press');
    expect(plus.getAttribute('aria-label')).not.toContain('long-press');
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

/**
 * M15 — le maximum de PV s'édite depuis la fiche.
 *
 * Le mur d'origine : le « / max » était un `<span>` inerte, `hp.max` n'était
 * écrit que par la montée de niveau, et le pad numérique était PLAFONNÉ par lui.
 * Potion de vitalité, don Robuste, « le MJ t'accorde +10 PV max » : inexprimables.
 */
describe('<HpMegaCard> — maximum de PV éditable (M15)', () => {
  function openMaxPad(hp: Character['hp']): void {
    render(<HpMegaCard character={buildCharacter(hp)} readOnly={false} />);
    fireEvent.click(screen.getByRole('button', { name: /Modifier le maximum de PV/ }));
  }

  function typeAmount(digits: string): void {
    for (const d of digits) {
      fireEvent.click(screen.getByRole('button', { name: d }));
    }
    fireEvent.click(screen.getByRole('button', { name: 'Fixer' }));
  }

  it('fixe un nouveau maximum sans toucher aux PV courants', async () => {
    openMaxPad({ current: 12, max: 18, temp: 0 });
    typeAmount('28');
    await waitFor(() => expect(updateCharacterMock).toHaveBeenCalled());
    expect(updateCharacterMock.mock.calls[0]![0]).toEqual({
      hp: { current: 12, max: 28, temp: 0 },
    });
  });

  it('un maximum abaissé sous les PV courants les ramène avec lui', async () => {
    openMaxPad({ current: 24, max: 30, temp: 0 });
    typeAmount('18');
    await waitFor(() => expect(updateCharacterMock).toHaveBeenCalled());
    // Sans ce clamp la fiche afficherait « 24 / 18 ».
    expect(updateCharacterMock.mock.calls[0]![0]).toEqual({
      hp: { current: 18, max: 18, temp: 0 },
    });
  });

  it('le pad du maximum n’est PAS plafonné par le maximum courant', () => {
    openMaxPad({ current: 5, max: 10, temp: 0 });
    for (const d of '45') fireEvent.click(screen.getByRole('button', { name: d }));
    // L'afficheur du pad montre bien 45, pas un clamp à 10.
    expect(screen.getByText('45')).toBeInTheDocument();
  });

  it('en lecture seule, le maximum redevient un simple texte', () => {
    render(<HpMegaCard character={buildCharacter({ current: 0, max: 20, temp: 0 })} readOnly />);
    expect(screen.queryByRole('button', { name: /Modifier le maximum de PV/ })).toBeNull();
    expect(screen.getByText('/ 20')).toBeInTheDocument();
  });
});
