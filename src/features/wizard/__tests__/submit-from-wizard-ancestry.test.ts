import { describe, it, expect } from 'vitest';

import { EMPTY_DRAFT, type WizardDraft } from '@/shared/lib/slices/wizard-slice';
import { EMPTY_ANCESTRY_SUB_CHOICES } from '@/shared/types/character';
import type { Ancestry } from '@/shared/types/content';

import { buildAncestrySpellIds } from '../submit-from-wizard';

/**
 * Tests purs sur buildAncestrySpellIds (plan 13.8 step 25).
 *
 * Le submit-from-wizard.ts complet n'est pas testé unitairement
 * (Firestore + content loading rendraient le test fragile) — les e2e
 * commit 6 exercent ce chemin. Ici on prouve la résolution de la
 * source AncestrySubChoices → liste de spellIds via les options du
 * bundle.
 */

const TIEFLING: Ancestry = {
  id: 'tiefling',
  name: { fr: 'Tieffelin', en: 'Tiefling' },
  size: 'small',
  speed: 30,
  description: { fr: '', en: '' },
  abilityScoreIncrease: [],
  traits: [],
  languages: ['common'],
  source: 'srd-5.2.1',
  options: {
    tieflingLegacies: [
      {
        id: 'abyssal',
        name: { fr: 'Abyssal', en: 'Abyssal' },
        resistance: { fr: 'Poison', en: 'Poison' },
        cantripSpellId: 'poison-spray',
        level3SpellId: 'ray-of-sickness',
        level5SpellId: 'hold-person',
      },
      {
        id: 'infernal',
        name: { fr: 'Infernal', en: 'Infernal' },
        resistance: { fr: 'Feu', en: 'Fire' },
        cantripSpellId: 'fire-bolt',
        level3SpellId: 'hellish-rebuke',
        level5SpellId: 'darkness',
      },
    ],
  },
};

const ELF: Ancestry = {
  id: 'elf',
  name: { fr: 'Elfe', en: 'Elf' },
  size: 'medium',
  speed: 30,
  description: { fr: '', en: '' },
  abilityScoreIncrease: [],
  traits: [],
  languages: ['common'],
  source: 'srd-5.2.1',
  options: {
    elfLineages: [
      {
        id: 'drow',
        name: { fr: 'Drow', en: 'Drow' },
        benefit: { fr: '', en: '' },
        cantripSpellId: 'dancing-lights',
        level3SpellId: 'faerie-fire',
        level5SpellId: 'darkness',
      },
    ],
  },
};

const GNOME: Ancestry = {
  id: 'gnome',
  name: { fr: 'Gnome', en: 'Gnome' },
  size: 'small',
  speed: 30,
  description: { fr: '', en: '' },
  abilityScoreIncrease: [],
  traits: [],
  languages: ['common'],
  source: 'srd-5.2.1',
  options: {
    gnomeLineages: [
      {
        id: 'forest',
        name: { fr: 'Forêts', en: 'Forest' },
        benefit: { fr: '', en: '' },
        cantripSpellIds: ['minor-illusion'],
      },
      {
        id: 'rock',
        name: { fr: 'Roches', en: 'Rock' },
        benefit: { fr: '', en: '' },
        cantripSpellIds: ['mending', 'prestidigitation'],
      },
    ],
  },
};

const DWARF: Ancestry = {
  id: 'dwarf',
  name: { fr: 'Nain', en: 'Dwarf' },
  size: 'medium',
  speed: 30,
  description: { fr: '', en: '' },
  abilityScoreIncrease: [],
  traits: [],
  languages: ['common'],
  source: 'srd-5.2.1',
  options: {},
};

function draftWith(patch: Partial<WizardDraft['ancestrySubChoices']>): WizardDraft {
  return {
    ...EMPTY_DRAFT,
    ancestrySubChoices: { ...EMPTY_ANCESTRY_SUB_CHOICES, ...patch },
  };
}

describe('buildAncestrySpellIds — résolution sous-choix → liste de spellIds', () => {
  it('Tieffelin Infernal → fire-bolt + hellish-rebuke + darkness (cantrip + L3 + L5)', () => {
    const draft = draftWith({ tieflingLegacy: 'infernal' });
    expect(buildAncestrySpellIds(draft, TIEFLING)).toEqual([
      'fire-bolt',
      'hellish-rebuke',
      'darkness',
    ]);
  });

  it('Tieffelin Abyssal → poison-spray + ray-of-sickness + hold-person', () => {
    const draft = draftWith({ tieflingLegacy: 'abyssal' });
    expect(buildAncestrySpellIds(draft, TIEFLING)).toEqual([
      'poison-spray',
      'ray-of-sickness',
      'hold-person',
    ]);
  });

  it('Tieffelin sans tieflingLegacy → [] (sentinelle nullable acceptée)', () => {
    const draft = draftWith({});
    expect(buildAncestrySpellIds(draft, TIEFLING)).toEqual([]);
  });

  it('Elfe Drow → dancing-lights + faerie-fire + darkness', () => {
    const draft = draftWith({ elfLineage: 'drow' });
    expect(buildAncestrySpellIds(draft, ELF)).toEqual([
      'dancing-lights',
      'faerie-fire',
      'darkness',
    ]);
  });

  it('Gnome des roches → mending + prestidigitation (cantrips seulement, pas de L3/L5)', () => {
    const draft = draftWith({ gnomeLineage: 'rock' });
    expect(buildAncestrySpellIds(draft, GNOME)).toEqual(['mending', 'prestidigitation']);
  });

  it('Gnome des forêts → minor-illusion (1 cantrip)', () => {
    const draft = draftWith({ gnomeLineage: 'forest' });
    expect(buildAncestrySpellIds(draft, GNOME)).toEqual(['minor-illusion']);
  });

  it('Nain → [] (aucune ascendance avec sort)', () => {
    const draft = draftWith({});
    expect(buildAncestrySpellIds(draft, DWARF)).toEqual([]);
  });

  it('Tieffelin avec un héritage inconnu (custom pack mal aligné) → [] safe', () => {
    const draft = draftWith({
      tieflingLegacy: 'abyssal' as never, // type system safe ; bundle mismatch
    });
    const bundleWithoutAbyssal: Ancestry = {
      ...TIEFLING,
      options: { tieflingLegacies: [TIEFLING.options.tieflingLegacies![1]!] }, // infernal only
    };
    expect(buildAncestrySpellIds(draft, bundleWithoutAbyssal)).toEqual([]);
  });
});
