import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Character } from '@/shared/types/character';
import type { Spell } from '@/shared/types/content';

import { SpellDetailModal } from '../spell-detail-modal';

import spellsBundle from '../../../../../../public/data/spells.json';

/**
 * Plan 13.9 commit 4c — test d'identité de la modale détail sort.
 *
 * Question explicite d'Adrien (commit 4c) : « taper le sort X → la modale
 * affiche EXACTEMENT le sort X, vérifié par identité contre spells.json ».
 *
 * Le composant <SpellDetailModal> existe depuis le plan 09 et est testé en
 * cohabitation dans `magie-mode.test.tsx` (smoke). Ce qui manquait : la
 * vérification d'identité par catégorie 2 du « content-truth » testing
 * policy (CLAUDE.md decision log 2026-05-19) — l'identité, pas la présence.
 *
 * Échantillon raisonné (cohérent avec le grimoire 4b — 6 inscrits +
 * 1 hors-grimoire) :
 *
 * - **In-grimoire** : `bouclier` (abj L1), `projectile-magique` (evo L1),
 *   `armure-du-mage` (abj L1, renommé SRD 5.2.1 de `armure-de-mage`),
 *   `graisse` (conj L1), `alarme` (abj L1),
 *   `appel-de-familier` (conj L1) — couvre 3 écoles ; détecte une
 *   désynchro school FR (Abjuration / Évocation / Invocation).
 * - **Hors-grimoire** : `boule-de-feu` (evo L3) — pour vérifier le niveau >1
 *   affiché et le test négatif d'identité (le sort X n'affiche jamais le
 *   nom du sort Y).
 *
 * Source = bundle réel (`public/data/spells.json`). Si un nom FR du bundle
 * dérive un jour, ce test échoue avec un diff explicite : la vérité du
 * contenu reste figée AU bundle, pas à une fixture parallèle.
 */

interface SpellBundleEntry {
  id: string;
  name: { fr: string; en?: string };
  level: number;
  school: string;
  description?: { fr?: string; en?: string };
}

const SAMPLE_SPELL_IDS = [
  'bouclier',
  'projectile-magique',
  'armure-du-mage',
  'graisse',
  'alarme',
  'appel-de-familier',
  'boule-de-feu',
] as const;

const SCHOOL_FR_BY_SLUG: Record<string, string> = {
  abjuration: 'Abjuration',
  evocation: 'Évocation',
  conjuration: 'Invocation',
  illusion: 'Illusion',
  divination: 'Divination',
  enchantment: 'Enchantement',
  necromancy: 'Nécromancie',
  transmutation: 'Transmutation',
};

function spellFromBundle(id: string): Spell {
  const found = (spellsBundle as SpellBundleEntry[]).find((s) => s.id === id);
  if (!found) {
    throw new Error(
      `[spell-detail-modal-identity] sort ${id} absent de spells.json — le bundle a régressé`,
    );
  }
  return found as unknown as Spell;
}

vi.mock('@/shared/hooks/use-content', () => ({
  useContent: () => ({ data: [], isLoading: false, error: null }),
}));
vi.mock('@/features/dice/use-dice', () => ({
  useDice: () => ({
    rollDamageWithMode: vi.fn(),
  }),
}));

