import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useActiveCampaignStore } from '@/shared/lib/slices/active-campaign-slice';
import { DEFAULT_CAMPAIGN_SETTINGS } from '@/shared/types/campaign';
import type { Character } from '@/shared/types/character';

import { CombatMode } from '../combat-mode';
import { PermissionProvider, type PermissionContextValue } from '../../permissions-context';

import classesBundle from '../../../../../public/data/classes.json';

/**
 * M1 — les variantes de la TABLE atteignent la fiche.
 *
 * Le mur d'origine : `CombatMode` montait les deux boutons de repos SANS prop
 * `variants`, donc `applyLongRest` recevait toujours `NO_VARIANTS`. Régler
 * « guérison lente » sur la campagne n'avait strictement aucun effet à l'écran.
 *
 * On observe l'effet USER-VISIBLE (la note de variante sous le bouton), pas la
 * prop : un test qui asserterait la prop resterait vert si la note disparaissait.
 */

vi.mock('@/shared/hooks/use-content', () => ({
  useContent: (type: string) =>
    type === 'classes'
      ? { data: classesBundle, isLoading: false, error: null }
      : { data: [], isLoading: false, error: null },
}));

vi.mock('@/features/sheet/use-update-character', () => ({
  useUpdateCharacter: () => ({
    updateCharacter: vi.fn().mockResolvedValue(undefined),
    isUpdating: false,
    error: null,
  }),
}));

const ownerCtx: PermissionContextValue = {
  canEdit: true,
  isDM: false,
  isDMEdit: false,
  lockedFields: [],
};

function buildCharacter(): Character {
  return {
    id: 'cm',
    name: 'Cm',
    status: 'alive',
    classes: [
      {
        classId: 'fighter',
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
    primaryClassId: 'fighter',
    ancestryId: 'human',
    ancestrySubChoices: {},
    backgroundId: 'soldier',
    abilities: { str: 14, dex: 12, con: 14, int: 10, wis: 10, cha: 10 },
    hp: { current: 10, max: 28, temp: 0 },
    hitDice: [{ die: 10, current: 3, max: 3 }],
    conditions: [],
    exhaustion: 0,
    inspiration: false,
    classResources: {},
    spellSlots: {},
    knownSpells: {},
    preparedSpells: {},
    inventory: {
      items: [],
      coins: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
      weightCache: 0,
    },
    featureUsage: {},
    proficiencies: { skills: [], saves: [], languages: [], tools: [], armor: [], weapons: [] },
    extraProficiencies: [],
    personality: { trait: '', ideal: '', bond: '', flaw: '', backstory: '' },
    deathSaves: { successes: 0, failures: 0 },
    homeCampaignId: 'camp-1',
    experience: 0,
    schemaVersion: 2,
  } as unknown as Character;
}

function renderCombat(): void {
  render(
    <PermissionProvider value={ownerCtx}>
      <CombatMode character={buildCharacter()} />
    </PermissionProvider>,
  );
}

beforeEach(() => {
  useActiveCampaignStore.getState().clearActiveCampaign();
});
afterEach(() => {
  useActiveCampaignStore.getState().clearActiveCampaign();
});

describe('CombatMode — variantes de la table (M1)', () => {
  it('sans campagne, aucune note de variante (règles SRD standard)', () => {
    renderCombat();
    expect(screen.queryByText(/Guérison naturelle lente/i)).toBeNull();
  });

  it('une table en guérison lente l’annonce sous le repos long', () => {
    const store = useActiveCampaignStore.getState();
    store.setActiveCampaign('camp-1');
    store.setActiveCampaignSettings({
      ...DEFAULT_CAMPAIGN_SETTINGS,
      variants: {
        featAtLevel1: false,
        flanking: false,
        slowHealing: true,
        grittyRealism: false,
      },
    });
    renderCombat();
    expect(screen.getByText(/Guérison naturelle lente/i)).toBeInTheDocument();
  });

  it('une table en réalisme rugueux l’annonce aussi', () => {
    const store = useActiveCampaignStore.getState();
    store.setActiveCampaign('camp-1');
    store.setActiveCampaignSettings({
      ...DEFAULT_CAMPAIGN_SETTINGS,
      variants: {
        featAtLevel1: false,
        flanking: false,
        slowHealing: false,
        grittyRealism: true,
      },
    });
    renderCombat();
    // Le réalisme rugueux note une durée sur CHACUN des deux repos.
    expect(screen.getAllByText(/Réalisme rugueux/i).length).toBeGreaterThan(0);
  });
});
