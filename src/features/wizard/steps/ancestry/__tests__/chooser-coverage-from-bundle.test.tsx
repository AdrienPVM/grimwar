import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen, within } from '@testing-library/react';

import { useWizardStore, EMPTY_DRAFT } from '@/shared/lib/slices/wizard-slice';
import { EMPTY_ANCESTRY_SUB_CHOICES } from '@/shared/types/character';
import {
  AncestrySchema,
  type Ancestry,
  type Spell,
} from '@/shared/types/content';

import { AncestrySubChoicesSection } from '../ancestry-sub-choices-section';

/**
 * Coverage test bundle↔chooser (plan 13.8 UAT 2026-05-17, 2e passe).
 *
 * Le test qui MANQUAIT en 13.8 et qui aurait attrapé le bug Drakéide/Goliath
 * avant l'UAT : pour CHAQUE ascendance à sous-choix, ouvre le bundle disque
 * réel (`public/data/ancestries.json`), parse via le schéma `AncestrySchema`
 * strict, rend le chooser via `AncestrySubChoicesSection`, et vérifie que le
 * nombre de cartes RENDUES correspond au nombre d'options dans le bundle.
 *
 * C'est l'analogue ascendance du Hardening C des sorts (« 8 classes lanceuses
 * SRD rendent des sorts non vides ») mais côté chooser de sous-choix.
 *
 * Tourne sans Java (sans émulateur Firebase) — c'est un test unitaire jsdom
 * qui lit le bundle disque via `fs.readFileSync`. Si Adrien (ou la CI) wipe
 * Dexie en local, ce test reste vert tant que `public/data/ancestries.json`
 * est valide.
 *
 * Rouge avant vert : sur le code pré-fix d'origine (chooser avec
 * `dragon?.options.dragonAncestries`), un fixture obsolète sans `options` →
 * crash. Sur le code 1ère passe (`?.options?.X`) → section vide muette,
 * `toHaveCount(0)` (mauvaise valeur). Sur le code 2e passe avec schéma strict
 * + bannière → ce test attend `toHaveCount(N)` avec N issu du bundle, et
 * passe.
 *
 * Si le bundle disque perd des options (ex. extraction script cassée pour
 * dragonborn/goliath), ce test devient ROUGE — c'est le point. Il prévient
 * la régression "extraction silencieusement vide" avant que ça ne tombe en
 * UAT manuelle.
 */

const BUNDLE_PATH = resolve(__dirname, '../../../../../../public/data/ancestries.json');
const ANCESTRIES_RAW = JSON.parse(readFileSync(BUNDLE_PATH, 'utf-8')) as unknown[];

// Validation du bundle au boot du test — si une entrée d'ascendance ne passe
// pas le schéma strict, c'est aussi une régression à attraper ici.
const ANCESTRIES: Ancestry[] = ANCESTRIES_RAW.map((entry, idx) => {
  const parsed = AncestrySchema.safeParse(entry);
  if (!parsed.success) {
    const id = (entry as { id?: string }).id ?? `index ${idx}`;
    throw new Error(
      `[chooser-coverage] public/data/ancestries.json : entrée "${id}" rejetée par AncestrySchema strict — ` +
        `corrige le bundle (extraction SRD) avant tout. Issues : ${JSON.stringify(parsed.error.issues)}`,
    );
  }
  return parsed.data;
});

// On a aussi besoin d'un minimum de sorts pour les choosers qui résolvent un
// cantripSpellId (elf/gnome/tiefling) — sinon les cartes affichent le slug
// brut au lieu du nom. Ça ne change pas le COUNT, donc on peut passer un
// tableau vide ici sans souci pour la couverture quantitative.
const EMPTY_SPELLS: Spell[] = [];

vi.mock('@/shared/hooks/use-content', () => ({
  useContent: (type: string) => {
    if (type === 'spells') {
      return { data: EMPTY_SPELLS, isLoading: false, error: null };
    }
    if (type === 'ancestries') {
      return { data: ANCESTRIES, isLoading: false, error: null };
    }
    return { data: [], isLoading: false, error: null };
  },
}));