const character: Character = {
  id: 'test',
  name: 'Test',
  status: 'alive',
  classes: [
    {
      classId: 'wizard',
      subclassId: null,
      level: 3,
      clericDivineOrder: null,
      druidPrimalOrder: null,
      fighterFightingStyle: null,
      weaponMasteries: [],
      expertiseSkills: [],
      eldritchInvocations: [],
      wizardSpellbookL1: [],
    },
  ],
  totalLevel: 3,
  primaryClassId: 'wizard',
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
  backgroundId: 'sage',
  extraLanguages: [],
  experience: 0,
  alignment: 'N',
  abilities: { for: 8, dex: 14, con: 12, int: 16, sag: 13, cha: 10 },
  saves: { for: false, dex: false, con: false, int: true, sag: true, cha: false },
  skills: {},
  hp: { current: 18, max: 18, temp: 0 },
  ac: 12,
  speed: 30,
  initiative: 2,
  hitDice: [{ classId: 'wizard', current: 3, max: 3, die: 'd6' }],
  deathSaves: { success: 0, fail: 0 },
  conditions: [],
  inspiration: false,
  exhaustion: 0,
  currentConcentration: null,
  classResources: {},
  spellSlots: { '1': { max: 4, current: 4 }, '2': { max: 2, current: 2 } },
  preparedSpells: {},
  knownSpells: { wizard: [...SAMPLE_SPELL_IDS] },
  spellcastingAbility: { wizard: 'int' },
  inventory: { items: [], coins: { cu: 0, ar: 0, el: 0, or: 0, pl: 0 }, weightCache: 0 },
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

describe('SpellDetailModal — identité contre spells.json (cat. 2)', () => {
  it.each(SAMPLE_SPELL_IDS)(
    'sort %s : la modale affiche EXACTEMENT name.fr + description.fr + niveau + école du bundle',
    (id) => {
      const spell = spellFromBundle(id);
      render(
        <SpellDetailModal
          character={character}
          spell={spell}
          spellcastingClasses={[
            { classId: 'wizard', name: 'Magicien', level: 3, ability: 'int', progression: 'full' },
          ]}
          ancestrySource={null}
        pactTomeSource={null}
          readOnly={false}
          onClose={() => undefined}
        />,
      );
      const dialog = screen.getByRole('dialog');

      // 1. name.fr EXACT — pas un partial, pas un contains-y. C'est l'identité.
      expect(within(dialog).getByText(spell.name.fr)).toBeInTheDocument();

      // 2. Niveau : « Sort mineur » pour cantrip, « Niveau X » sinon. Le bundle
      // ne contient que des sorts L1+ dans cet échantillon (boule-de-feu = L3),
      // donc on attend "Niveau {level}".
      const levelLabel = spell.level === 0 ? 'Sort mineur' : `Niveau ${spell.level}`;
      // Le label niveau est suivi du séparateur « · » et du nom d'école. On
      // s'autorise un getByText partiel SUR LE LABEL UNIQUEMENT.
      expect(within(dialog).getByText(new RegExp(levelLabel))).toBeInTheDocument();

      // 3. École FR EXACTE (depuis i18n table). Tolère le préfixe « · » dans
      // le markup combiné.
      const schoolFR = SCHOOL_FR_BY_SLUG[spell.school];
      expect(schoolFR, `école ${spell.school} sans traduction FR`).toBeDefined();
      expect(within(dialog).getByText(new RegExp(schoolFR!))).toBeInTheDocument();

      // 4. description.fr EXACTE — on vérifie le premier chunk de la
      // description (premier paragraphe). Le composant rend la description
      // intégrale via `<p>` ; identité = même texte.
      const descFr = spell.description.fr;
      if (descFr && descFr.length > 0) {
        // La description peut être longue ; on cible un prefixe substantiel
        // (50 premiers chars) pour ne pas dépendre du `\n` du bundle FR.
        const head = descFr.slice(0, 50);
        // getByText avec function matcher pour gérer le whitespace-collapse
        // de jsdom sur `<p class="whitespace-pre-line">`.
        const node = within(dialog).getByText((content) =>
          content.includes(head),
        );
        expect(node, `description.fr de ${id} non rendue à l'identique`).toBeInTheDocument();
      }
    },
  );

  it('cat. 2 — test négatif d\'identité : sort X NE rend PAS le name d\'un autre sort Y', () => {
    const bouclier = spellFromBundle('bouclier');
    const projectileMagique = spellFromBundle('projectile-magique');
    render(
      <SpellDetailModal
        character={character}
        spell={bouclier}
        spellcastingClasses={[
          { classId: 'wizard', name: 'Magicien', level: 3, ability: 'int', progression: 'full' },
        ]}
        ancestrySource={null}
        pactTomeSource={null}
        readOnly={false}
        onClose={() => undefined}
      />,
    );
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Bouclier')).toBeInTheDocument();
    // Test négatif explicite : « Projectile magique » NE doit PAS apparaître
    // quand on rend la modale du Bouclier.
    expect(within(dialog).queryByText(projectileMagique.name.fr)).not.toBeInTheDocument();
  });
});
