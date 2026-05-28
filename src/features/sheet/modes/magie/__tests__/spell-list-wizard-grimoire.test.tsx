import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Character } from '@/shared/types/character';
import type { ClassEntity, Spell } from '@/shared/types/content';

import { SpellList } from '../spell-list';

import spellsBundle from '../../../../../../public/data/spells.json';

/**
 * Plan 13.9 commit 4b — Magie mode Magicien.
 *
 * Cat. 2 (identité) + Cat. 6 (cas-limites — préparé sous-ensemble du
 * grimoire) appliquées à la question d'Adrien : « Le grimoire montre-t-il
 * les 6 bons sorts inscrits et les 4 bons préparés ? »
 *
 * Échantillon raisonné (PAS combinatoire complète des 29 sorts Magicien L1,
 * qui serait infinie en combinatoire à 6 picks) : 6 sorts du SRD 5.2.1 dont
 * 4 sont préparés.
 *
 * - **Grimoire inscrit (knownSpells.wizard, 6 sorts)** :
 *   1. `bouclier` — Bouclier (abjuration L1)
 *   2. `projectile-magique` — Projectile magique (evocation L1)
 *   3. `armure-du-mage` — Armure du mage (abjuration L1, renommé SRD 5.2.1)
 *   4. `graisse` — Graisse (conjuration L1)
 *   5. `alarme` — Alarme (abjuration L1)  ← inscrit non-préparé
 *   6. `appel-de-familier` — Appel de familier (conjuration L1)  ← inscrit non-préparé
 *
 * - **Préparés aujourd'hui (preparedSpells.wizard, 4 sorts ⊂ grimoire)** :
 *   `bouclier`, `projectile-magique`, `armure-du-mage`, `graisse`.
 *
 * Tests :
 * 1. Tous les 6 noms FR du bundle apparaissent dans la liste rendue
 *    (identité contre `spells.json`).
 * 2. Le filtre « Préparés » affiche 4 entrées (les 4 préparés ; pas de
 *    cantrip ici).
 * 3. Les 4 préparés portent la classe visuelle dorée ; les 2 inscrits-non-
 *    préparés portent la classe visuelle estompée (cat. 6 — distinction
 *    visuelle non-régression).
 * 4. Test négatif (cat. 6) : un sort hors grimoire (`boule-de-feu`) ne
 *    s'affiche PAS, même s'il est dans le bundle.
 */

interface SpellBundleEntry {
  id: string;
  name: { fr: string; en?: string };
  level: number;
  school: string;
  ritual?: boolean;
  description?: { fr?: string; en?: string };
  classes?: string[];
}

const WIZARD_INSCRIBED_IDS = [
  'bouclier',
  'projectile-magique',
  'armure-du-mage',
  'graisse',
  'alarme',
  'appel-de-familier',
] as const;
const WIZARD_PREPARED_IDS = [
  'bouclier',
  'projectile-magique',
  'armure-du-mage',
  'graisse',
] as const;
const WIZARD_INSCRIBED_NOT_PREPARED_IDS = ['alarme', 'appel-de-familier'] as const;

const WIZARD_CLASS: ClassEntity = {
  id: 'wizard',
  name: { fr: 'Magicien', en: 'Wizard' },
  hitDie: 'd6',
  primaryAbility: ['int'],
  saveProficiencies: ['int', 'sag'],
  armorProficiencies: [],
  weaponProficiencies: [],
  toolProficiencies: [],
  skillChoices: { count: 2, from: ['arcana'] },
  spellcasting: { ability: 'int', progression: 'full' },
  startingEquipment: { options: [{ items: [], coins: null }] },
  description: { fr: '', en: '' },
  features: [],
  weaponMasteryCount: 0,
  source: 'srd-5.2.1',
} as unknown as ClassEntity;

vi.mock('@/shared/hooks/use-content', () => ({
  useContent: (type: string) => {
    if (type === 'classes') return { data: [WIZARD_CLASS], isLoading: false, error: null };
    return { data: [], isLoading: false, error: null };
  },
}));

/**
 * Récupère un sort du bundle réel. Échoue dur si absent — la fixture est
 * la vérité du test ; si le bundle perd un de ces sorts, c'est un bug
 * bundle, pas un bug test.
 */
function spellFromBundle(id: string): Spell {
  const found = (spellsBundle as SpellBundleEntry[]).find((s) => s.id === id);
  if (!found) {
    throw new Error(
      `[spell-list-wizard-grimoire] sort de fixture ${id} absent de spells.json — le bundle a régressé`,
    );
  }
  // SpellList consomme un Spell ; le bundle livre un schéma compatible
  // (Zod validé en runtime via content-loader). On cast après la garde
  // de présence — pas de risque d'undefined.
  return found as unknown as Spell;
}

const INSCRIBED_SPELLS = WIZARD_INSCRIBED_IDS.map(spellFromBundle);
const FIRE_BALL_NOT_IN_GRIMOIRE = spellFromBundle.bind(null);

