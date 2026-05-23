import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { Character } from '@/shared/types/character';

import { StatusStrip } from '../status-strip';

/**
 * Plan 13.14b — D19/D20, gate de wiring de prop.
 *
 * `StatusStrip` lisait `character.ac` directement, ce qui rendait toute
 * dérivation d'inventaire (acFromArmor + Defense +1) invisible à l'écran —
 * exactement la dette D20. La prop `displayedAc` route maintenant la valeur
 * combinée. Ces tests blindent le contrat : le cell CA reflète la prop, pas
 * le champ raw du personnage. Une régression qui rebrancherait `character.ac`
 * sur ce cell échouerait ici.
 */

function buildCharacter(overrides: Partial<Character> = {}): Character {
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
    hp: { current: 12, max: 12, temp: 0 },
    ac: 11,
    speed: 9,
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
    ...overrides,
  };
}

/**
 * Le cell CA est la 2e cellule du `aria-label="…statusStrip…"`. On le résout
 * via le label "CA" (cf. `i18n.fr.sheet.stat.ac`) puis on lit la valeur de
 * son parent — robuste à un repositionnement éventuel.
 */
function readAcCell(): string {
  const acLabel = screen.getByText('CA');
  const cell = acLabel.closest('div');
  if (!cell) throw new Error('CA cell parent introuvable');
  // Le cell contient `<span label>CA</span>` puis `<span value>…</span>`.
  const valueSpans = within(cell).getAllByText(
    (_, el) =>
      el?.tagName === 'SPAN' &&
      el.parentElement === cell &&
      el.textContent !== 'CA' &&
      !!el.textContent?.match(/^\d+$/),
  );
  const [valueSpan] = valueSpans;
  if (!valueSpan) throw new Error('CA value span introuvable');
  return valueSpan.textContent ?? '';
}

describe('<StatusStrip>', () => {
  it('affiche displayedAc=17 même quand character.ac=11 (cas Guerrier·defense + cotte)', () => {
    // Le test capture le bug D20 : avant le fix, StatusStrip rendait
    // character.ac=11 alors que la CA effective vaut 17.
    render(<StatusStrip character={buildCharacter({ ac: 11 })} displayedAc={17} />);
    expect(readAcCell()).toBe('17');
  });

  it('affiche displayedAc=12 en valeur désarmée (cas Guerrier·defense sans armure)', () => {
    render(<StatusStrip character={buildCharacter({ ac: 12 })} displayedAc={12} />);
    expect(readAcCell()).toBe('12');
  });

  it('affiche displayedAc=16 (cas Magicien + armure, pas de Defense)', () => {
    // character.ac=12 (désarmé wizard), displayedAc=16 (armure portée sans bonus).
    render(<StatusStrip character={buildCharacter({ ac: 12 })} displayedAc={16} />);
    expect(readAcCell()).toBe('16');
  });

  it('ne lit jamais character.ac pour le cell CA (catch régression de wiring)', () => {
    // Si quelqu'un re-câblait par erreur le cell sur character.ac, ce test
    // verrait `99` à la place de `42`.
    render(<StatusStrip character={buildCharacter({ ac: 99 })} displayedAc={42} />);
    expect(readAcCell()).toBe('42');
    expect(screen.queryByText('99')).toBeNull();
  });
});
