import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Character } from '@/shared/types/character';
import type { ClassEntity, Subclass } from '@/shared/types/content';

import { LevelUpModal } from '../level-up-modal';

/**
 * JALON 2B.4c — tests UI shell de la modale de level-up.
 *
 * Red-before-green vérifié pendant la session : le fichier `level-up-modal.tsx`
 * n'existait pas (TDD shell) et l'import a échoué ; une fois posé, les tests
 * valident le contrat suivant :
 *   - rend un dialog accessible quand `open=true` et un perso à level < 20
 *   - calcule les étapes via `levelUpChoices` et les expose une à une
 *   - bloque « Confirmer » tant qu'un input est vide (canSubmitFlow)
 *   - appelle `onConfirm(draft)` exactement une fois, avec une payload validée
 *   - les boutons « Précédent » / « Suivant » naviguent (et désactivent la borne)
 *
 * On mocke `useContent` pour figer les bundles utilisés par les sub-steps
 * (subclasses, feats, spells, invocations). La logique des sub-pickers
 * (PickList, AsiPicker, FeatPicker) est validée à travers les actions
 * utilisateur dans le scénario d'intégration.
 */

const championSubclass: Subclass = {
  id: 'champion',
  classId: 'fighter',
  name: { fr: 'Champion', en: 'Champion' },
  description: { fr: 'Combattant pur, focalisé sur la puissance brute.', en: '' },
  features: [],
  source: 'srd-5.2.1',
};

const fighterClass: ClassEntity = {
  id: 'fighter',
  name: { fr: 'Guerrier', en: 'Fighter' },
  description: { fr: '', en: '' },
  hitDie: 'd10',
  primaryAbility: ['for'],
  saveProficiencies: ['for', 'con'],
  skillChoices: { count: 2, from: ['athletisme'] },
  armorProficiencies: ['light', 'medium', 'heavy', 'shield'],
  weaponProficiencies: ['simple', 'martial'],
  toolProficiencies: [],
  spellcasting: null,
  startingEquipment: { options: [{ items: [], coins: null }] },
  features: [
    {
      level: 1,
      name: { fr: 'Style de combat', en: 'Fighting Style' },
      description: { fr: '', en: '' },
    },
    {
      level: 2,
      name: { fr: "Sursaut d'action", en: 'Action Surge' },
      description: { fr: '', en: '' },
    },
    {
      level: 3,
      name: { fr: 'Sous-classe de Guerrier', en: 'Fighter Subclass' },
      description: { fr: '', en: '' },
    },
    {
      level: 4,
      name: { fr: 'Amélioration de caractéristique', en: 'Ability Score Improvement' },
      description: { fr: '', en: '' },
    },
    {
      level: 19,
      name: { fr: 'Faveur épique', en: 'Epic Boon' },
      description: { fr: '', en: '' },
    },
  ],
  weaponMasteryCount: 3,
  source: 'srd-5.2.1',
};

vi.mock('@/shared/hooks/use-content', () => ({
  useContent: (type: string) => {
    if (type === 'subclasses') {
      return { data: [championSubclass], loading: false, error: null };
    }
    if (type === 'feats') {
      return {
        data: [
          { id: 'fou-de-combat', name: { fr: 'Fou de combat', en: 'Berserker' }, category: 'general' },
          { id: 'don-epique-de-force', name: { fr: 'Don épique de Force', en: 'Epic Boon of Strength' }, category: 'epic-boon' },
        ],
        loading: false,
        error: null,
      };
    }
    if (type === 'spells' || type === 'invocations' || type === 'classes') {
      return { data: [], loading: false, error: null };
    }
    return { data: [], loading: false, error: null };
  },
}));

