import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { __resetPublicCacheFreshness } from '@/shared/lib/content-loader';
import { db as dexie } from '@/shared/lib/dexie-db';
import { useWizardStore } from '@/shared/lib/slices/wizard-slice';

import { SpellsStep } from '../spells-step';

/**
 * UAT post-plan 05 — passage du panneau d'aide d'un modèle « hover éphémère »
 * à « sélection persistante + modale mobile ».
 *
 * Test 1 (RED sur le code actuel) — desktop : le panneau de détail RESTE
 * affiché après que la souris quitte un item. Le bug actuel : `onMouseLeave`
 * remet `hoveredId` à `null` → la description disparaît dès que le pointeur
 * quitte la ligne → le panneau n'est pas utilisable.
 *
 * Test 2 (RED sur le code actuel) — desktop : la navigation clavier (focus)
 * pilote aussi le panneau, et un focus suivant un autre item bascule le
 * contenu.
 *
 * Test 3 (RED sur le code actuel) — mobile : un bouton « ? » est rendu pour
 * chaque sort. Tap sur le bouton ouvre une modale (`role="dialog"`) qui
 * contient la description SRD. ESC ferme la modale.
 *
 * Test 4 (RED sur le code actuel) — séparation tap-ligne / tap-?. Le bouton
 * « ? » NE coche PAS la case (`stopPropagation` ou élément hors `<label>`) ;
 * il ouvre uniquement la modale.
 */

const baseSpellFields = {
  school: 'evocation' as const,
  castingTime: { fr: '1 action' },
  range: { fr: '18 mètres' },
  components: { v: true, s: true, m: false },
  duration: { fr: 'instantanée' },
  concentration: false,
  ritual: false,
  atHigherLevels: null,
  source: 'srd-5.2.1' as const,
};

const TEST_HASH = 'persistent-' + 'a'.repeat(40);
const RAY_DESC =
  'Un rayon glacé bleuté file vers une créature à portée et inflige des dégâts de froid.';
const LIGHT_DESC = 'Un objet brille comme une torche.';

const WIZARD_SPELLS = [
  {
    id: 'rayon-de-givre',
    name: { fr: 'Rayon de givre', en: 'Ray of Frost' },
    level: 0 as const,
    ...baseSpellFields,
    description: { fr: RAY_DESC },
    classes: ['wizard', 'sorcerer'],
  },
  {
    id: 'lumiere',
    name: { fr: 'Lumière', en: 'Light' },
    level: 0 as const,
    ...baseSpellFields,
    description: { fr: LIGHT_DESC },
    classes: ['wizard', 'bard', 'cleric', 'sorcerer'],
  },
];

const WIZARD_CLASSES = [
  {
    id: 'wizard',
    name: { fr: 'Magicien', en: 'Wizard' },
    hitDie: 'd6',
    primaryAbility: ['int'],
    saveProficiencies: ['int', 'sag'],
    armorProficiencies: [],
    weaponProficiencies: [],
    toolProficiencies: [],
    skillChoices: { count: 2, from: [] },
    spellcasting: { ability: 'int', progression: 'full' },
    startingEquipment: { options: [{ items: [], coins: null }] },
    description: { fr: 'Magicien.', en: 'Wizard.' },
    features: [],
    weaponMasteryCount: 0,
    source: 'srd-5.2.1',
  },
];

const CONTENT_HASH_KEY = 'public:contentHash';

async function seedDexie(): Promise<void> {
  await dexie.content.clear();
  await dexie.settings.clear();
  await dexie.content.put({
    id: '__public__',
    type: 'spells',
    data: WIZARD_SPELLS,
    fetchedAt: Date.now(),
  });
  await dexie.content.put({
    id: '__public__',
    type: 'classes',
    data: WIZARD_CLASSES,
    fetchedAt: Date.now(),
  });
  await dexie.settings.put({ key: CONTENT_HASH_KEY, value: TEST_HASH });
}

function mockFetchAligned(): void {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : (input as URL | Request).toString();
      if (url.includes('/data/index.json')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              generatedAt: new Date().toISOString(),
              counts: { spells: WIZARD_SPELLS.length, classes: WIZARD_CLASSES.length },
              contentHash: TEST_HASH,
            }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          ),
        );
      }
      return Promise.resolve(new Response('not found', { status: 404 }));
    }),
  );
}

