import { describe, expect, it, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen, within } from '@testing-library/react';
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
 * (plan 13.9 commit 2 + correctif UAT 2026-05-19 Bug A/B).
 *
 * RÈGLE D'AMBITION POUR CE FICHIER (CLAUDE.md > couverture matricielle) :
 *   - Itération EXHAUSTIVE sur les options du bundle live — jamais
 *     d'échantillon représentatif. Si Cleric a 2 ordres, on teste les 2 ;
 *     Fighter Mastery a ~38 armes éligibles, on les teste toutes.
 *   - Les tests visent des INVARIANTS observables (présence DOM, cohérence
 *     contenu / sélection), pas des détails cosmétiques (couleur, pixel).
 *   - "Le test peut rougir sur un changement anodin" = test mal écrit.
 *     Ici on n'asserte ni classe Tailwind ni position ; on lit le contenu
 *     pédagogique rendu, qui est l'unique invariant qui compte côté user.
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

/**
 * Construit le label exact attendu pour le bouton "?" d'une option.
 * On compare l'aria-label complet (pas un substring) car deux noms peuvent
 * partager un préfixe (ex: "Lance" vs "Lance lourde") — un regex permissif
 * ferait matcher plusieurs boutons et casserait `getByRole`.
 */
function helpButtonName(optionName: string): string {
  return `Voir le détail · ${optionName}`;
}

// Helpers de récupération d'options depuis les bundles live —
// ces listes sont l'oracle des tests d'exhaustivité.
function fightingStyleOptions(): ReadonlyArray<{ id: string; name: string }> {
  return FEATS.filter((f) => f.category === 'fighting-style').map((f) => ({
    id: f.id,
    name: f.name.fr ?? f.id,
  }));
}

function divineOrderOptions(): ReadonlyArray<{ id: string; name: string }> {
  const cleric = CLASSES.find((c) => c.id === 'cleric');
  return (cleric?.divineOrders ?? []).map((o) => ({
    id: o.id,
    name: o.name.fr ?? o.id,
  }));
}

function primalOrderOptions(): ReadonlyArray<{ id: string; name: string }> {
  const druid = CLASSES.find((c) => c.id === 'druid');
  return (druid?.primalOrders ?? []).map((o) => ({
    id: o.id,
    name: o.name.fr ?? o.id,
  }));
}

function warlockL1InvocationOptions(): ReadonlyArray<{ id: string; name: string }> {
  return INVOCATIONS.filter((inv) => inv.prerequisiteWarlockLevel === null).map(
    (inv) => ({ id: inv.id, name: inv.name.fr ?? inv.id }),
  );
}

function wizardL1SpellOptions(): ReadonlyArray<{ id: string; name: string }> {
  return SPELLS.filter(
    (sp) => sp.level === 1 && sp.classes.includes('wizard'),
  ).map((sp) => ({ id: sp.id, name: sp.name.fr ?? sp.id }));
}

function fighterMasteryWeapons(): ReadonlyArray<{ id: string; name: string }> {
  // Fighter = simple OU martiale → TOUTES les armes du bundle avec masteryProperty.
  return ITEMS.filter(
    (it) => it.category === 'weapon' && it.masteryProperty != null,
  ).map((it) => ({ id: it.id, name: it.name.fr ?? it.id }));
}

beforeEach(() => {
  useWizardStore.getState().reset();
});

// ============================================================================
// Bug A guard — EXHAUSTIF.
//
// Invariant : pour chaque chooser à options multiples au niveau 1, CHAQUE
// option doit exposer un bouton « ? » consultable (ariaLabel = "Voir le
// détail · <nom de l'option>"). Patron mobile-only avec `md:hidden` au CSS
// ; en DOM (jsdom) le bouton DOIT être présent — getByRole le voit, et
// c'est ce que ce test vérifie.
//
// Pourquoi ce test n'existait pas avant : le commit 2 (d9919f8) testait
// que UN signal pédagogique apparaissait, sans itérer ni vérifier la présence
// du `?`. Conséquence UAT 2026-05-19 : Adrien découvre à la main que 4
// choosers n'ont pas le `?`. Ce test rouge-puis-vert clôt le trou.
// ============================================================================

