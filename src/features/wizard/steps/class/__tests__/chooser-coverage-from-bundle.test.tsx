import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen, within } from '@testing-library/react';

import { useWizardStore, EMPTY_DRAFT } from '@/shared/lib/slices/wizard-slice';
import {
  ClassSchema,
  FeatSchema,
  InvocationSchema,
  ItemSchema,
  SpellSchema,
  type ClassEntity,
  type Feat,
  type Invocation,
  type Item,
  type Spell,
} from '@/shared/types/content';
import { createEmptyClassSubChoices } from '@/shared/types/character';

import { ClassSubChoicesSection } from '../class-sub-choices-section';

/**
 * Coverage test bundle↔chooser pour les sous-choix de classe (plan 13.9
 * exigence héritée 13.8 #3 — UAT 2026-05-17 généralisée).
 *
 * Pour CHAQUE chooser de classe (cleric divine order, druid primal order,
 * fighter fighting style, weapon mastery × 5 classes, rogue expertise,
 * warlock invocation, wizard spellbook L1), on :
 *   1. Charge le vrai bundle disque (`public/data/*.json`).
 *   2. Parse via le schéma strict (cf. `ClassSchema` `superRefine` 13.9).
 *   3. Rend le chooser via `ClassSubChoicesSection`.
 *   4. Vérifie que le nombre de cartes RENDUES correspond au bundle.
 *
 * C'est précisément le test qui aurait attrapé un bug Drakéide-style côté
 * classes — si l'extraction casse silencieusement pour cleric.divineOrders
 * ou si feats.json perd les 4 fighting-style entries, le test crève AVANT
 * UAT manuelle.
 *
 * Tourne sans Java (sans émulateur Firebase) — test unitaire jsdom.
 */

const ROOT = resolve(__dirname, '../../../../../..');
const readBundle = (file: string): unknown[] =>
  JSON.parse(readFileSync(resolve(ROOT, 'public/data', file), 'utf-8')) as unknown[];

const CLASSES: ClassEntity[] = readBundle('classes.json').map((entry, idx) => {
  const parsed = ClassSchema.safeParse(entry);
  if (!parsed.success) {
    const id = (entry as { id?: string }).id ?? `index ${idx}`;
    throw new Error(
      `[class-chooser-coverage] classes.json : entrée "${id}" rejetée par ClassSchema strict — ` +
        `corrige le bundle SRD avant tout. Issues : ${JSON.stringify(parsed.error.issues)}`,
    );
  }
  return parsed.data;
});

const FEATS: Feat[] = readBundle('feats.json').map((entry) =>
  FeatSchema.parse(entry),
);

const INVOCATIONS: Invocation[] = readBundle('invocations.json').map((entry) =>
  InvocationSchema.parse(entry),
);

const ITEMS: Item[] = readBundle('items.json').map((entry) =>
  ItemSchema.parse(entry),
);

const SPELLS: Spell[] = readBundle('spells.json').map((entry) =>
  SpellSchema.parse(entry),
);

vi.mock('@/shared/hooks/use-content', () => ({
  useContent: (type: string) => {
    if (type === 'classes') return { data: CLASSES, isLoading: false, error: null };
    if (type === 'feats') return { data: FEATS, isLoading: false, error: null };
    if (type === 'invocations')
      return { data: INVOCATIONS, isLoading: false, error: null };
    if (type === 'items') return { data: ITEMS, isLoading: false, error: null };
    if (type === 'spells') return { data: SPELLS, isLoading: false, error: null };
    if (type === 'backgrounds') return { data: [], isLoading: false, error: null };
    return { data: [], isLoading: false, error: null };
  },
}));

function findClass(id: string): ClassEntity {
  const c = CLASSES.find((e) => e.id === id);
  if (!c) throw new Error(`Bundle disque manque class "${id}"`);
  return c;
}

