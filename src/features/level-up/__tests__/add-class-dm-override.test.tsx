import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { Character } from '@/shared/types/character';
import type { ClassEntity } from '@/shared/types/content';

/**
 * M25 — « Je t'autorise un niveau de Paladin à 12 en Charisme, c'est justifié. »
 *
 * L'entrée « Ajouter une classe » était CACHÉE quand aucune classe ne passait
 * les prérequis (« un bouton qui ouvrirait une modale vide serait un piège »).
 * Conséquence non voulue : le meneur, qui a l'autorité d'écriture sur la fiche,
 * se heurtait au même mur que le joueur. Le prérequis devient un avertissement
 * de son côté, et reste une porte fermée du côté joueur.
 */

const paladin: ClassEntity = {
  id: 'paladin',
  name: { fr: 'Paladin', en: 'Paladin' },
  description: { fr: '', en: '' },
  hitDie: 'd10',
  primaryAbility: ['for'],
  saveProficiencies: ['sag', 'cha'],
  skillChoices: { count: 2, from: [] },
  armorProficiencies: [],
  weaponProficiencies: [],
  toolProficiencies: [],
  spellcasting: null,
  startingEquipment: { options: [{ items: [], coins: null }] },
  features: [],
  weaponMasteryCount: 0,
  source: 'srd-5.2.1',
  multiclassPrerequisite: {
    combinator: 'and',
    scores: [
      { ability: 'for', minimum: 13 },
      { ability: 'cha', minimum: 13 },
    ],
  },
} as unknown as ClassEntity;

const wizard: ClassEntity = { ...paladin, id: 'wizard', name: { fr: 'Magicien', en: 'Wizard' } };

vi.mock('@/shared/hooks/use-content', () => ({
  useContent: (type: string) => {
    if (type === 'classes') return { data: [paladin, wizard], loading: false, error: null , scopeOf: () => ({ scope: 'public' as const }) };
    return { data: [], loading: false, error: null , scopeOf: () => ({ scope: 'public' as const }) };
  },
}));

import { PermissionProvider } from '@/features/sheet/permissions-context';

import { LevelUpButton } from '../level-up-button';

/** FOR 10 / CHA 12 : sous les deux seuils du Paladin. */
function underqualified(): Character {
  return {
    id: 'pj',
    name: 'X',
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
    backgroundId: 'soldier',
    extraLanguages: [],
    experience: 0,
    alignment: 'N',
    abilities: { for: 10, dex: 12, con: 14, int: 16, sag: 10, cha: 12 },
    saves: { for: false, dex: false, con: false, int: false, sag: false, cha: false },
    skills: {},
    hp: { current: 18, max: 18, temp: 0 },
    ac: 12,
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
    homeCampaignId: 'camp-1',
    stats: { totalRolls: 0, totalD20Sum: 0, crits: 0, fumbles: 0, skillUses: {} },
    portrait: { type: 'letter', value: 'X' },
    schemaVersion: 2,
    createdAt: null as never,
    updatedAt: null as never,
    updatedBy: 'test-uid',
  };
}

function withPermissions(isDMEdit: boolean, children: ReactNode): JSX.Element {
  return (
    <PermissionProvider
      value={{
        canEdit: true,
        isDM: isDMEdit,
        isDMEdit,
        ownerUid: isDMEdit ? 'player-2' : undefined,
        lockedFields: isDMEdit ? ['name'] : [],
      }}
    >
      {children}
    </PermissionProvider>
  );
}

describe('Ajout de classe hors prérequis (M25)', () => {
  it('côté joueur : l’entrée « Ajouter une classe » reste cachée', () => {
    render(withPermissions(false, <LevelUpButton character={underqualified()} />));
    expect(screen.queryByRole('button', { name: /ajouter une classe/i })).toBeNull();
  });

  it('côté meneur : l’entrée apparaît et la classe est SÉLECTIONNABLE, avec avertissement', async () => {
    const user = userEvent.setup();
    render(withPermissions(true, <LevelUpButton character={underqualified()} />));

    await user.click(screen.getByRole('button', { name: /ajouter une classe/i }));

    const option = screen.getByRole('radio', { name: /Paladin/ });
    expect(option).toBeEnabled();
    // L'écart chiffré reste lisible — on lève la barrière, on ne cache pas le fait.
    expect(option).toHaveTextContent(/For 10\/13/);
    expect(option).toHaveTextContent(/Cha 12\/13/);

    await user.click(option);
    expect(option).toHaveAttribute('aria-checked', 'true');
  });
});