function selectAncestry(ancestryId: string): void {
  useWizardStore.setState({
    draft: {
      ...EMPTY_DRAFT,
      ancestryId,
      ancestrySubChoices: { ...EMPTY_ANCESTRY_SUB_CHOICES },
    },
    currentStep: 'ancestry',
    visitedSteps: ['identity', 'class', 'ancestry'],
  });
}

function findAncestry(id: string): Ancestry {
  const a = ANCESTRIES.find((e) => e.id === id);
  if (!a) throw new Error(`Bundle disque manque ancestry "${id}"`);
  return a;
}

describe('Choosers — couverture bundle disque (test qui aurait attrapé le bug UAT 13.8)', () => {
  it('Drakéide → cartes radio = nb dragonAncestries du bundle', () => {
    const expected = findAncestry('dragonborn').options.dragonAncestries?.length ?? 0;
    expect(expected).toBeGreaterThan(0); // Garde-fou : si l'extraction casse, ça crève ici.
    selectAncestry('dragonborn');
    render(<AncestrySubChoicesSection />);
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(expected);
  });

  it('Tieffelin → cartes radio héritage = nb tieflingLegacies du bundle', () => {
    const expectedLegacies =
      findAncestry('tiefling').options.tieflingLegacies?.length ?? 0;
    expect(expectedLegacies).toBeGreaterThan(0);
    selectAncestry('tiefling');
    render(<AncestrySubChoicesSection />);
    // Tieffelin = 3 choosers (héritage + caract. + taille). On filtre par le
    // radiogroup parent pour ne compter QUE les cartes du chooser héritage.
    const legacyGroup = screen.getByRole('radiogroup', { name: /héritage fiélon/i });
    expect(within(legacyGroup).getAllByRole('radio')).toHaveLength(expectedLegacies);
  });

  it('Elfe → cartes radio lignage = nb elfLineages du bundle', () => {
    const expected = findAncestry('elf').options.elfLineages?.length ?? 0;
    expect(expected).toBeGreaterThan(0);
    selectAncestry('elf');
    render(<AncestrySubChoicesSection />);
    const lineageGroup = screen.getByRole('radiogroup', { name: /lignage elfique/i });
    expect(within(lineageGroup).getAllByRole('radio')).toHaveLength(expected);
  });

  it('Gnome → cartes radio lignage = nb gnomeLineages du bundle', () => {
    const expected = findAncestry('gnome').options.gnomeLineages?.length ?? 0;
    expect(expected).toBeGreaterThan(0);
    selectAncestry('gnome');
    render(<AncestrySubChoicesSection />);
    const lineageGroup = screen.getByRole('radiogroup', { name: /lignage gnome/i });
    expect(within(lineageGroup).getAllByRole('radio')).toHaveLength(expected);
  });

  it('Goliath → cartes radio ascendance = nb giantAncestries du bundle', () => {
    const expected = findAncestry('goliath').options.giantAncestries?.length ?? 0;
    expect(expected).toBeGreaterThan(0);
    selectAncestry('goliath');
    render(<AncestrySubChoicesSection />);
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(expected);
  });

  it('Humain → cartes radio compétences = nb skillfulOptions du bundle', () => {
    const expected = findAncestry('human').options.skillfulOptions?.length ?? 0;
    expect(expected).toBeGreaterThan(0);
    selectAncestry('human');
    render(<AncestrySubChoicesSection />);
    // Humain = 2 choosers (taille 2 cartes + skill N cartes). On cible
    // explicitement le radiogroup skill par son nom accessible.
    const skillGroup = screen.getByRole('radiogroup', {
      name: /compétence supplémentaire/i,
    });
    expect(within(skillGroup).getAllByRole('radio')).toHaveLength(expected);
  });
});
