import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { EMPTY_DRAFT, useWizardStore } from '@/shared/lib/slices/wizard-slice';
import { EMPTY_ANCESTRY_SUB_CHOICES, createEmptyClassSubChoices } from '@/shared/types/character';

import { ClassSubChoicesSection } from '../class/class-sub-choices-section';
import { SkillsStep } from '../skills-step';
import {
  isSkillsValid,
  type ValidationContext,
} from '../../wizard-validation';
import type { ClassEntity } from '@/shared/types/content';

/**
 * Bug Roublard plan 13.9 UAT 2026-05-18 :
 *   La bannière `ChooserMissingDataBanner` (rouge "Options indisponibles /
 *   recharge la page") s'affichait sous le chooser Weapon Mastery du Roublard
 *   parce que le `RogueExpertiseChooser` était rendu à l'étape Classe — où le
 *   pool (= compétences déjà maîtrisées) est forcément vide (step Compétences
 *   pas encore visitée). La bannière mentait : ce n'était PAS une panne, juste
 *   du séquencement.
 *
 * Option B retenue (plan 13.9 fix) :
 *   - À l'étape Classe : un `ChooserDependencyHint` neutre indique que
 *     l'Expertise se choisira à l'étape Compétences. AUCUN `RogueExpertiseChooser`
 *     n'est rendu (donc plus de bannière mensongère).
 *   - À l'étape Compétences : `<RogueExpertiseChooser />` est rendu APRÈS la
 *     grille de skills. Pool calculé en live à partir de
 *     `background + ancestry + pickedSkills` — recalcul réactif quand le
 *     joueur coche/décoche un pick de classe.
 *   - Orphan pruning : si une compétence cochée en Expertise sort du pool
 *     (parce que l'utilisateur a décoché ce pick de classe), l'ID Expertise
 *     est silencieusement retiré du draft.
 *   - `isSkillsValid` : pour le Roublard, valide UNIQUEMENT si
 *     `expertiseSkills.length === 2` ET picks complets.
 *
 * Rouge-avant-vert : ces tests DOIVENT être rouges sur le code pré-fix qui
 *   - rendait `RogueExpertiseChooser` à l'étape Classe → bannière empty visible
 *   - ne rendait PAS l'Expertise à l'étape Compétences
 *   - ne pruning rien automatiquement
 *   - n'incluait pas expertise dans `isSkillsValid`
 */

const ROGUE_FIXTURE = {
  id: 'rogue',
  name: { fr: 'Roublard', en: 'Rogue' },
  hitDie: 'd8',
  primaryAbility: ['dex'],
  saveProficiencies: ['dex', 'int'],
  armorProficiencies: [],
  weaponProficiencies: [],
  toolProficiencies: [],
  // 4 skills à piquer dans un pool typique Rogue SRD 2024.
  skillChoices: {
    count: 4,
    from: ['Acrobatics', 'Athletics', 'Deception', 'Investigation', 'Perception', 'Stealth'],
  },
  weaponMasteryCount: 2,
  spellcasting: null,
  startingEquipment: { options: [{ items: [], coins: null }] },
  description: { fr: '.', en: '.' },
  features: [],
  source: 'srd-5.2.1',
} as const;

const CRIMINAL_FIXTURE = {
  id: 'criminal',
  name: { fr: 'Criminel', en: 'Criminal' },
  description: { fr: '.', en: '.' },
  skillProficiencies: ['Sleight of Hand', 'Stealth'],
  toolProficiencies: [],
  languages: 0,
  equipment: [],
  startingCoins: null,
  feature: { name: { fr: '.', en: '.' }, description: { fr: '.', en: '.' } },
  source: 'srd-5.2.1',
} as const;

vi.mock('@/shared/hooks/use-content', () => ({
  useContent: (type: string) => {
    if (type === 'classes') return { data: [ROGUE_FIXTURE], loading: false, error: null };
    if (type === 'backgrounds')
      return { data: [CRIMINAL_FIXTURE], loading: false, error: null };
    if (type === 'items')
      return {
        // 1 arme simple + 1 arme martiale finesse pour ne pas vider le chooser
        // mastery (sinon il afficherait sa propre bannière empty).
        data: [
          {
            id: 'dagger',
            name: { fr: 'Dague', en: 'Dagger' },
            category: 'weapon',
            weight: 1,
            weaponProperties: ['finesse', 'light', 'thrown'],
            weaponType: 'simple',
            damage: { dice: '1d4', type: 'piercing' },
            masteryProperty: 'nick',
            source: 'srd-5.2.1',
          },
          {
            id: 'shortsword',
            name: { fr: 'Épée courte', en: 'Shortsword' },
            category: 'weapon',
            weight: 2,
            weaponProperties: ['finesse', 'light'],
            weaponType: 'martial',
            damage: { dice: '1d6', type: 'piercing' },
            masteryProperty: 'vex',
            source: 'srd-5.2.1',
          },
        ],
        loading: false,
        error: null,
      };
    if (type === 'feats') return { data: [], loading: false, error: null };
    if (type === 'invocations') return { data: [], loading: false, error: null };
    if (type === 'spells') return { data: [], loading: false, error: null };
    return { data: [], loading: false, error: null };
  },
}));

vi.mock('@/shared/lib/content-loader', () => ({
  invalidatePublicContent: vi.fn().mockResolvedValue(undefined),
}));

interface DraftSetup {
  classId?: string;
  backgroundId?: string;
  ancestryExtraSkill?: string | null;
  pickedSkills?: string[];
  expertiseSkills?: string[];
}