function wizardWithGrimoire(): Character {
  return {
    id: 'test',
    name: 'Test Magicien',
    status: 'alive',
    classes: [
      {
        classId: 'wizard',
        subclassId: null,
        level: 1,
        clericDivineOrder: null,
        druidPrimalOrder: null,
        fighterFightingStyle: null,
        weaponMasteries: [],
        expertiseSkills: [],
        eldritchInvocations: [],
        wizardSpellbookL1: [...WIZARD_INSCRIBED_IDS],
      },
    ],
    totalLevel: 1,
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
    abilities: { for: 10, dex: 12, con: 12, int: 16, sag: 12, cha: 10 },
    saves: { for: false, dex: false, con: false, int: true, sag: true, cha: false },
    skills: {},
    hp: { current: 7, max: 7, temp: 0 },
    ac: 11,
    speed: 30,
    initiative: 1,
    hitDice: [{ classId: 'wizard', current: 1, max: 1, die: 'd6' }],
    deathSaves: { success: 0, fail: 0 },
    conditions: [],
    inspiration: false,
    exhaustion: 0,
    currentConcentration: null,
    classResources: {},
    spellSlots: {},
    // Le grimoire complet doit être dans knownSpells.wizard (cf.
    // submit-from-wizard.ts:282-288). Sans ça les inscrits-non-préparés
    // disparaissent de la liste — c'est le bug que le test attrape.
    knownSpells: { wizard: [...WIZARD_INSCRIBED_IDS] },
    // Les 4 préparés (sous-ensemble strict du grimoire).
    preparedSpells: { wizard: [...WIZARD_PREPARED_IDS] },
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
}

describe('SpellList Magicien — grimoire (6 inscrits) + préparés (4 ⊂ grimoire)', () => {
  it('cat. 2 — les 6 noms FR du grimoire apparaissent (identité contre spells.json)', () => {
    const character = wizardWithGrimoire();
    render(
      <SpellList
        character={character}
        spells={INSCRIBED_SPELLS}
        spellcasterClassIds={['wizard']}
        ancestrySourceLabels={new Map()}
        pactTomeSourceLabels={new Map()}
        onSpellSelect={() => undefined}
      />,
    );
    for (const spell of INSCRIBED_SPELLS) {
      expect(
        screen.queryByText(spell.name.fr),
        `${spell.id} (${spell.name.fr}) absent de la liste — identité bundle cassée`,
      ).toBeInTheDocument();
    }
  });

  it('cat. 6 — les 4 préparés portent la classe visuelle dorée (border-gold-dim/30)', () => {
    const character = wizardWithGrimoire();
    render(
      <SpellList
        character={character}
        spells={INSCRIBED_SPELLS}
        spellcasterClassIds={['wizard']}
        ancestrySourceLabels={new Map()}
        pactTomeSourceLabels={new Map()}
        onSpellSelect={() => undefined}
      />,
    );
    for (const id of WIZARD_PREPARED_IDS) {
      const spell = spellFromBundle(id);
      const row = screen.getByText(spell.name.fr).closest('button');
      expect(row, `${id} : ligne introuvable`).not.toBeNull();
      expect(
        row?.className,
        `${id} (${spell.name.fr}) devrait porter la classe préparée 'border-gold-dim/30'`,
      ).toContain('border-gold-dim/30');
    }
  });

  it('cat. 6 — les 2 inscrits-non-préparés portent la classe visuelle estompée (opacity-80), JAMAIS dorée', () => {
    const character = wizardWithGrimoire();
    render(
      <SpellList
        character={character}
        spells={INSCRIBED_SPELLS}
        spellcasterClassIds={['wizard']}
        ancestrySourceLabels={new Map()}
        pactTomeSourceLabels={new Map()}
        onSpellSelect={() => undefined}
      />,
    );
    for (const id of WIZARD_INSCRIBED_NOT_PREPARED_IDS) {
      const spell = spellFromBundle(id);
      const row = screen.getByText(spell.name.fr).closest('button');
      expect(row, `${id} : ligne introuvable`).not.toBeNull();
      expect(
        row?.className,
        `${id} (${spell.name.fr}) devrait porter la classe non-préparée 'opacity-80'`,
      ).toContain('opacity-80');
      expect(
        row?.className,
        `${id} : NE doit PAS porter la classe dorée — il n'est PAS préparé`,
      ).not.toContain('border-gold-dim/30');
    }
  });

  it('cat. 6 — chip « Préparés » affiche le count exact (4 préparés, 0 cantrip dans cette fixture)', () => {
    const character = wizardWithGrimoire();
    render(
      <SpellList
        character={character}
        spells={INSCRIBED_SPELLS}
        spellcasterClassIds={['wizard']}
        ancestrySourceLabels={new Map()}
        pactTomeSourceLabels={new Map()}
        onSpellSelect={() => undefined}
      />,
    );
    // Le chip « Préparés · N » compte preparedSet + cantrips. Pas de cantrip
    // dans la fixture → count = 4.
    expect(screen.getByText(/Préparés · 4/)).toBeInTheDocument();
    // Et « Tous · 6 » pour la garde grimoire complet.
    expect(screen.getByText(/Tous · 6/)).toBeInTheDocument();
  });

  it('cat. 6 — test négatif : un sort hors grimoire (boule-de-feu) ne s\'affiche PAS, même fourni en input', () => {
    const character = wizardWithGrimoire();
    // On ajoute boule-de-feu (L3 Magicien) dans l'input mais PAS dans
    // knownSpells.wizard du perso. La SpellList doit le filtrer.
    const fireBall = FIRE_BALL_NOT_IN_GRIMOIRE('boule-de-feu');
    render(
      <SpellList
        character={character}
        spells={[...INSCRIBED_SPELLS, fireBall]}
        spellcasterClassIds={['wizard']}
        ancestrySourceLabels={new Map()}
        pactTomeSourceLabels={new Map()}
        onSpellSelect={() => undefined}
      />,
    );
    expect(
      screen.queryByText(fireBall.name.fr),
      `${fireBall.id} ne devrait PAS apparaître — il n'est pas dans knownSpells.wizard`,
    ).not.toBeInTheDocument();
  });
});
