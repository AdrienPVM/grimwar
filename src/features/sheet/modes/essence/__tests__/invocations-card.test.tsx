import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type {
  Character,
  CharacterClassEntry,
} from '@/shared/types/character';

import { InvocationsCard } from '../invocations-card';
import {
  expectNoForbiddenEnglish,
  expectNoForbiddenNonOfficialFr,
} from '../../../../../../tests/helpers/i18n-guard';

import invocationsBundle from '../../../../../../public/data/invocations.json';

/**
 * Plan 13.9 commit 4e — render Essence de la Manifestation occulte de
 * l'Occultiste. Parité de tests avec `divine-order-card.test.tsx` /
 * `primal-order-card.test.tsx` (commit 4b), étendue au cas-limite « plusieurs
 * invocations » (anticipation level-up : un Warlock L5 peut en avoir 3, et
 * l'ordre + l'unicité d'affichage doit rester stable).
 *
 * Six catégories de « Vérité du contenu » (testing policy 2026-05-19) :
 *   1. Référentielle : déjà couverte par `content-referential-integrity` —
 *      ce fichier ajoute un garde-fou local sur les 5 slugs L1 de
 *      `invocations.json` (le composant doit savoir tous les rendre).
 *   2. Identité du contenu modale : tap invocation X → modale affiche
 *      EXACTEMENT le `name.fr` + `summary.fr` du bundle pour X, jamais
 *      ceux d'une autre invocation. Itération exhaustive sur les 5 L1.
 *   3. Fidélité bundle : 5 entrées L1 figées en données canoniques au top
 *      du fichier (FROZEN_L1_INVOCATIONS) ; toute dérive du bundle FR
 *      casse le test.
 *   4. Calculs de règles : NON APPLICABLE pour ces 5 invocations L1
 *      (aucun DD, aucun dégât, aucun bonus chiffré côté invocation L1 —
 *      les chiffres viennent du sort lancé via Armure du mage, du familier
 *      conjuré via Pacte de la chaîne, etc., pas de l'invocation elle-même).
 *      Justification explicite documentée ici pour future audit.
 *   5. Cohérence wizard → fiche : seed Occultiste avec
 *      `eldritchInvocations=['armor-of-shadows']` (= choix wizard) → carte
 *      rend EXACTEMENT « Armure d'ombres », JAMAIS « Esprit occulte » ou
 *      autre.
 *   6. Cas-limite — multi-invocations : seed avec 2 slugs distincts → les 2
 *      sont rendus, ordre alphabétique stable, pas de duplication. Et un
 *      seed mal formé (slug dupliqué) → 1 seul rendu (dédoublonnage défensif).
 *
 * Garde-fous transversaux i18n : aucune fuite EN, aucun terme FR
 * non-officiel ne doit traverser le rendu (acté 2026-05-20).
 *
 * Source = bundle SRD `public/data/invocations.json`. Pas de fixture
 * locale — toute désynchro bundle ↔ rendu attrape le test.
 */

interface InvocationBundleEntry {
  id: string;
  name: { fr: string; en?: string };
  summary: { fr: string; en?: string };
  prerequisiteWarlockLevel: number | null;
}

const L1_INVOCATIONS = (invocationsBundle as InvocationBundleEntry[]).filter(
  (i) => i.prerequisiteWarlockLevel === null,
);

/**
 * Cat. 3 (fidélité bundle figée). Les 5 invocations L1 SRD 5.2.1, vérifiées
 * UNE FOIS contre la source officielle (SRD FR) en amont — si le bundle
 * dérive, ce tableau et le bundle divergent et le test rougit. Le test fige
 * la vérité, l'humain ne re-vérifie pas à chaque run.
 */
const FROZEN_L1_INVOCATIONS = [
  { id: 'armor-of-shadows', name: "Armure d'ombres" },
  { id: 'eldritch-mind', name: 'Esprit occulte' },
  { id: 'pact-of-the-blade', name: 'Pacte de la lame' },
  { id: 'pact-of-the-chain', name: 'Pacte de la chaîne' },
  { id: 'pact-of-the-tome', name: 'Pacte du grimoire' },
] as const;