function seedDraft(setup: DraftSetup = {}): void {
  const classId = setup.classId ?? 'rogue';
  useWizardStore.setState({
    draft: {
      ...EMPTY_DRAFT,
      primaryClassId: classId,
      classes: [
        {
          ...createEmptyClassSubChoices(),
          classId,
          level: 1,
          expertiseSkills: setup.expertiseSkills ?? [],
        },
      ],
      backgroundId: setup.backgroundId ?? null,
      ancestrySubChoices: {
        ...EMPTY_ANCESTRY_SUB_CHOICES,
        ancestryExtraSkill: setup.ancestryExtraSkill ?? null,
      },
      pickedSkills: setup.pickedSkills ?? [],
    },
    currentStep: 'skills',
    visitedSteps: ['identity', 'class', 'ancestry', 'abilities', 'background', 'skills'],
  });
}

beforeEach(() => {
  useWizardStore.getState().reset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('Roublard — Expertise rendue à l\'étape Compétences (Option B, plan 13.9 UAT)', () => {
  it("Class step : pas de RogueExpertiseChooser, hint neutre à la place — pas de bannière 'panne'", () => {
    seedDraft();
    render(<ClassSubChoicesSection />);

    // Le hint d'attente est présent (neutre, non alarmant, role=status).
    expect(
      document.querySelector('[data-chooser-pending="rogue-expertise-at-class"]'),
    ).not.toBeNull();
    // La bannière "panne" `data-chooser-empty="rogue-expertise"` NE DOIT PAS
    // s'afficher — l'Expertise n'est pas rendue ici, donc pas de fallback empty.
    expect(
      document.querySelector('[data-chooser-empty="rogue-expertise"]'),
    ).toBeNull();
  });

  it("Skills step : pour le Roublard, le chooser Expertise est rendu après la grille (legend Expertise visible)", () => {
    seedDraft({ backgroundId: 'criminal', pickedSkills: ['acrobatics', 'athletics'] });
    render(<SkillsStep />);

    // La legend Expertise apparaît côté Skills step.
    expect(
      screen.getByText(/Expertise/i, { selector: 'legend' }),
    ).toBeTruthy();
  });

  it('Skills step : le pool Expertise reflète les picks de classe (recalcul live, pas un snapshot au montage)', async () => {
    seedDraft({ backgroundId: 'criminal', pickedSkills: [] });
    const user = userEvent.setup();
    const { container } = render(<SkillsStep />);

    // Avant pick : le pool ne contient que background skills (sleightOfHand +
    // stealth). La compétence "Acrobaties" ne doit PAS apparaître comme option
    // Expertise (id préfixé `rogue-expertise-*` côté chooser).
    expect(
      container.querySelector('#rogue-expertise-acrobatics'),
    ).toBeNull();

    // L'utilisateur coche Acrobaties dans la grille de classe.
    const acroPick = screen.getAllByRole('checkbox', { name: /Acrobaties/i })[0];
    if (!acroPick) throw new Error('Acrobaties checkbox introuvable');
    await user.click(acroPick);

    // Après pick : Acrobaties doit maintenant être dans le pool Expertise.
    expect(
      container.querySelector('#rogue-expertise-acrobatics'),
    ).not.toBeNull();
  });

  it('Pruning : décocher une skill de classe qui était en Expertise retire automatiquement l\'ID du draft', async () => {
    seedDraft({
      backgroundId: 'criminal',
      pickedSkills: ['acrobatics'],
      expertiseSkills: ['acrobatics'],
    });
    const user = userEvent.setup();
    render(<SkillsStep />);

    // Sanity : Expertise tient acrobatics au démarrage.
    expect(useWizardStore.getState().draft.classes[0]?.expertiseSkills).toContain(
      'acrobatics',
    );

    // L'utilisateur décoche Acrobaties dans la grille de classe.
    const acroPick = screen.getAllByRole('checkbox', { name: /Acrobaties/i })[0];
    if (!acroPick) throw new Error('Acrobaties checkbox introuvable');
    await user.click(acroPick);

    // Le pruning doit retirer acrobatics de expertiseSkills sans intervention manuelle.
    expect(useWizardStore.getState().draft.classes[0]?.expertiseSkills).not.toContain(
      'acrobatics',
    );
  });

  it('isSkillsValid : Roublard est INVALIDE tant que expertiseSkills.length < 2', () => {
    const baseDraft = {
      ...EMPTY_DRAFT,
      primaryClassId: 'rogue',
      classes: [
        {
          ...createEmptyClassSubChoices(),
          classId: 'rogue',
          level: 1,
          expertiseSkills: [] as string[],
        },
      ],
      pickedSkills: ['acrobatics', 'athletics', 'deception', 'investigation'], // 4 = count Rogue
    };
    const classes: ClassEntity[] = [
      ROGUE_FIXTURE as unknown as ClassEntity,
    ];
    const ctx: ValidationContext = { draft: baseDraft, classes };

    // 0 expertise → invalide
    expect(isSkillsValid(ctx)).toBe(false);

    // 1 expertise → toujours invalide
    const oneExpertise: ValidationContext = {
      draft: {
        ...baseDraft,
        classes: [{ ...baseDraft.classes[0]!, expertiseSkills: ['acrobatics'] }],
      },
      classes,
    };
    expect(isSkillsValid(oneExpertise)).toBe(false);

    // 2 expertise (pris parmi le pool maîtrisé) → valide
    const twoExpertise: ValidationContext = {
      draft: {
        ...baseDraft,
        classes: [
          {
            ...baseDraft.classes[0]!,
            expertiseSkills: ['acrobatics', 'athletics'],
          },
        ],
      },
      classes,
    };
    expect(isSkillsValid(twoExpertise)).toBe(true);
  });
});