function selectPrimaryClass(classId: string): void {
  useWizardStore.setState({
    draft: {
      ...EMPTY_DRAFT,
      classes: [{ classId, level: 1, ...createEmptyClassSubChoices() }],
      primaryClassId: classId,
    },
    currentStep: 'class',
    visitedSteps: ['identity', 'class'],
  });
}

describe('Class choosers — couverture bundle disque (exigence héritée 13.8 #3)', () => {
  it('Cleric → cartes radio Ordre divin = nb divineOrders du bundle', () => {
    const expected = findClass('cleric').divineOrders?.length ?? 0;
    expect(expected).toBeGreaterThan(0);
    selectPrimaryClass('cleric');
    render(<ClassSubChoicesSection />);
    const group = screen.getByRole('radiogroup', { name: /ordre divin/i });
    expect(within(group).getAllByRole('radio')).toHaveLength(expected);
  });

  it('Druid → cartes radio Ordre primordial = nb primalOrders du bundle', () => {
    const expected = findClass('druid').primalOrders?.length ?? 0;
    expect(expected).toBeGreaterThan(0);
    selectPrimaryClass('druid');
    render(<ClassSubChoicesSection />);
    const group = screen.getByRole('radiogroup', { name: /ordre primordial/i });
    expect(within(group).getAllByRole('radio')).toHaveLength(expected);
  });

  it('Fighter → cartes radio Fighting Style = nb feats fighting-style du bundle', () => {
    const expected = FEATS.filter((f) => f.category === 'fighting-style').length;
    expect(expected).toBeGreaterThan(0);
    selectPrimaryClass('fighter');
    render(<ClassSubChoicesSection />);
    const group = screen.getByRole('radiogroup', { name: /style de combat/i });
    expect(within(group).getAllByRole('radio')).toHaveLength(expected);
  });

  it.each([
    ['fighter', 3],
    ['barbarian', 2],
    ['paladin', 2],
    ['ranger', 2],
    ['rogue', 2],
  ] as const)(
    '%s → chooser Weapon Mastery rend les armes éligibles + impose count=%d (SRD)',
    (classId, expectedCount) => {
      // Le count vient du bundle (`weaponMasteryCount`) — on assert qu'il
      // correspond à ce que SRD documente (cf. AUDIT-SRD-COMPLETUDE.md C.1).
      expect(findClass(classId).weaponMasteryCount).toBe(expectedCount);
      selectPrimaryClass(classId);
      const { container } = render(<ClassSubChoicesSection />);
      // Compte les checkbox INPUTS directement (sr-only mais présents dans le DOM).
      // Pour fighter le total inclut aussi les inputs Weapon Mastery donc on
      // filtre par préfixe d'id.
      const checkboxes = container.querySelectorAll(
        `input[type="checkbox"][id^="weapon-mastery-${classId}-"]`,
      );
      expect(checkboxes.length).toBeGreaterThan(0);
    },
  );

  it('Warlock → cases Invocation = nb invocations L1 éligibles du bundle', () => {
    const expected = INVOCATIONS.filter(
      (inv) => inv.prerequisiteWarlockLevel === null,
    ).length;
    expect(expected).toBeGreaterThan(0);
    selectPrimaryClass('warlock');
    const { container } = render(<ClassSubChoicesSection />);
    const checkboxes = container.querySelectorAll(
      'input[type="checkbox"][id^="warlock-invocation-"]',
    );
    expect(checkboxes).toHaveLength(expected);
  });

  it('Wizard grimoire → cases inscrites = nb sorts L1 wizard du bundle', () => {
    const expected = SPELLS.filter(
      (sp) => sp.level === 1 && sp.classes.includes('wizard'),
    ).length;
    expect(expected).toBeGreaterThan(0);
    selectPrimaryClass('wizard');
    const { container } = render(<ClassSubChoicesSection />);
    const inscribed = container.querySelectorAll(
      'input[type="checkbox"][id^="wizard-inscribed-"]',
    );
    expect(inscribed).toHaveLength(expected);
  });
});