vi.mock('@/shared/hooks/use-content', () => ({
  useContent: (type: string) => {
    if (type === 'invocations') {
      return { data: invocationsBundle, isLoading: false, error: null };
    }
    return { data: [], isLoading: false, error: null };
  },
}));

function classEntry(
  partial: Partial<CharacterClassEntry> & Pick<CharacterClassEntry, 'classId'>,
): CharacterClassEntry {
  return {
    subclassId: null,
    level: 1,
    clericDivineOrder: null,
    druidPrimalOrder: null,
    fighterFightingStyle: null,
    weaponMasteries: [],
    expertiseSkills: [],
    eldritchInvocations: [],
    wizardSpellbookL1: [],
    ...partial,
  };
}

function buildCharacter(classes: CharacterClassEntry[]): Character {
  return {
    id: 'test',
    name: 'Test',
    status: 'alive',
    classes,
    totalLevel: classes.reduce((s, c) => s + c.level, 0),
    primaryClassId: classes[0]?.classId ?? 'warlock',
    ancestryId: 'human',
    ancestrySubChoices: {
      dragonAncestry: null,
      tieflingLegacy: null,
      elfLineage: null,
      gnomeLineage: null,
      goliathAncestry: null,
      ancestryCastingAbility: null,
      ancestryExtraSkill: null,
      ancestrySize: null,
    },
    backgroundId: 'charlatan',
    extraLanguages: [],
    experience: 0,
    alignment: 'CN',
    abilities: { for: 8, dex: 14, con: 13, int: 12, sag: 10, cha: 16 },
    saves: {
      for: false,
      dex: false,
      con: false,
      int: false,
      sag: true,
      cha: true,
    },
    skills: {},
    hp: { current: 9, max: 9, temp: 0 },
    ac: 12,
    speed: 30,
    initiative: 0,
    hitDice: [],
    deathSaves: { success: 0, fail: 0 },
    conditions: [],
    inspiration: false,
    exhaustion: 0,
    currentConcentration: null,
    classResources: {},
    spellSlots: {},
    preparedSpells: {},
    knownSpells: {},
    spellcastingAbility: {},
    inventory: {
      items: [],
      coins: { cu: 0, ar: 0, el: 0, or: 0, pl: 0 },
      weightCache: 0,
    },
    personality: { trait: '', ideal: '', bond: '', flaw: '', backstory: '' },
    featureUsage: {},
    extraProficiencies: { armor: [], weapons: [], tools: [], languages: [] },
    presentInCampaigns: [],
    homeCampaignId: null,
    stats: { totalRolls: 0, totalD20Sum: 0, crits: 0, fumbles: 0, skillUses: {} },
    portrait: { type: 'letter', value: 'T' },
    schemaVersion: 2,
    createdAt: null as never,
    updatedAt: null as never,
    updatedBy: 'test-uid',
  };
}