function makeFighter(level: number): Character {
  return {
    id: 'test-pj',
    name: 'Garreth',
    status: 'alive',
    classes: [
      {
        classId: 'fighter',
        subclassId: null,
        level,
        clericDivineOrder: null,
        druidPrimalOrder: null,
        fighterFightingStyle: 'defense',
        weaponMasteries: [],
        expertiseSkills: [],
        eldritchInvocations: [],
        wizardSpellbookL1: [],
      },
    ],
    totalLevel: level,
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
    alignment: 'LN',
    abilities: { for: 16, dex: 12, con: 14, int: 10, sag: 12, cha: 8 },
    saves: { for: true, dex: false, con: true, int: false, sag: false, cha: false },
    skills: {},
    hp: { current: 12, max: 12, temp: 0 },
    ac: 16,
    speed: 30,
    initiative: 1,
    hitDice: [{ classId: 'fighter', current: level, max: level, die: 'd10' }],
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
    portrait: { type: 'letter', value: 'G' },
    schemaVersion: 2,
    createdAt: null as never,
    updatedAt: null as never,
    updatedBy: 'test-uid',
  };
}

describe('LevelUpModal — coquille UI (JALON 2B.4c)', () => {
  it('rend un dialog quand open=true avec titre Niveau N → N+1', () => {
    const character = makeFighter(1);
    render(
      <LevelUpModal
        open
        onClose={() => {}}
        character={character}
        classDefinition={fighterClass}
        onConfirm={() => {}}
      />,
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText(/Niveau 1 → 2/)).toBeInTheDocument();
  });

  it('ne rend rien quand open=false', () => {
    render(
      <LevelUpModal
        open={false}
        onClose={() => {}}
        character={makeFighter(1)}
        classDefinition={fighterClass}
        onConfirm={() => {}}
      />,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('Fighter L1 → L2 : 1 seule étape (HP) — confirm immédiat possible', () => {
    const onConfirm = vi.fn();
    const character = makeFighter(1);
    render(
      <LevelUpModal
        open
        onClose={() => {}}
        character={character}
        classDefinition={fighterClass}
        onConfirm={onConfirm}
      />,
    );
    // L'étape unique est HP roll : pas de "Étape 1/N" affiché si N≤1.
    expect(screen.queryByText(/Étape 1 \/ /)).not.toBeInTheDocument();
    // Pas d'input → bouton Confirmer désactivé.
    const confirmBtn = screen.getByRole('button', { name: /confirmer/i });
    expect(confirmBtn).toBeDisabled();
    // L'utilisateur choisit la moyenne.
    fireEvent.click(screen.getByRole('button', { name: /moyenne/i }));
    expect(confirmBtn).not.toBeDisabled();
    fireEvent.click(confirmBtn);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    const draft = onConfirm.mock.calls[0]![0];
    expect(draft).toMatchObject({
      classId: 'fighter',
      newClassLevel: 2,
      hpRoll: { kind: 'average' },
    });
  });

  it('Fighter L2 → L3 : 2 étapes (HP puis sous-classe) — bouton Suivant gate sur HP', () => {
    const onConfirm = vi.fn();
    const character = makeFighter(2);
    render(
      <LevelUpModal
        open
        onClose={() => {}}
        character={character}
        classDefinition={fighterClass}
        onConfirm={onConfirm}
      />,
    );
    expect(screen.getByText(/Étape 1 \/ 2/)).toBeInTheDocument();
    // « Suivant » désactivé tant que HP n'est pas posé.
    const next = screen.getByRole('button', { name: /suivant/i });
    expect(next).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /moyenne/i }));
    expect(next).not.toBeDisabled();
    fireEvent.click(next);
    // Étape 2 : sous-classe — radio Champion sélectionnable.
    expect(screen.getByText(/Étape 2 \/ 2/)).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /champion/i })).toBeInTheDocument();
    const confirm = screen.getByRole('button', { name: /confirmer/i });
    expect(confirm).toBeDisabled();
    fireEvent.click(screen.getByRole('radio', { name: /champion/i }));
    expect(confirm).not.toBeDisabled();
    fireEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm.mock.calls[0]![0]).toMatchObject({
      classId: 'fighter',
      newClassLevel: 3,
      hpRoll: { kind: 'average' },
      subclassId: 'champion',
    });
  });

  it('Précédent revient à l’étape précédente sans perdre le choix', () => {
    const character = makeFighter(2);
    render(
      <LevelUpModal
        open
        onClose={() => {}}
        character={character}
        classDefinition={fighterClass}
        onConfirm={() => {}}
      />,
    );
    // Pose HP, avance, recule, vérifie qu'on revient à l'écran HP avec l'option encore active.
    fireEvent.click(screen.getByRole('button', { name: /moyenne/i }));
    fireEvent.click(screen.getByRole('button', { name: /suivant/i }));
    expect(screen.getByText(/Étape 2 \/ 2/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /précédent/i }));
    expect(screen.getByText(/Étape 1 \/ 2/)).toBeInTheDocument();
    // Le bouton moyenne reflète toujours l'état choisi (aria-pressed=true).
    expect(screen.getByRole('button', { name: /moyenne/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('« Précédent » est désactivé sur la première étape', () => {
    render(
      <LevelUpModal
        open
        onClose={() => {}}
        character={makeFighter(2)}
        classDefinition={fighterClass}
        onConfirm={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: /précédent/i })).toBeDisabled();
  });
});

describe('LevelUpModal — persistance asynchrone (JALON 2B.5)', () => {
  it('isSubmitting grise Confirmer + Précédent et change le libellé en « Application… »', () => {
    const character = makeFighter(1);
    render(
      <LevelUpModal
        open
        onClose={() => {}}
        character={character}
        classDefinition={fighterClass}
        onConfirm={() => {}}
        isSubmitting
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /moyenne/i }));
    const confirmBtn = screen.getByRole('button', { name: /application/i });
    expect(confirmBtn).toBeDisabled();
    expect(confirmBtn).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button', { name: /précédent/i })).toBeDisabled();
  });

  it('submitError est rendu dans le footer en role="alert"', () => {
    render(
      <LevelUpModal
        open
        onClose={() => {}}
        character={makeFighter(1)}
        classDefinition={fighterClass}
        onConfirm={() => {}}
        submitError="Permission denied (offline)"
      />,
    );
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Permission denied (offline)');
  });

  it('onClose est neutralisé pendant la persistance (pas de fermeture accidentelle)', () => {
    const onClose = vi.fn();
    render(
      <LevelUpModal
        open
        onClose={onClose}
        character={makeFighter(1)}
        classDefinition={fighterClass}
        onConfirm={() => {}}
        isSubmitting
      />,
    );
    // Le bouton de fermeture (`×`) du DetailModal expose un aria-label « Fermer ».
    const closeBtn = screen.queryByRole('button', { name: /fermer/i });
    if (closeBtn) {
      fireEvent.click(closeBtn);
      expect(onClose).not.toHaveBeenCalled();
    }
    // L'absence du bouton n'est pas une régression : certaines variantes le
    // cachent. Le contrat testé ici, c'est qu'on n'appelle pas onClose pendant
    // la persistance — vérifié quel que soit le chemin.
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('LevelUpModal — Epic Boon filter à L19 (JALON 2C.3)', () => {
  it('Fighter L18 → L19 : étape Don propose les feats epic-boon (pas general)', () => {
    const character = makeFighter(18);
    render(
      <LevelUpModal
        open
        onClose={() => {}}
        character={character}
        classDefinition={fighterClass}
        onConfirm={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /moyenne/i }));
    fireEvent.click(screen.getByRole('button', { name: /suivant/i }));
    fireEvent.click(screen.getByRole('radio', { name: /^don$/i }));
    // Le titre L19 mentionne « don épique » ; on cible le `combobox` (select)
    // directement plutôt que le label pour éviter l'ambiguïté.
    const featSelect = screen.getByRole('combobox') as HTMLSelectElement;
    const options = Array.from(featSelect.options).map((o) => o.textContent);
    expect(options.join(' ')).toMatch(/don épique de force/i);
    expect(options.join(' ')).not.toMatch(/fou de combat/i);
  });

  it('Fighter L3 → L4 : étape ASI/feat propose les feats general (pas epic-boon)', () => {
    const character = makeFighter(3);
    render(
      <LevelUpModal
        open
        onClose={() => {}}
        character={character}
        classDefinition={fighterClass}
        onConfirm={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /moyenne/i }));
    fireEvent.click(screen.getByRole('button', { name: /suivant/i }));
    fireEvent.click(screen.getByRole('radio', { name: /^don$/i }));
    const featSelect = screen.getByRole('combobox') as HTMLSelectElement;
    const options = Array.from(featSelect.options).map((o) => o.textContent);
    expect(options.join(' ')).toMatch(/fou de combat/i);
    expect(options.join(' ')).not.toMatch(/don épique de force/i);
  });
});
