import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { __resetPublicCacheFreshness } from '@/shared/lib/content-loader';
import { db as dexie } from '@/shared/lib/dexie-db';
import { useWizardStore } from '@/shared/lib/slices/wizard-slice';

import { SpellsStep } from '../spells-step';

/**
 * Test correctif — UAT plan 05 point 1 « étape Sorts sans explication ».
 *
 * Le wizard pédagogique doit, pour TOUTES les étapes de choix, afficher la
 * description du choix survolé/focusé dans un panneau adjacent (cf. classes /
 * ascendances / historiques). L'étape Sorts faisait défaut : elle listait les
 * noms sans rien expliquer, ce qui rend le choix impossible pour un débutant
 * (cible explicite du wizard).
 *
 * Critère rouge-avant-vert (cf. CLAUDE.md > « rouge avant vert ») :
 *   - AVANT le fix (spells-step sans `SpellHelpPanel`) : survoler "Rayon de
 *     givre" n'affiche AUCUN panneau de détail. La description SRD ("Un rayon
 *     glacé.") n'est NULLE PART dans le DOM → ce test échoue.
 *   - APRÈS le fix : le `CasterSection` câble `onMouseEnter` / `onFocus` au
 *     `<li>` de chaque sort, qui pilote l'état `hoveredSpellId` ; le panneau
 *     `SpellHelpPanel` rend la description du sort focusé → assertion passe.
 *
 * On contourne le mécanisme d'invalidation du cache public (`contentHash`) en
 * pré-pollupant Dexie avec le bundle EN canonique ET en alignant les hashes
 * disque/cache pour qu'aucun flush n'intervienne pendant le test. Le bug visé
 * ici n'est pas le cache (déjà couvert par `spells-step-cache.test`), c'est
 * la pédagogie visuelle.
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

const TEST_HASH = 'fixed-test-hash-' + 'a'.repeat(32);
// Description distinctive : on s'attend à la retrouver dans le panneau après hover.
const RAY_OF_FROST_DESCRIPTION =
  'Un rayon glacé bleuté file vers une créature à portée et inflige des dégâts de froid.';

const WIZARD_SPELLS = [
  {
    id: 'rayon-de-givre',
    name: { fr: 'Rayon de givre', en: 'Ray of Frost' },
    level: 0 as const,
    ...baseSpellFields,
    description: { fr: RAY_OF_FROST_DESCRIPTION },
    classes: ['wizard', 'sorcerer'],
  },
  {
    id: 'lumiere',
    name: { fr: 'Lumière', en: 'Light' },
    level: 0 as const,
    ...baseSpellFields,
    description: { fr: 'Un objet brille comme une torche.' },
    classes: ['wizard', 'bard', 'cleric', 'sorcerer'],
  },
  {
    id: 'projectile-magique',
    name: { fr: 'Projectile magique', en: 'Magic Missile' },
    level: 1 as const,
    ...baseSpellFields,
    description: {
      fr: 'Trois projectiles luminescents partent de tes doigts et frappent chacun une cible.',
    },
    classes: ['wizard', 'sorcerer'],
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
  // Hash identique côté disque/cache → pas de flush → on lit le cache directement.
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

describe('SpellsStep — panneau pédagogique (description au survol)', () => {
  beforeEach(async () => {
    __resetPublicCacheFreshness();
    await seedDexie();
    mockFetchAligned();
    useWizardStore.setState((state) => ({
      ...state,
      draft: {
        ...state.draft,
        classes: [{ classId: 'wizard', level: 1 }],
        primaryClassId: 'wizard',
      },
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    useWizardStore.getState().reset();
  });

  it("affiche la description SRD d'un cantrip survolé dans un panneau adjacent", async () => {
    render(<SpellsStep />);

    // 1. La liste de cantrips doit être visible (preuve que le cache + le filtre fonctionnent).
    //    Le pipeline useContent → ensurePublicCacheFreshness → Dexie est asynchrone ;
    //    on laisse jusqu'à 2 s avant de considérer que le DOM ne convergera jamais.
    //
    //    SpellsStep est emballé dans `ListWithHelpPanel` qui rend la liste 2 fois
    //    (desktop `hidden md:grid` + mobile `md:hidden`). En jsdom, sans CSS
    //    responsive, les deux variantes sont présentes — on cible la première.
    await waitFor(
      () => {
        expect(screen.getAllByLabelText('Rayon de givre').length).toBeGreaterThan(0);
      },
      { timeout: 2000 },
    );
    const cantripCheckboxes = screen.getAllByLabelText('Rayon de givre');
    const cantripCheckbox = cantripCheckboxes[0]!;

    // 2. AVANT hover : la description ne doit PAS être visible (panneau vide).
    expect(screen.queryByText(RAY_OF_FROST_DESCRIPTION)).not.toBeInTheDocument();

    // 3. Hover sur le <li> qui porte le cantrip. Le câblage attendu :
    //    `<li onMouseEnter={() => setHoveredSpellId('rayon-de-givre')}>` →
    //    `focusedSpell` devient le sort → `<SpellHelpPanel spell={…} />` apparaît
    //    dans le `ListWithHelpPanel` avec la description.
    //
    //    Sur le code AVANT fix (étape Sorts sans panneau) : le hover ne déclenche
    //    rien, la description n'apparaît jamais → cette assertion timeout (RED).
    const cantripListItem = cantripCheckbox.closest('li');
    expect(cantripListItem).not.toBeNull();
    fireEvent.mouseEnter(cantripListItem!);

    await waitFor(
      () => {
        // ListWithHelpPanel rend aussi le panneau 2x (desktop aside + mobile div),
        // donc on cible la collection plutôt qu'un singleton.
        expect(screen.getAllByText(RAY_OF_FROST_DESCRIPTION).length).toBeGreaterThan(0);
      },
      { timeout: 1500 },
    );

    // 4. En bonus, on valide aussi qu'au moins une méta SRD ("Portée") s'affiche —
    //    sinon le panneau pourrait montrer juste la description sans le contexte
    //    (école, durée, etc.) qui rend le sort compréhensible.
    expect(screen.getAllByText(/Portée/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText('18 mètres').length).toBeGreaterThan(0);
  });
});
