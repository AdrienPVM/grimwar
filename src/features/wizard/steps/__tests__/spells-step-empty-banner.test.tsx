import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { __resetPublicCacheFreshness } from '@/shared/lib/content-loader';
import { db as dexie } from '@/shared/lib/dexie-db';
import { useWizardStore } from '@/shared/lib/slices/wizard-slice';

import { SpellsStep } from '../spells-step';

/**
 * Hardening A + C (plan 13.7 UAT post-13.7, durcissement bug "sorts vides").
 *
 * Si pour une raison quelconque (cache figé, bundle cassé, regex de filtre
 * mal câblée, etc.) le SpellsStep n'a aucun sort à afficher pour une classe
 * lanceuse, l'utilisateur DOIT voir une bannière visible — pas un écran
 * muet. Sinon le bug retombe en silence et c'est la 4e occurrence du même
 * pattern.
 *
 * Le test rend SpellsStep pour chaque classe lanceuse SRD 5.2.1 (8 classes)
 * en peuplant Dexie avec une `classes.json` complète mais des `spells.json`
 * VIDE. La bannière doit apparaître pour chacune.
 *
 * Red-before-green : sur le code pré-Hardening A, SpellsStep affiche les
 * sections vides sans bannière → test rouge. Après Hardening A : vert.
 */

const SRD_CASTER_CLASSES = [
  { id: 'bard', name: { fr: 'Barde', en: 'Bard' } },
  { id: 'cleric', name: { fr: 'Clerc', en: 'Cleric' } },
  { id: 'druid', name: { fr: 'Druide', en: 'Druid' } },
  { id: 'paladin', name: { fr: 'Paladin', en: 'Paladin' } },
  { id: 'ranger', name: { fr: 'Rôdeur', en: 'Ranger' } },
  { id: 'sorcerer', name: { fr: 'Ensorceleur', en: 'Sorcerer' } },
  { id: 'warlock', name: { fr: 'Occultiste', en: 'Warlock' } },
  { id: 'wizard', name: { fr: 'Magicien', en: 'Wizard' } },
];

function classFixture(id: string, name: { fr: string; en: string }): unknown {
  return {
    id,
    name,
    hitDie: 'd6',
    primaryAbility: ['int'],
    saveProficiencies: ['int', 'sag'],
    armorProficiencies: [],
    weaponProficiencies: [],
    toolProficiencies: [],
    skillChoices: { count: 2, from: [] },
    spellcasting: { ability: 'int', progression: 'full' },
    startingEquipment: { options: [{ items: [], coins: null }] },
    description: { fr: '.', en: '.' },
    features: [],
    source: 'srd-5.2.1',
  };
}

const CONTENT_HASH_KEY = 'public:contentHash';
const HASH = 'matching-hash-for-the-test-cccccccc';

async function seedDexie(classes: unknown[]): Promise<void> {
  await dexie.content.clear();
  await dexie.settings.clear();
  await dexie.content.put({
    id: '__public__',
    type: 'classes',
    data: classes,
    fetchedAt: Date.now(),
  });
  await dexie.content.put({
    id: '__public__',
    type: 'spells',
    data: [], // ← le sujet du test : grimoire VIDE
    fetchedAt: Date.now(),
  });
  await dexie.settings.put({ key: CONTENT_HASH_KEY, value: HASH });
}

function mockFetch(): void {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : (input as URL | Request).toString();
      if (url.includes('/data/index.json')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              generatedAt: new Date().toISOString(),
              counts: {},
              contentHash: HASH,
            }),
            { status: 200 },
          ),
        );
      }
      return Promise.resolve(new Response('not found', { status: 404 }));
    }),
  );
}

beforeEach(async () => {
  __resetPublicCacheFreshness();
  mockFetch();
});

afterEach(() => {
  vi.unstubAllGlobals();
  useWizardStore.getState().reset();
});

describe('SpellsStep — bannière vide visible pour les 8 classes lanceuses SRD (Hardening A + C)', () => {
  for (const cls of SRD_CASTER_CLASSES) {
    it(`affiche une bannière vide pour ${cls.id} quand le bundle ne contient aucun sort`, async () => {
      await seedDexie([classFixture(cls.id, cls.name)]);
      useWizardStore.setState((state) => ({
        ...state,
        draft: {
          ...state.draft,
          classes: [{ classId: cls.id, level: 1 }],
          primaryClassId: cls.id,
        },
      }));

      render(<SpellsStep />);

      // Bannière texte — accessible à l'utilisateur, pas seulement aux
      // outils dev. On cible un fragment court mais distinctif du message
      // i18n. `findAllByText` parce que `ListWithHelpPanel` rend la liste
      // côté desktop + mobile (les deux variantes coexistent en jsdom).
      const banners = await screen.findAllByText(
        /Aucun sort n['’]a été trouvé/i,
        {},
        { timeout: 2000 },
      );
      expect(banners.length).toBeGreaterThan(0);
    });
  }
});
