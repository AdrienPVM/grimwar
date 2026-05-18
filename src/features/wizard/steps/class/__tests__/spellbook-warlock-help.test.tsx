import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { EMPTY_DRAFT, useWizardStore } from '@/shared/lib/slices/wizard-slice';
import { createEmptyClassSubChoices } from '@/shared/types/character';

import { ClassSubChoicesSection } from '../class-sub-choices-section';

/**
 * Bug pédagogique plan 13.9 UAT 2026-05-18 :
 *   Le `WizardSpellbookChooser` affichait les noms des sorts SANS aucune
 *   description, alors que l'étape `SpellsStep` rend déjà chaque ligne avec
 *   un bouton « ? » + une modale `SpellHelpPanel`. Un novice ne peut pas
 *   choisir 6 sorts à l'aveugle.
 *
 * Audit en passant : `WarlockInvocationChooser` doit AUSSI offrir un détail
 * consultable (les invocations affichent déjà un `summary` inline, mais on
 * veut le même pattern « ? » pour la consistance — la modale rend nom +
 * pré-requis + summary).
 *
 * Le test :
 *   1. Rend le chooser via `ClassSubChoicesSection`.
 *   2. Vérifie qu'au moins un bouton `?` (aria-label « Voir le détail … ») est
 *      présent pour chaque ligne de sort / invocation.
 *   3. Clic sur le `?` ouvre une modale (`role="dialog"`).
 *
 * Rouge-avant-vert : ce test doit être rouge sur le commit 1 actuel
 * (chooser nu), puis vert après câblage du pattern HelpTrigger + DetailModal.
 */

const WIZARD_FIXTURE = {
  id: 'wizard',
  name: { fr: 'Magicien', en: 'Wizard' },
  hitDie: 'd6',
  primaryAbility: ['int'],
  saveProficiencies: ['int', 'sag'],
  armorProficiencies: [],
  weaponProficiencies: [],
  toolProficiencies: [],
  skillChoices: { count: 2, from: ['Arcana'] },
  weaponMasteryCount: 0,
  spellcasting: { ability: 'int', progression: 'full' },
  startingEquipment: { options: [{ items: [], coins: null }] },
  description: { fr: '.', en: '.' },
  features: [],
  source: 'srd-5.2.1',
} as const;

const WARLOCK_FIXTURE = {
  id: 'warlock',
  name: { fr: 'Occultiste', en: 'Warlock' },
  hitDie: 'd8',
  primaryAbility: ['cha'],
  saveProficiencies: ['cha', 'sag'],
  armorProficiencies: [],
  weaponProficiencies: [],
  toolProficiencies: [],
  skillChoices: { count: 2, from: ['Arcana'] },
  weaponMasteryCount: 0,
  spellcasting: { ability: 'cha', progression: 'pact' },
  startingEquipment: { options: [{ items: [], coins: null }] },
  description: { fr: '.', en: '.' },
  features: [],
  source: 'srd-5.2.1',
} as const;

const MAGE_HAND_SPELL = {
  id: 'mage-hand',
  name: { fr: 'Main du mage', en: 'Mage Hand' },
  level: 1,
  school: 'conjuration',
  castingTime: { fr: '1 action', en: '1 action' },
  range: { fr: '9 m', en: '30 ft' },
  components: { v: true, s: true, m: false },
  duration: { fr: '1 minute', en: '1 minute' },
  concentration: false,
  ritual: false,
  description: { fr: 'Une main spectrale apparaît…', en: 'A spectral hand appears…' },
  atHigherLevels: null,
  classes: ['wizard'],
  source: 'srd-5.2.1',
} as const;

const ARMOR_OF_SHADOWS_INV = {
  id: 'armor-of-shadows',
  name: { fr: "Armure d'ombres", en: 'Armor of Shadows' },
  summary: {
    fr: 'Vous pouvez lancer Armure du mage sur vous-même à volonté.',
    en: 'You can cast Mage Armor on yourself at will.',
  },
  prerequisiteWarlockLevel: null,
  prerequisiteOther: null,
  source: 'srd-5.2.1',
} as const;

vi.mock('@/shared/hooks/use-content', () => ({
  useContent: (type: string) => {
    if (type === 'classes')
      return { data: [WIZARD_FIXTURE, WARLOCK_FIXTURE], loading: false, error: null };
    if (type === 'spells') return { data: [MAGE_HAND_SPELL], loading: false, error: null };
    if (type === 'invocations')
      return { data: [ARMOR_OF_SHADOWS_INV], loading: false, error: null };
    return { data: [], loading: false, error: null };
  },
}));

vi.mock('@/shared/lib/content-loader', () => ({
  invalidatePublicContent: vi.fn().mockResolvedValue(undefined),
}));

function setPrimary(classId: string): void {
  useWizardStore.setState({
    draft: {
      ...EMPTY_DRAFT,
      primaryClassId: classId,
      classes: [{ ...createEmptyClassSubChoices(), classId, level: 1 }],
    },
    currentStep: 'class',
    visitedSteps: ['identity', 'class'],
  });
}

beforeEach(() => {
  useWizardStore.getState().reset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('Spellbook chooser — descriptions consultables (UAT 2026-05-18)', () => {
  it('Chaque sort inscrit a un bouton « ? » qui ouvre la modale détail', async () => {
    setPrimary('wizard');
    const user = userEvent.setup();
    render(<ClassSubChoicesSection />);

    const helpBtns = screen.getAllByRole('button', {
      name: /Voir le détail/i,
    });
    expect(helpBtns.length).toBeGreaterThan(0);

    await user.click(helpBtns[0]!);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeTruthy();
    // Le contenu DE LA MODALE doit citer le nom du sort en panneau d'aide.
    expect(within(dialog).getByText(/Main du mage/i)).toBeTruthy();
  });
});

describe('Warlock invocation chooser — descriptions consultables (UAT 2026-05-18)', () => {
  it('Chaque invocation a un bouton « ? » qui ouvre la modale détail', async () => {
    setPrimary('warlock');
    const user = userEvent.setup();
    render(<ClassSubChoicesSection />);

    const helpBtns = screen.getAllByRole('button', {
      name: /Voir le détail/i,
    });
    expect(helpBtns.length).toBeGreaterThan(0);

    await user.click(helpBtns[0]!);
    expect(screen.getByRole('dialog')).toBeTruthy();
  });
});