async function renderAndWaitForList(): Promise<void> {
  render(<SpellsStep />);
  await waitFor(
    () => {
      expect(screen.getAllByLabelText('Rayon de givre').length).toBeGreaterThan(0);
    },
    { timeout: 2000 },
  );
}

beforeEach(async () => {
  __resetPublicCacheFreshness();
  await seedDexie();
  mockFetchAligned();
  useWizardStore.setState((state) => ({
    ...state,
    draft: {
      ...state.draft,
      classes: [
        {
          classId: 'wizard',
          level: 1,
          clericDivineOrder: null,
          druidPrimalOrder: null,
          fighterFightingStyle: null,
          weaponMasteries: [],
          expertiseSkills: [],
          eldritchInvocations: [],
          wizardSpellbookL1: [],
        },
      ],
      primaryClassId: 'wizard',
    },
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  useWizardStore.getState().reset();
});

describe('SpellsStep — panneau persistant (desktop)', () => {
  it("le panneau garde le dernier sort survolé après mouseLeave", async () => {
    await renderAndWaitForList();
    const ray = screen.getAllByLabelText('Rayon de givre')[0]!;
    const rayLi = ray.closest('li')!;
    fireEvent.mouseEnter(rayLi);
    await waitFor(() => {
      expect(screen.getAllByText(RAY_DESC).length).toBeGreaterThan(0);
    });
    // Maintenant la souris quitte la ligne. Sur le code actuel (hover éphémère),
    // la description disparaît → assertion suivante échoue → RED.
    fireEvent.mouseLeave(rayLi);
    // Tick + frame pour laisser propager — mais surtout : on n'attend AUCUN
    // changement parce que la sélection doit rester collante.
    expect(screen.getAllByText(RAY_DESC).length).toBeGreaterThan(0);
  });

  it('bascule le panneau quand un autre sort est focusé (clavier)', async () => {
    await renderAndWaitForList();
    const ray = screen.getAllByLabelText('Rayon de givre')[0]!;
    const light = screen.getAllByLabelText('Lumière')[0]!;
    const rayLi = ray.closest('li')!;
    const lightLi = light.closest('li')!;
    fireEvent.focus(rayLi);
    await waitFor(() => {
      expect(screen.getAllByText(RAY_DESC).length).toBeGreaterThan(0);
    });
    fireEvent.focus(lightLi);
    await waitFor(() => {
      expect(screen.getAllByText(LIGHT_DESC).length).toBeGreaterThan(0);
    });
    // Le précédent contenu n'est plus dans le DOM (le panneau a basculé).
    expect(screen.queryByText(RAY_DESC)).not.toBeInTheDocument();
  });
});

describe('SpellsStep — modale mobile « ? »', () => {
  it("chaque ligne de sort expose un bouton 'Voir le détail' (déclencheur mobile)", async () => {
    await renderAndWaitForList();
    const triggers = screen.getAllByRole('button', { name: /voir le détail/i });
    // 2 sorts × 2 variantes (desktop + mobile rendues toutes deux en jsdom) = au moins 2.
    // Le test n'impose pas un compte exact pour ne pas se mettre à jour à chaque
    // changement de structure ; il vérifie juste la présence du pattern.
    expect(triggers.length).toBeGreaterThanOrEqual(2);
  });

  it("tap sur '?' ouvre une modale qui contient la description SRD du sort", async () => {
    await renderAndWaitForList();
    const triggers = screen.getAllByRole('button', { name: /voir le détail.*rayon de givre/i });
    fireEvent.click(triggers[0]!);
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(within(dialog).getByText(RAY_DESC)).toBeInTheDocument();
  });

  it('ESC ferme la modale de détail', async () => {
    await renderAndWaitForList();
    const triggers = screen.getAllByRole('button', { name: /voir le détail.*rayon de givre/i });
    fireEvent.click(triggers[0]!);
    await screen.findByRole('dialog');
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});

describe("SpellsStep — séparation tap-ligne (choisir) / tap-? (consulter)", () => {
  it("le bouton '?' ne coche PAS la case du sort", async () => {
    await renderAndWaitForList();
    const ray = screen.getAllByLabelText('Rayon de givre')[0]! as HTMLInputElement;
    expect(ray.checked).toBe(false);
    const triggers = screen.getAllByRole('button', { name: /voir le détail.*rayon de givre/i });
    fireEvent.click(triggers[0]!);
    // Après tap-? : modale ouverte, case toujours non cochée.
    await screen.findByRole('dialog');
    expect(ray.checked).toBe(false);
  });
});