describe('<InvocationsCard>', () => {
  it('ne rend rien pour un perso non-Occultiste', () => {
    const character = buildCharacter([
      classEntry({ classId: 'fighter', eldritchInvocations: [] }),
    ]);
    const { container } = render(<InvocationsCard character={character} />);
    expect(container.firstChild).toBeNull();
  });

  it('ne rend rien pour un Occultiste sans invocation choisie (eldritchInvocations vide)', () => {
    const character = buildCharacter([
      classEntry({ classId: 'warlock', eldritchInvocations: [] }),
    ]);
    const { container } = render(<InvocationsCard character={character} />);
    expect(container.firstChild).toBeNull();
  });

  // ──────────────────────────────────────────────────────────────────────
  // Cat. 1 (référentielle locale) — garde-fou : les 5 invocations L1 du
  // bundle sont les 5 attendues. Si le bundle ajoute/retire/renomme un
  // slug L1 sans coordination avec ce composant, le test rougit.
  // ──────────────────────────────────────────────────────────────────────
  it('cat. 1 — garde-fou bundle ↔ 5 invocations L1 (slugs + count)', () => {
    expect(L1_INVOCATIONS.map((i) => i.id).sort()).toEqual(
      FROZEN_L1_INVOCATIONS.map((i) => i.id).sort(),
    );
  });

  // ──────────────────────────────────────────────────────────────────────
  // Cat. 3 (fidélité bundle) — chaque slug L1 a EXACTEMENT le `name.fr`
  // canonique vérifié contre le SRD FR officiel.
  // ──────────────────────────────────────────────────────────────────────
  it.each(FROZEN_L1_INVOCATIONS)(
    'cat. 3 — bundle: $id → name.fr = "$name" (figé contre SRD FR)',
    ({ id, name }) => {
      const entry = L1_INVOCATIONS.find((i) => i.id === id);
      expect(
        entry,
        `slug ${id} introuvable dans invocations.json L1`,
      ).toBeDefined();
      expect(entry?.name.fr).toBe(name);
    },
  );

  // ──────────────────────────────────────────────────────────────────────
  // Cat. 2 (identité) + Cat. 5 (cohérence wizard → fiche). Itération
  // exhaustive sur les 5 invocations L1 du bundle. Le slug posé au wizard
  // rend EXACTEMENT le name + summary du bundle, JAMAIS celui d'une autre.
  // ──────────────────────────────────────────────────────────────────────
  it.each(
    L1_INVOCATIONS.map((inv) => ({
      slug: inv.id,
      name: inv.name.fr,
      summary: inv.summary.fr,
      otherName:
        L1_INVOCATIONS.find((x) => x.id !== inv.id)?.name.fr ?? '',
    })),
  )(
    'cat. 2/5 — Occultiste avec eldritchInvocations=[$slug] → carte affiche "$name" + summary EXACT, jamais "$otherName"',
    ({ slug, name, summary, otherName }) => {
      const character = buildCharacter([
        classEntry({ classId: 'warlock', eldritchInvocations: [slug] }),
      ]);
      render(<InvocationsCard character={character} />);
      // Nom FR exact du bundle visible.
      expect(screen.getByText(name)).toBeInTheDocument();
      // Summary FR exact du bundle visible.
      expect(screen.getByText(summary)).toBeInTheDocument();
      // Test négatif Cat. 5 : aucune fuite d'une autre invocation.
      expect(screen.queryByText(otherName)).not.toBeInTheDocument();
    },
  );

  // ──────────────────────────────────────────────────────────────────────
  // Cat. 2 (identité) sur la modale ouverte. Tap → dialog visible →
  // kindLabel + name + summary EXACTS du bundle. Itération exhaustive sur
  // les 5 invocations L1 — pas d'échantillonnage.
  // ──────────────────────────────────────────────────────────────────────
  it.each(
    L1_INVOCATIONS.map((inv) => ({
      slug: inv.id,
      name: inv.name.fr,
      summary: inv.summary.fr,
      otherSummary:
        L1_INVOCATIONS.find((x) => x.id !== inv.id)?.summary.fr ?? '',
    })),
  )(
    'cat. 2 modale — tap sur $name ouvre la modale qui affiche EXACTEMENT $name + son summary, JAMAIS le summary d\'une autre invocation',
    ({ slug, name, summary, otherSummary }) => {
      const character = buildCharacter([
        classEntry({ classId: 'warlock', eldritchInvocations: [slug] }),
      ]);
      render(<InvocationsCard character={character} />);
      // État initial : pas de dialog.
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      // Tap → dialog.
      fireEvent.click(
        screen.getByRole('button', {
          name: new RegExp(`Manifestation occulte : ${name}`),
        }),
      );
      const dialog = screen.getByRole('dialog');
      // Le kindLabel « Manifestation occulte » est rendu dans le header de la modale.
      expect(
        within(dialog).getByText('Manifestation occulte'),
      ).toBeInTheDocument();
      // Le nom + summary EXACTS du bundle sont rendus.
      expect(within(dialog).getByText(name)).toBeInTheDocument();
      expect(within(dialog).getByText(summary)).toBeInTheDocument();
      // Test négatif : aucune fuite du summary d'une autre invocation.
      expect(within(dialog).queryByText(otherSummary)).not.toBeInTheDocument();
    },
  );

  // ──────────────────────────────────────────────────────────────────────
  // D13a + D13b + D13c — la modale rend la section « Mécanique » UNIQUEMENT
  // pour les invocations dont l'effet runtime est câblé. Aujourd'hui :
  // armor-of-shadows (D13a) + eldritch-mind (D13b) + pact-of-the-blade
  // (D13c). Le test sera étendu naturellement quand D13d-e atterrissent.
  // ──────────────────────────────────────────────────────────────────────
  it('D13a — tap sur Armure d\'ombres → modale rend la section « Mécanique » + le label CA', () => {
    const character = buildCharacter([
      classEntry({
        classId: 'warlock',
        eldritchInvocations: ['armor-of-shadows'],
      }),
    ]);
    render(<InvocationsCard character={character} />);
    fireEvent.click(
      screen.getByRole('button', {
        name: /Manifestation occulte : Armure d'ombres/,
      }),
    );
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Mécanique')).toBeInTheDocument();
    expect(
      within(dialog).getByTestId('invocation-effect-label'),
    ).toHaveTextContent(/CA = 13 \+ modificateur de Dextérité/);
  });

  it('D13b — tap sur Esprit occulte (eldritch-mind) → modale rend « Mécanique » + label Concentration', () => {
    const character = buildCharacter([
      classEntry({
        classId: 'warlock',
        eldritchInvocations: ['eldritch-mind'],
      }),
    ]);
    render(<InvocationsCard character={character} />);
    fireEvent.click(
      screen.getByRole('button', {
        name: /Manifestation occulte : Esprit occulte/,
      }),
    );
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Mécanique')).toBeInTheDocument();
    expect(
      within(dialog).getByTestId('invocation-effect-label'),
    ).toHaveTextContent(
      /Avantage aux jets de Constitution pour la Concentration/,
    );
  });

  it('D13c — tap sur Pacte de la lame → modale rend « Mécanique » + 4 lignes structurées + caveat différé', () => {
    const character = buildCharacter([
      classEntry({
        classId: 'warlock',
        eldritchInvocations: ['pact-of-the-blade'],
      }),
    ]);
    render(<InvocationsCard character={character} />);
    fireEvent.click(
      screen.getByRole('button', {
        name: /Manifestation occulte : Pacte de la lame/,
      }),
    );
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Mécanique')).toBeInTheDocument();
    expect(
      within(dialog).getByTestId('invocation-effect-label'),
    ).toHaveTextContent(/Arme de pacte invoquée/);
    expect(
      within(dialog).getByText(
        /Vous pouvez utiliser votre modificateur de Charisme/,
      ),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText(
        /Type de dégâts au choix : nécrotiques, psychiques, radiants/,
      ),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText(/intégration moteur de combat est différée/),
    ).toBeInTheDocument();
  });

  it.each(['pact-of-the-chain', 'pact-of-the-tome'])(
    'D13a/b/c — tap sur %s (D13d-e attendus) → modale NE rend PAS « Mécanique » (pas de faux signal)',
    (slug) => {
      const character = buildCharacter([
        classEntry({ classId: 'warlock', eldritchInvocations: [slug] }),
      ]);
      render(<InvocationsCard character={character} />);
      const button = screen.getByRole('button', {
        name: /Manifestation occulte :/,
      });
      fireEvent.click(button);
      const dialog = screen.getByRole('dialog');
      expect(within(dialog).queryByText('Mécanique')).not.toBeInTheDocument();
      expect(
        within(dialog).queryByTestId('invocation-effect-card'),
      ).not.toBeInTheDocument();
    },
  );

  it('cat. 2 modale — Échap ferme la modale après tap', () => {
    const character = buildCharacter([
      classEntry({
        classId: 'warlock',
        eldritchInvocations: ['armor-of-shadows'],
      }),
    ]);
    render(<InvocationsCard character={character} />);
    fireEvent.click(
      screen.getByRole('button', {
        name: /Manifestation occulte : Armure d'ombres/,
      }),
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  // ──────────────────────────────────────────────────────────────────────
  // Cat. 6 — cas-limite : multi-invocations (anticipation level-up).
  // Un Warlock L1 reçoit 1 invocation, L2 en gagne une 2e, etc. La carte
  // doit gérer N invocations dès maintenant sans régression d'ordre ni de
  // duplication. Ordre canonique : alphabétique FR (Armure < Pacte) — le
  // composant trie côté `localeCompare('fr')`.
  // ──────────────────────────────────────────────────────────────────────
  it('cat. 6 — multi-invocations : 2 slugs rendus, ordre alphabétique FR stable', () => {
    const character = buildCharacter([
      classEntry({
        classId: 'warlock',
        // Volontairement non-trié à l'entrée (Pacte avant Armure).
        eldritchInvocations: ['pact-of-the-blade', 'armor-of-shadows'],
      }),
    ]);
    render(<InvocationsCard character={character} />);
    const buttons = screen.getAllByRole('button', {
      name: /Manifestation occulte :/,
    });
    expect(buttons).toHaveLength(2);
    // Ordre FR : « Armure d'ombres » avant « Pacte de la lame ».
    expect(buttons[0]).toHaveAttribute(
      'aria-label',
      "Manifestation occulte : Armure d'ombres",
    );
    expect(buttons[1]).toHaveAttribute(
      'aria-label',
      'Manifestation occulte : Pacte de la lame',
    );
  });

  it('cat. 6 — cas-limite : slug dupliqué dans le seed → 1 seul rendu (dédoublonnage défensif)', () => {
    const character = buildCharacter([
      classEntry({
        classId: 'warlock',
        // Cas dégénéré (corruption migration / seed mal formé).
        eldritchInvocations: ['armor-of-shadows', 'armor-of-shadows'],
      }),
    ]);
    render(<InvocationsCard character={character} />);
    const buttons = screen.getAllByRole('button', {
      name: /Manifestation occulte : Armure d'ombres/,
    });
    expect(buttons).toHaveLength(1);
  });

  it('cat. 6 — slug inconnu dans eldritchInvocations → ignoré silencieusement (pas de crash, pas de stub vide)', () => {
    const character = buildCharacter([
      classEntry({
        classId: 'warlock',
        eldritchInvocations: ['invocation-fantome-inexistante'],
      }),
    ]);
    const { container } = render(<InvocationsCard character={character} />);
    // Aucune invocation résolue → carte ne rend rien (parité Order cards).
    expect(container.firstChild).toBeNull();
  });

  // ──────────────────────────────────────────────────────────────────────
  // Garde-fous i18n transversaux (Mastery EN, « tour de magie » non-officiel,
  // etc.). Itération exhaustive sur les 5 slugs L1.
  // ──────────────────────────────────────────────────────────────────────
  it.each(L1_INVOCATIONS.map((inv) => inv.id))(
    'i18n-guard — aucune fuite EN ni terme FR non-officiel dans le rendu pour %s',
    (slug) => {
      const character = buildCharacter([
        classEntry({ classId: 'warlock', eldritchInvocations: [slug] }),
      ]);
      const { container } = render(<InvocationsCard character={character} />);
      const text = container.textContent ?? '';
      expectNoForbiddenEnglish(text, `InvocationsCard:${slug}`);
      expectNoForbiddenNonOfficialFr(text, `InvocationsCard:${slug}`);
    },
  );
});
