import { describe, expect, it, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

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
import { ExtraLanguagesChooser } from '../extra-languages-chooser';

/**
 * Tests panneaux d'aide pédagogiques pour les 8 sous-choix de classe
 * (plan 13.9 commit 2).
 *
 * Pour chaque chooser, on vérifie qu'au moins UN signal pédagogique propre
 * au contenu validé par Adrien apparaît à l'écran :
 *   - Choosers RadioCardGroup (cleric/druid/fighter) : la sélection d'une
 *     option fait apparaître le panneau d'aide latéral avec son tagline.
 *   - WeaponMasteryChooser : le hover/focus sur une arme révèle le label
 *     de propriété validé (Enchaînement / Écorchure / …).
 *   - RogueExpertiseChooser : panneau concept toujours affiché si pool ≠ ∅.
 *   - WarlockInvocationChooser : preview latérale + modale détail.
 *   - ExtraLanguagesChooser : description courte par langue présente.
 *   - WizardSpellbookChooser : panneau concept "Grimoire du Magicien" en haut.
 *
 * Bundles disque chargés en vrai — l'assertion porte sur le couplage code↔
 * help record validé tour par tour, pas sur une fixture inventée.
 */

const ROOT = resolve(__dirname, '../../../../../..');
const readBundle = (file: string): unknown[] =>
  JSON.parse(readFileSync(resolve(ROOT, 'public/data', file), 'utf-8')) as unknown[];

const CLASSES: ClassEntity[] = readBundle('classes.json').map((entry) =>
  ClassSchema.parse(entry),
);
const FEATS: Feat[] = readBundle('feats.json').map((entry) => FeatSchema.parse(entry));
const INVOCATIONS: Invocation[] = readBundle('invocations.json').map((entry) =>
  InvocationSchema.parse(entry),
);
const ITEMS: Item[] = readBundle('items.json').map((entry) => ItemSchema.parse(entry));
const SPELLS: Spell[] = readBundle('spells.json').map((entry) => SpellSchema.parse(entry));

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

vi.mock('@/shared/lib/content-loader', () => ({
  invalidatePublicContent: vi.fn().mockResolvedValue(undefined),
}));

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

beforeEach(() => {
  useWizardStore.getState().reset();
});

describe('Cleric — Ordre divin : panneau d\'aide', () => {
  it('Selection de Protecteur révèle son tagline pédagogique', async () => {
    selectPrimaryClass('cleric');
    const user = userEvent.setup();
    render(<ClassSubChoicesSection />);

    const radio = screen.getByRole('radio', { name: /protecteur/i });
    await user.click(radio);

    expect(screen.getByText(/Clerc martial, armé pour le front/i)).toBeTruthy();
  });

  it('Selection de Thaumaturge mentionne le bonus aux tests d\'INT', async () => {
    selectPrimaryClass('cleric');
    const user = userEvent.setup();
    render(<ClassSubChoicesSection />);

    const radio = screen.getByRole('radio', { name: /thaumaturge/i });
    await user.click(radio);

    // Vérifie le bonus aux tests d'INT (mod Sagesse min +1) du PDF SRD.
    expect(
      screen.getByText(/modificateur de Sagesse \(minimum \+1\)/i),
    ).toBeTruthy();
  });
});

describe('Druid — Ordre primordial : panneau d\'aide', () => {
  it('Selection de Mage révèle son tagline pédagogique', async () => {
    selectPrimaryClass('druid');
    const user = userEvent.setup();
    render(<ClassSubChoicesSection />);

    const radios = screen.getAllByRole('radio');
    // Le bundle FR a "Mage" ; on prend le premier radio (magician).
    await user.click(radios[0]!);

    expect(screen.getByText(/Druide-mage, canal de la magie naturelle/i)).toBeTruthy();
  });
});

describe('Fighter — Style de combat : panneau d\'aide', () => {
  it('Selection de Archerie révèle le tagline Archer', async () => {
    selectPrimaryClass('fighter');
    const user = userEvent.setup();
    render(<ClassSubChoicesSection />);

    const radio = screen.getByRole('radio', { name: /archerie/i });
    await user.click(radio);

    expect(screen.getByText(/Archer — précision au-dessus de la mêlée/i)).toBeTruthy();
  });

  it('Selection de Combat à deux armes mentionne la correction dégâts (pas attaque)', async () => {
    selectPrimaryClass('fighter');
    const user = userEvent.setup();
    render(<ClassSubChoicesSection />);

    const radio = screen.getByRole('radio', { name: /combat à deux armes/i });
    await user.click(radio);

    // Le brouillon validé corrige le SRD : modificateur aux DÉGÂTS, pas à l'attaque.
    expect(screen.getByText(/aux dégâts de l’attaque bonus/i)).toBeTruthy();
  });
});

describe('Fighter — Weapon Mastery : panneau d\'aide propriété', () => {
  it('Focus sur une arme révèle le label FR validé (Renversement, Ouverture, etc.)', async () => {
    selectPrimaryClass('fighter');
    const { container } = render(<ClassSubChoicesSection />);

    // Le label de propriété est affiché sur chaque carte d'arme via le bundle.
    // Au moins UN des libellés FR validés doit être présent à l'écran sans
    // interaction (le label apparaît directement sur la carte).
    const text = container.textContent ?? '';
    const validatedLabels = [
      'Enchaînement',
      'Écorchure',
      'Coup double',
      'Poussée',
      'Sape',
      'Ralentissement',
      'Renversement',
      'Ouverture',
    ];
    expect(validatedLabels.some((label) => text.includes(label))).toBe(true);
  });
});

describe('Rogue — Expertise : panneau concept', () => {
  it('À l\'étape Classe, hint de dépendance signale que l\'Expertise se choisit aux Compétences', () => {
    // RogueExpertiseChooser vit dans `SkillsStep`, pas dans ClassSubChoicesSection
    // (Option B plan 13.9 UAT). On vérifie ici qu'à l'étape Classe le hint de
    // dépendance est rendu (le chooser réel + son panneau concept vivent ailleurs).
    selectPrimaryClass('rogue');
    const { container } = render(<ClassSubChoicesSection />);

    // Cherche le hint via data-chooser ou la phrase clé "à l'étape Compétences"
    const hint = container.querySelector('[data-chooser-pending="rogue-expertise-at-class"]');
    expect(hint).toBeTruthy();
  });
});

describe('Warlock — Invocation : panneau pédagogique enrichi', () => {
  it('Hover sur une invocation révèle son tagline pédagogique', async () => {
    selectPrimaryClass('warlock');
    const user = userEvent.setup();
    render(<ClassSubChoicesSection />);

    // Le bundle FR utilise une apostrophe droite (`'`, U+0027) — notre help
    // record utilise une apostrophe courbe (`’`, U+2019). Regex robuste aux deux.
    const card = screen.getByText(/Armure d['’]ombres/i);
    await user.hover(card);

    expect(
      screen.getByText(/Une armure d['’]ombre que tu portes en permanence/i),
    ).toBeTruthy();
  });
});

describe('Extra languages : description courte par langue', () => {
  it('Chaque carte de langue affiche sa shortDescription validée', () => {
    render(<ExtraLanguagesChooser count={1} />);

    // "Langue des géants, des ogres, des trolls." — entrée validée pour 'giant'.
    expect(screen.getByText(/Langue des géants, des ogres, des trolls/i)).toBeTruthy();
    // "Langue des dragons et de leurs serviteurs kobolds." — entrée validée pour 'draconic'.
    expect(
      screen.getByText(/Langue des dragons et de leurs serviteurs kobolds/i),
    ).toBeTruthy();
  });
});

describe('Wizard spellbook : panneau concept', () => {
  it('Panneau "Grimoire du Magicien" en haut du chooser', () => {
    selectPrimaryClass('wizard');
    render(<ClassSubChoicesSection />);

    expect(screen.getByText(/Grimoire du Magicien/i)).toBeTruthy();
    expect(
      screen.getByText(
        /Ton grimoire contient 6 sorts ; chaque matin tu en prépares 4/i,
      ),
    ).toBeTruthy();
  });
});
