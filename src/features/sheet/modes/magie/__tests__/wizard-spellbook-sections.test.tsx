import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Character } from '@/shared/types/character';
import type { Spell } from '@/shared/types/content';

import { WizardSpellbookSections } from '../wizard-spellbook-sections';

import classesBundle from '../../../../../../public/data/classes.json';
import spellsBundle from '../../../../../../public/data/spells.json';

/**
 * Plan 13.9 commit 4c — séparation visuelle Grimoire / Préparés du Magicien.
 *
 * Décision Adrien (UAT 4b) : « les sorts préparés et les sorts inscrits dans
 * le grimoire mais NON préparés doivent être deux sections distinctes sur
 * la fiche du Magicien ». Avant 4c, la `<SpellList>` les groupait dans une
 * seule liste avec différenciation visuelle par opacité — pas assez clair.
 *
 * Catégories appliquées :
 * - Cat. 2 (identité) : les 6 noms FR du grimoire viennent du bundle.
 * - Cat. 6 (intersections) : préparé ⊂ grimoire (inscrits-non-préparés
 *   apparaissent UNIQUEMENT dans la section Grimoire, jamais dans Préparés).
 * - Cat. 6 (test négatif) : un sort hors-grimoire (`boule-de-feu`) ne fuit
 *   dans aucune des deux sections, même fourni en input.
 *
 * Échantillon raisonné (cohérent avec le grimoire 4b) :
 *
 * - **Inscrits (knownSpells.wizard, 6 sorts L1)** :
 *   1. bouclier (abj)         ← préparé
 *   2. projectile-magique (evo) ← préparé
 *   3. armure-du-mage (abj)   ← préparé (renommé SRD 5.2.1)
 *   4. graisse (conj)         ← préparé
 *   5. alarme (abj)           ← inscrit non-préparé
 *   6. appel-de-familier (conj) ← inscrit non-préparé
 *
 * - **Préparés** : bouclier, projectile-magique, armure-du-mage, graisse (4)
 * - **Inscrits non-préparés** : alarme, appel-de-familier (2)
 */

interface SpellBundleEntry {
  id: string;
  name: { fr: string; en?: string };
  level: number;
  school: string;
  description?: { fr?: string; en?: string };
  classes?: string[];
}

const INSCRIBED_IDS = [
  'bouclier',
  'projectile-magique',
  'armure-du-mage',
  'graisse',
  'alarme',
  'appel-de-familier',
] as const;
const PREPARED_IDS = ['bouclier', 'projectile-magique', 'armure-du-mage', 'graisse'] as const;
const INSCRIBED_NOT_PREPARED_IDS = ['alarme', 'appel-de-familier'] as const;

function spellFromBundle(id: string): Spell {
  const found = (spellsBundle as SpellBundleEntry[]).find((s) => s.id === id);
  if (!found) {
    throw new Error(
      `[wizard-spellbook-sections] sort ${id} absent de spells.json — bundle régressé`,
    );
  }
  return found as unknown as Spell;
}

const INSCRIBED_SPELLS = INSCRIBED_IDS.map(spellFromBundle);

const { updateCharacterMock } = vi.hoisted(() => ({
  updateCharacterMock: vi.fn().mockResolvedValue(undefined),
}));

// Type-aware : la cap de préparation Magicien se lit dans
// `classes.spellProgression.spellsKnownOrPrepared` (L1 = 4). Les autres types
// renvoient `[]` (le composant n'en consomme pas).
vi.mock('@/shared/hooks/use-content', () => ({
  useContent: (type: string) =>
    type === 'classes'
      ? { data: classesBundle, isLoading: false, error: null }
      : { data: [], isLoading: false, error: null },
}));

vi.mock('@/features/sheet/use-update-character', () => ({
  useUpdateCharacter: () => ({
    updateCharacter: updateCharacterMock,
    isUpdating: false,
    error: null,
  }),
}));

beforeEach(() => {
  updateCharacterMock.mockClear();
});