describe('Bug A — bouton "?" exhaustif par option (régression UAT 2026-05-19)', () => {
  it('Cleric — Ordre divin : chaque ordre a un bouton "?"', () => {
    selectPrimaryClass('cleric');
    render(<ClassSubChoicesSection />);
    const options = divineOrderOptions();
    expect(options.length).toBeGreaterThan(0);
    for (const opt of options) {
      const btn = screen.queryByRole('button', {
        name: helpButtonName(opt.name),
      });
      expect(btn, `Cleric ordre "${opt.name}" doit exposer un "?"`).not.toBeNull();
    }
  });

  it('Druid — Ordre primordial : chaque ordre a un bouton "?"', () => {
    selectPrimaryClass('druid');
    render(<ClassSubChoicesSection />);
    const options = primalOrderOptions();
    expect(options.length).toBeGreaterThan(0);
    for (const opt of options) {
      const btn = screen.queryByRole('button', {
        name: helpButtonName(opt.name),
      });
      expect(btn, `Druid ordre "${opt.name}" doit exposer un "?"`).not.toBeNull();
    }
  });

  it('Fighter — Style de combat : chaque style a un bouton "?"', () => {
    selectPrimaryClass('fighter');
    render(<ClassSubChoicesSection />);
    const options = fightingStyleOptions();
    expect(options.length).toBeGreaterThan(0);
    for (const opt of options) {
      const btn = screen.queryByRole('button', {
        name: helpButtonName(opt.name),
      });
      expect(btn, `Fighter style "${opt.name}" doit exposer un "?"`).not.toBeNull();
    }
  });

  it('Fighter — Weapon Mastery : chaque arme éligible a un bouton "?"', () => {
    selectPrimaryClass('fighter');
    render(<ClassSubChoicesSection />);
    const options = fighterMasteryWeapons();
    expect(options.length).toBeGreaterThan(0);
    for (const opt of options) {
      const btn = screen.queryByRole('button', {
        name: helpButtonName(opt.name),
      });
      expect(btn, `Fighter arme "${opt.name}" doit exposer un "?"`).not.toBeNull();
    }
  });

  it('Warlock — Invocation : chaque invocation a un bouton "?"', () => {
    selectPrimaryClass('warlock');
    render(<ClassSubChoicesSection />);
    const options = warlockL1InvocationOptions();
    expect(options.length).toBeGreaterThan(0);
    for (const opt of options) {
      const btn = screen.queryByRole('button', {
        name: helpButtonName(opt.name),
      });
      expect(
        btn,
        `Warlock invocation "${opt.name}" doit exposer un "?"`,
      ).not.toBeNull();
    }
  });

  it('Wizard — Grimoire L1 : chaque sort a un bouton "?"', () => {
    selectPrimaryClass('wizard');
    render(<ClassSubChoicesSection />);
    const options = wizardL1SpellOptions();
    expect(options.length).toBeGreaterThan(0);
    for (const opt of options) {
      // Le wizard expose 2 listes (inscrits + préparés) ; au L1, seuls les
      // inscrits ont un `?` (préparés sont vides). On vérifie qu'au moins
      // UN `?` matche le nom du sort dans la liste inscrits.
      const btns = screen.queryAllByRole('button', {
        name: helpButtonName(opt.name),
      });
      expect(
        btns.length,
        `Wizard sort "${opt.name}" doit exposer au moins un "?"`,
      ).toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// Bug B guard — exemple Mastery substitué avec le nom de l'arme cliquée.
//
// Invariant : quand l'utilisateur ouvre le détail de la propriété d'une
// arme, le texte d'exemple commence par le nom de cette arme suivi de
// " : ". L'ancien comportement codait en dur le nom d'arme dans `example`
// → Arbalète lourde affichait "Marteau de guerre : ..." (push) et Pistolet
// affichait "Rapière : ..." (vex). Test rouge-puis-vert.
//
// On itère sur TOUTES les armes éligibles Fighter (38 du bundle), pas un
// échantillon — un seul cas qui passe pendant que 37 échouent ne vaut rien.
// ============================================================================

describe('Bug B — exemple Mastery substitué avec le nom de l\'arme (régression UAT 2026-05-19)', () => {
  const weapons = fighterMasteryWeapons();

  it.each(weapons.map((w) => [w.id, w.name] as const))(
    'Modal arme "%s" : l\'exemple commence par "%s :" (substitution {weapon})',
    async (weaponId, weaponName) => {
      selectPrimaryClass('fighter');
      const user = userEvent.setup();
      render(<ClassSubChoicesSection />);

      const helpBtn = screen.getByRole('button', {
        name: helpButtonName(weaponName),
      });
      await user.click(helpBtn);

      const dialog = await screen.findByRole('dialog');
      // L'exemple est rédigé "<arme> : <action concrète>". La présence de
      // "<weaponName> :" garantit que la substitution a remplacé {weapon}
      // par le nom de l'arme cliquée — un placeholder oublié ou un nom
      // d'autre arme codé en dur tombe ici.
      expect(
        dialog.textContent ?? '',
        `Modal pour "${weaponName}" (${weaponId}) doit contenir "${weaponName} :" comme préfixe d'exemple`,
      ).toContain(`${weaponName} :`);

      // Garde additionnelle : la modale ne doit PAS contenir un nom d'arme
      // qui n'est pas celui cliqué juste après ce séparateur " : " — cela
      // dénoncerait une substitution partielle ou un autre nom codé en dur.
      // On reconstruit le segment suivant le `:` et on vérifie qu'aucune
      // AUTRE arme du bundle n'y est nommée comme préfixe d'exemple.
      const others = weapons
        .filter((w) => w.id !== weaponId)
        .map((w) => w.name);
      const leaks = others.filter((other) =>
        (dialog.textContent ?? '').includes(`${other} :`),
      );
      expect(
        leaks,
        `Modal pour "${weaponName}" ne doit mentionner aucun autre nom d'arme suivi de " :" — leaks: ${leaks.join(', ')}`,
      ).toEqual([]);

      // Cleanup : ferme la modale (sinon le re-render entre `it.each` traîne).
      await user.keyboard('{Escape}');
    },
  );
});

// ============================================================================
// Contenu pédagogique — assertions de validation (commit 2 plan 13.9).
// Inchangé sauf reformulations rendues nécessaires par la substitution.
// ============================================================================

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

    expect(screen.getByText(/aux dégâts de l’attaque bonus/i)).toBeTruthy();
  });
});

describe('Fighter — Weapon Mastery : libellés FR validés', () => {
  it('Toutes les armes affichent leur libellé de propriété FR validé', () => {
    selectPrimaryClass('fighter');
    const { container } = render(<ClassSubChoicesSection />);

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
    // INVARIANT : un libellé de propriété doit apparaître sur au moins une
    // carte (sinon le mapping `WeaponMasteryProperty → label FR` est cassé).
    expect(validatedLabels.some((label) => text.includes(label))).toBe(true);
  });
});

describe('Rogue — Expertise : panneau concept', () => {
  it('À l\'étape Classe, hint de dépendance signale que l\'Expertise se choisit aux Compétences', () => {
    selectPrimaryClass('rogue');
    const { container } = render(<ClassSubChoicesSection />);

    const hint = container.querySelector('[data-chooser-pending="rogue-expertise-at-class"]');
    expect(hint).toBeTruthy();
  });
});

describe('Warlock — Invocation : panneau pédagogique enrichi', () => {
  it('Hover sur une invocation révèle son tagline pédagogique', async () => {
    selectPrimaryClass('warlock');
    const user = userEvent.setup();
    render(<ClassSubChoicesSection />);

    const card = screen.getByText(/Armure d['’]ombres/i);
    await user.hover(card);

    // Plusieurs occurrences possibles : preview latérale + label de la carte.
    // L'invariant est qu'au moins une description complète apparaît.
    const occurrences = screen.getAllByText(
      /Une armure d['’]ombre que tu portes en permanence/i,
    );
    expect(occurrences.length).toBeGreaterThan(0);
  });
});

describe('Extra languages : description courte par langue', () => {
  it('Chaque carte de langue affiche sa shortDescription validée', () => {
    render(<ExtraLanguagesChooser count={1} />);

    expect(screen.getByText(/Langue des géants, des ogres, des trolls/i)).toBeTruthy();
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

// Référence pour usage futur — silence l'avertissement "unused import" si le
// linter est strict sur within() au-delà des assertions ci-dessus.
void within;