function wizardL1(
  prepared: readonly string[] = PREPARED_IDS,
  known: readonly string[] = INSCRIBED_IDS,
): Character {
  return {
    id: 'test',
    name: 'Test Magicien',
    status: 'alive',
    classes: [
      {
        classId: 'wizard',
        subclassId: null,
        level: 1,
        clericDivineOrder: null,
        druidPrimalOrder: null,
        fighterFightingStyle: null,
        weaponMasteries: [],
        expertiseSkills: [],
        eldritchInvocations: [],
        wizardSpellbookL1: [...INSCRIBED_IDS],
      },
    ],
    totalLevel: 1,
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
    abilities: { for: 10, dex: 12, con: 12, int: 16, sag: 12, cha: 10 },
    saves: { for: false, dex: false, con: false, int: true, sag: true, cha: false },
    skills: {},
    hp: { current: 7, max: 7, temp: 0 },
    ac: 11,
    speed: 30,
    initiative: 1,
    hitDice: [{ classId: 'wizard', current: 1, max: 1, die: 'd6' }],
    deathSaves: { success: 0, fail: 0 },
    conditions: [],
    inspiration: false,
    exhaustion: 0,
    currentConcentration: null,
    classResources: {},
    spellSlots: {},
    knownSpells: { wizard: [...known] },
    preparedSpells: { wizard: [...prepared] },
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

describe('<WizardSpellbookSections>', () => {
  it('rend DEUX sections distinctes : « Sorts préparés » et « Grimoire »', () => {
    render(
      <WizardSpellbookSections
        character={wizardL1()}
        spells={INSCRIBED_SPELLS}
        onSpellSelect={() => undefined}
      />,
    );
    // Le test ne dépend pas du DOM exact ; on cherche les en-têtes via leur
    // texte localisé. Les deux régions sont identifiables par leur titre.
    expect(screen.getByText(/Sorts préparés/i)).toBeInTheDocument();
    expect(screen.getByText(/Grimoire/i)).toBeInTheDocument();
  });

  it('cat. 6 — la section « Préparés » contient EXACTEMENT les 4 préparés, JAMAIS les 2 inscrits non-préparés', () => {
    render(
      <WizardSpellbookSections
        character={wizardL1()}
        spells={INSCRIBED_SPELLS}
        onSpellSelect={() => undefined}
      />,
    );
    const preparedSection = screen.getByRole('region', { name: /Sorts préparés/i });
    for (const id of PREPARED_IDS) {
      const spell = spellFromBundle(id);
      expect(
        within(preparedSection).getByText(spell.name.fr),
        `${id} (${spell.name.fr}) devrait être dans la section Préparés`,
      ).toBeInTheDocument();
    }
    // Test négatif (cat. 6 — intersections) : les inscrits non-préparés ne
    // fuient PAS dans la section Préparés.
    for (const id of INSCRIBED_NOT_PREPARED_IDS) {
      const spell = spellFromBundle(id);
      expect(
        within(preparedSection).queryByText(spell.name.fr),
        `${id} (${spell.name.fr}) NE doit PAS apparaître dans Préparés — il n'est qu'inscrit`,
      ).not.toBeInTheDocument();
    }
  });

  it('cat. 6 — la section « Grimoire » contient EXACTEMENT les 2 inscrits non-préparés, JAMAIS les préparés', () => {
    render(
      <WizardSpellbookSections
        character={wizardL1()}
        spells={INSCRIBED_SPELLS}
        onSpellSelect={() => undefined}
      />,
    );
    const grimoireSection = screen.getByRole('region', { name: /Grimoire/i });
    for (const id of INSCRIBED_NOT_PREPARED_IDS) {
      const spell = spellFromBundle(id);
      expect(
        within(grimoireSection).getByText(spell.name.fr),
        `${id} (${spell.name.fr}) devrait être dans la section Grimoire`,
      ).toBeInTheDocument();
    }
    // Test négatif : les préparés ne sont PAS dans la section Grimoire (ils
    // sont déjà dans Préparés ; la duplication serait un bug d'affichage).
    for (const id of PREPARED_IDS) {
      const spell = spellFromBundle(id);
      expect(
        within(grimoireSection).queryByText(spell.name.fr),
        `${id} (${spell.name.fr}) NE doit PAS apparaître dans Grimoire — il est déjà dans Préparés`,
      ).not.toBeInTheDocument();
    }
  });

  it('cat. 2 — les compteurs des en-têtes reflètent le bundle (4 préparés, 2 grimoire)', () => {
    render(
      <WizardSpellbookSections
        character={wizardL1()}
        spells={INSCRIBED_SPELLS}
        onSpellSelect={() => undefined}
      />,
    );
    expect(screen.getByText(/Sorts préparés.*·.*4/)).toBeInTheDocument();
    expect(screen.getByText(/Grimoire.*·.*2/)).toBeInTheDocument();
  });

  it('cat. 6 — test négatif : un sort hors-grimoire (boule-de-feu) ne fuit dans AUCUNE section', () => {
    const boule = spellFromBundle('boule-de-feu');
    render(
      <WizardSpellbookSections
        character={wizardL1()}
        // On fournit volontairement boule-de-feu dans les spells, mais ce
        // sort n'est PAS dans knownSpells.wizard → filtré.
        spells={[...INSCRIBED_SPELLS, boule]}
        onSpellSelect={() => undefined}
      />,
    );
    expect(
      screen.queryByText(boule.name.fr),
      'boule-de-feu ne doit apparaître ni en Préparés ni en Grimoire',
    ).not.toBeInTheDocument();
  });

  it('tap sur un sort préparé propage onSpellSelect avec le bon sort', () => {
    const onSpellSelect = vi.fn();
    render(
      <WizardSpellbookSections
        character={wizardL1()}
        spells={INSCRIBED_SPELLS}
        onSpellSelect={onSpellSelect}
      />,
    );
    const preparedSection = screen.getByRole('region', { name: /Sorts préparés/i });
    const row = within(preparedSection)
      .getByText('Bouclier')
      .closest('button');
    if (!row) throw new Error('Pas de bouton pour Bouclier');
    fireEvent.click(row);
    expect(onSpellSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'bouclier' }),
    );
  });

  it('tap sur un sort inscrit non-préparé propage aussi onSpellSelect', () => {
    const onSpellSelect = vi.fn();
    render(
      <WizardSpellbookSections
        character={wizardL1()}
        spells={INSCRIBED_SPELLS}
        onSpellSelect={onSpellSelect}
      />,
    );
    const grimoireSection = screen.getByRole('region', { name: /Grimoire/i });
    const row = within(grimoireSection)
      .getByText('Alarme')
      .closest('button');
    if (!row) throw new Error('Pas de bouton pour Alarme');
    fireEvent.click(row);
    expect(onSpellSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'alarme' }),
    );
  });

  // --- Mode préparation (cette passe) -------------------------------------

  it('mode édition — « Modifier » révèle le plafond chiffré « 2 / 4 préparés » (cap Magicien L1)', async () => {
    const user = userEvent.setup();
    render(
      <WizardSpellbookSections
        character={wizardL1(PREPARED_IDS.slice(0, 2))}
        spells={INSCRIBED_SPELLS}
        onSpellSelect={() => undefined}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Modifier' }));
    expect(screen.getByText('2 / 4 préparés')).toBeInTheDocument();
  });

  it('mode édition — préparer un sort du Grimoire écrit preparedSpells.wizard avec l’id ajouté', async () => {
    const user = userEvent.setup();
    const prepared = PREPARED_IDS.slice(0, 2); // bouclier, projectile-magique
    render(
      <WizardSpellbookSections
        character={wizardL1(prepared)}
        spells={INSCRIBED_SPELLS}
        onSpellSelect={() => undefined}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Modifier' }));
    const grimoireSection = screen.getByRole('region', { name: /Grimoire/i });
    // 'armure-du-mage' est inscrit non-préparé → dans le Grimoire.
    const target = spellFromBundle('armure-du-mage');
    const row = within(grimoireSection).getByText(target.name.fr).closest('button');
    if (!row) throw new Error('Pas de bouton pour armure-du-mage');
    await user.click(row);
    expect(updateCharacterMock).toHaveBeenCalledWith({
      preparedSpells: { wizard: [...prepared, 'armure-du-mage'] },
    });
  });

  it('mode édition — retirer un sort préparé écrit preparedSpells.wizard sans l’id', async () => {
    const user = userEvent.setup();
    const prepared = [...PREPARED_IDS]; // 4 préparés (au plafond)
    render(
      <WizardSpellbookSections
        character={wizardL1(prepared)}
        spells={INSCRIBED_SPELLS}
        onSpellSelect={() => undefined}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Modifier' }));
    const preparedSection = screen.getByRole('region', { name: /Sorts préparés/i });
    const bouclier = spellFromBundle('bouclier');
    const row = within(preparedSection).getByText(bouclier.name.fr).closest('button');
    if (!row) throw new Error('Pas de bouton pour bouclier');
    // Le retrait reste permis même au plafond.
    await user.click(row);
    expect(updateCharacterMock).toHaveBeenCalledWith({
      preparedSpells: { wizard: prepared.filter((id) => id !== 'bouclier') },
    });
  });

  it('mode édition — au plafond (4/4) une ligne du Grimoire est désactivée, aucune écriture', async () => {
    const user = userEvent.setup();
    render(
      <WizardSpellbookSections
        character={wizardL1([...PREPARED_IDS])}
        spells={INSCRIBED_SPELLS}
        onSpellSelect={() => undefined}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Modifier' }));
    const grimoireSection = screen.getByRole('region', { name: /Grimoire/i });
    const row = within(grimoireSection).getByText('Alarme').closest('button');
    if (!row) throw new Error('Pas de bouton pour Alarme');
    expect(row).toBeDisabled();
    await user.click(row);
    expect(updateCharacterMock).not.toHaveBeenCalled();
  });

  it('mode édition — un sort mineur (cantrip) n’est jamais toggable et affiche « Toujours »', async () => {
    const user = userEvent.setup();
    const cantrip = spellFromBundle('contact-glacial'); // sort mineur Magicien
    render(
      <WizardSpellbookSections
        character={wizardL1(PREPARED_IDS.slice(0, 2), [...INSCRIBED_IDS, 'contact-glacial'])}
        spells={[...INSCRIBED_SPELLS, cantrip]}
        onSpellSelect={() => undefined}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Modifier' }));
    const grimoireSection = screen.getByRole('region', { name: /Grimoire/i });
    const row = within(grimoireSection).getByText(cantrip.name.fr).closest('button');
    if (!row) throw new Error('Pas de bouton pour le sort mineur');
    expect(row).toBeDisabled();
    expect(within(grimoireSection).getByText('Toujours')).toBeInTheDocument();
    await user.click(row);
    expect(updateCharacterMock).not.toHaveBeenCalled();
  });

  it('lecture seule — pas de bouton « Modifier » (préparation verrouillée)', () => {
    render(
      <WizardSpellbookSections
        character={wizardL1()}
        spells={INSCRIBED_SPELLS}
        onSpellSelect={() => undefined}
        readOnly
      />,
    );
    expect(screen.queryByRole('button', { name: 'Modifier' })).not.toBeInTheDocument();
  });

  it('hors mode édition — un tap ouvre le détail, AUCUNE écriture de préparation', () => {
    const onSpellSelect = vi.fn();
    render(
      <WizardSpellbookSections
        character={wizardL1(PREPARED_IDS.slice(0, 2))}
        spells={INSCRIBED_SPELLS}
        onSpellSelect={onSpellSelect}
      />,
    );
    const grimoireSection = screen.getByRole('region', { name: /Grimoire/i });
    const target = spellFromBundle('armure-du-mage');
    const row = within(grimoireSection).getByText(target.name.fr).closest('button');
    if (!row) throw new Error('Pas de bouton pour armure-du-mage');
    fireEvent.click(row);
    expect(onSpellSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'armure-du-mage' }),
    );
    expect(updateCharacterMock).not.toHaveBeenCalled();
  });
});
