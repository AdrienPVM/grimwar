import { readFileSync } from 'node:fs';

import { beforeAll, describe, expect, it, vi } from 'vitest';

import { applyLevelUp } from '@/shared/lib/level-up/apply-level-up';
import type { LevelUpDraft } from '@/shared/lib/level-up/level-up-types';
import { computeFeatAvailability } from '@/shared/lib/rules/feat-availability';
import type { Character } from '@/shared/types/character';
import type { ClassEntity, Feat } from '@/shared/types/content';

import { submitWizardAndDeriveSheet } from '../helpers/content-truth';
import {
  buildPersonaInput,
  loadBundles,
  PERSONAS,
  type MatrixBundles,
  type PersonaSpec,
} from './runner';

/**
 * Matrice level-up — JALON 2B.6c.
 *
 * Pinne les invariants chiffrés des 3 transitions canoniques de level-up sur
 * les 3 personas représentatifs SRD :
 *
 *   - Fighter (martial) — d10, FOR 15, CON 14 → +8 HP / niveau (avg=6 + CON 2)
 *   - Wizard (full caster) — d6, INT 15, CON 13 → +5 HP / niveau (avg=4 + CON 1)
 *   - Rogue (skill) — d8, DEX 15, CON 14 → +7 HP / niveau (avg=5 + CON 2)
 *
 * Pourquoi pin chiffré (cat. 4 « testing policy » CLAUDE.md) :
 *
 *   - HP max après chaque niveau (`hp.max`) : valide la formule moyenne SRD
 *     `floor(faces/2)+1+conMod` portée par `applyLevelUp`.
 *   - `totalLevel` : confirme l'incrémentation atomique du niveau du persona.
 *   - `classes[0].subclassId` après L3 : confirme la propagation du chooser.
 *   - `abilities.X` après L4 ASI : confirme l'arithmétique +2 / +1+1.
 *   - `spellSlots` Wizard L2/L3/L4 : confirme la table SRD `spellSlotsForCaster
 *     Level` (4/2/0/… → 4/3/2/… → 4/3/3/… → 4/3/3/…). Le rangement par niveau
 *     de sort est verrouillé contre `multiclass.ts > SLOT_TABLE`.
 *   - `hitDice` : +1 die de la classe levée par niveau.
 *
 * Le tracker e2e (`level-up-fighter|wizard|rogue.spec.ts`) prouve qu'un
 * utilisateur peut piloter le wizard à l'écran ; cette matrice prouve que la
 * fonction pure produit le RÉSULTAT CHIFFRÉ attendu par le SRD. Les deux
 * couvrent la même surface depuis 2 angles différents.
 *
 * Convention : on fait des hp-roll « average » partout — c'est le comportement
 * par défaut de la modale et le seul résultat déterministe pinnable.
 */

vi.mock('@/shared/lib/inventory', () => ({
  addItemToInventory: vi.fn(
    async (shape: { inventory: { items: unknown[] } }, itemId: string) => {
      shape.inventory.items.push({
        contentId: itemId,
        contentScope: 'public',
        qty: 1,
        equipped: false,
        attuned: false,
        notes: '',
      });
    },
  ),
}));

/* ────────────────────────────────────────────────────────────────────────── */

let bundles: MatrixBundles;
let l1Snapshots: Map<string, Character>;

const targetPersonas = [
  'base-fighter',
  'base-wizard',
  'base-rogue',
  'base-paladin',
] as const;

beforeAll(async () => {
  bundles = loadBundles();
  l1Snapshots = new Map();
  for (const id of targetPersonas) {
    const spec = PERSONAS.find((p) => p.id === id) as PersonaSpec;
    const { input } = buildPersonaInput(spec, bundles);
    const snap = await submitWizardAndDeriveSheet(input);
    if (!snap.valid) {
      throw new Error(
        `[level-up matrix] persona "${id}" invalide au L1 : ${snap.errors.join(', ')}`,
      );
    }
    l1Snapshots.set(id, snap.character);
  }
});

function l1(id: (typeof targetPersonas)[number]): Character {
  const c = l1Snapshots.get(id);
  if (!c) throw new Error(`[level-up matrix] L1 snapshot manquant : ${id}`);
  return c;
}

function classDefs(character: Character): Record<string, ClassEntity> {
  const map: Record<string, ClassEntity> = {};
  for (const c of character.classes) {
    const def = bundles.classes.find((cd) => cd.id === c.classId);
    if (!def) throw new Error(`[level-up matrix] classe ${c.classId} absente du bundle`);
    map[c.classId] = def;
  }
  return map;
}

function applyChain(start: Character, drafts: LevelUpDraft[]): Character {
  let current = start;
  for (const draft of drafts) {
    current = applyLevelUp({ character: current, draft, classDefinitions: classDefs(current) });
  }
  return current;
}

/* ────────────────────────────────────────────────────────────────────────── */

describe('matrice level-up — Fighter L1 → L4 (HP + Champion + ASI FOR)', () => {
  it('chaîne L1 → L2 → L3 (Champion) → L4 (+2 FOR) : HP/level/subclass/abilities pinnés', () => {
    const l1Fighter = l1('base-fighter');
    // Fighter standard-array : FOR 15, DEX 13, CON 14 → conMod = +2
    // Hit die d10 → avgHp = 6, gain par niveau = 8.
    // L1 hp.max = 12 (max die 10 + CON 2).
    expect(l1Fighter.abilities.for).toBe(15);
    expect(l1Fighter.abilities.con).toBe(14);
    expect(l1Fighter.hp.max).toBe(12);

    const out = applyChain(l1Fighter, [
      { classId: 'fighter', newClassLevel: 2, hpRoll: { kind: 'average' } },
      {
        classId: 'fighter',
        newClassLevel: 3,
        hpRoll: { kind: 'average' },
        subclassId: 'champion',
      },
      {
        classId: 'fighter',
        newClassLevel: 4,
        hpRoll: { kind: 'average' },
        asiOrFeat: {
          kind: 'asi',
          abilityIncreases: [{ ability: 'for', bonus: 2 }],
        },
      },
    ]);

    expect(out.totalLevel).toBe(4);
    expect(out.classes[0]?.level).toBe(4);
    expect(out.classes[0]?.subclassId).toBe('champion');
    // 12 (L1) + 8 (L2) + 8 (L3) + 8 (L4) = 36 hp max.
    expect(out.hp.max).toBe(36);
    // ASI +2 FOR : 15 → 17.
    expect(out.abilities.for).toBe(17);
    // Hit dice pool : 4 d10 (1 par niveau).
    expect(out.hitDice).toContainEqual(
      expect.objectContaining({ classId: 'fighter', max: 4, die: 'd10' }),
    );
  });
});

describe('matrice level-up — Wizard L1 → L4 (HP + Évocateur + ASI INT + slots)', () => {
  it('chaîne L1 → L4 : HP/level/subclass/INT/spellSlots pinnés', () => {
    const l1Wizard = l1('base-wizard');
    // Wizard standard-array : INT 15, CON 13 → conMod = +1
    // Hit die d6 → avgHp = 4, gain par niveau = 5.
    // L1 hp.max = 7 (max die 6 + CON 1).
    expect(l1Wizard.abilities.int).toBe(15);
    expect(l1Wizard.abilities.con).toBe(13);
    expect(l1Wizard.hp.max).toBe(7);
    // L1 wizard issu de `buildCharacterFromWizard` n'initialise pas
    // `spellSlots` — les slots sont (re)calculés par `applyLevelUp` à chaque
    // level-up. On vérifie donc la table SRD au L4 ci-dessous.

    const out = applyChain(l1Wizard, [
      {
        classId: 'wizard',
        newClassLevel: 2,
        hpRoll: { kind: 'average' },
        newSpellsKnown: ['mains-brulantes'],
      },
      {
        classId: 'wizard',
        newClassLevel: 3,
        hpRoll: { kind: 'average' },
        subclassId: 'evoker',
        newSpellsKnown: ['identification'],
      },
      {
        classId: 'wizard',
        newClassLevel: 4,
        hpRoll: { kind: 'average' },
        asiOrFeat: {
          kind: 'asi',
          abilityIncreases: [{ ability: 'int', bonus: 2 }],
        },
        newCantrips: ['lumiere'],
        newSpellsKnown: ['comprehension-des-langues'],
      },
    ]);

    expect(out.totalLevel).toBe(4);
    expect(out.classes[0]?.subclassId).toBe('evoker');
    // 7 (L1) + 5 (L2) + 5 (L3) + 5 (L4) = 22 hp max.
    expect(out.hp.max).toBe(22);
    // ASI +2 INT : 15 → 17.
    expect(out.abilities.int).toBe(17);
    // L4 Wizard slots (SLOT_TABLE) : 4 L1 + 3 L2.
    expect(out.spellSlots).toMatchObject({
      1: { max: 4 },
      2: { max: 3 },
    });
    // 3 nouveaux sorts ajoutés à knownSpells.wizard (au-dessus de la base L1).
    const knownWizard = out.knownSpells.wizard ?? [];
    expect(knownWizard).toContain('mains-brulantes');
    expect(knownWizard).toContain('identification');
    expect(knownWizard).toContain('comprehension-des-langues');
    // 1 nouveau cantrip ajouté dans la clé dédiée `wizard-cantrips` (séparée
    // de `wizard` côté `apply-level-up.ts > newCantrips`).
    expect(out.knownSpells['wizard-cantrips']).toContain('lumiere');
  });
});

describe('matrice level-up — Rogue L1 → L3 (HP + Thief)', () => {
  it('chaîne L1 → L3 (Voleur) : HP/level/subclass pinnés + pas d\'ASI au L3', () => {
    const l1Rogue = l1('base-rogue');
    // Rogue standard-array : DEX 15, CON 14 → conMod = +2
    // Hit die d8 → avgHp = 5, gain par niveau = 7.
    // L1 hp.max = 10 (max die 8 + CON 2).
    expect(l1Rogue.abilities.dex).toBe(15);
    expect(l1Rogue.abilities.con).toBe(14);
    expect(l1Rogue.hp.max).toBe(10);

    const out = applyChain(l1Rogue, [
      { classId: 'rogue', newClassLevel: 2, hpRoll: { kind: 'average' } },
      {
        classId: 'rogue',
        newClassLevel: 3,
        hpRoll: { kind: 'average' },
        subclassId: 'thief',
      },
    ]);

    expect(out.totalLevel).toBe(3);
    expect(out.classes[0]?.subclassId).toBe('thief');
    // 10 (L1) + 7 (L2) + 7 (L3) = 24 hp max.
    expect(out.hp.max).toBe(24);
    // Pas d'ASI au L3 Rogue (ASI = L4 / L8 / L10 / L12 / L16) — abilities
    // inchangées vs L1.
    expect(out.abilities).toEqual(l1Rogue.abilities);
    // 3 d8 hit dice après L3.
    expect(out.hitDice).toContainEqual(
      expect.objectContaining({ classId: 'rogue', max: 3, die: 'd8' }),
    );
  });

  it('Rogue L3 sans subclassId fourni → applyLevelUp throw', () => {
    const l1Rogue = l1('base-rogue');
    const l2 = applyLevelUp({
      character: l1Rogue,
      draft: { classId: 'rogue', newClassLevel: 2, hpRoll: { kind: 'average' } },
      classDefinitions: classDefs(l1Rogue),
    });
    expect(() =>
      applyLevelUp({
        character: l2,
        draft: { classId: 'rogue', newClassLevel: 3, hpRoll: { kind: 'average' } },
        classDefinitions: classDefs(l2),
      }),
    ).toThrow(/subclassId requis/);
  });
});

/**
 * Matrix pin — éligibilité du feat « Lutteur » (Grappler) — JALON 2C-feat-5.
 *
 * Cat. 3 (fidélité bundle) + cat. 6 (cas-limite de règles) cumulés :
 * vérifie que `computeFeatAvailability` (2C-feat-3) consomme correctement
 * les `prerequisites[]` du bundle live `public/data/feats.json` (2C-feat-2)
 * sur deux personas représentatifs canoniques :
 *
 *   - Wizard L4 (standard array : FOR 8) → Lutteur (Lvl 4+ AND FOR 13+)
 *     bloqué par la borne FOR.
 *   - Fighter L4 (standard array : FOR 15, +2 ASI au L4 → 17) → Lutteur
 *     éligible (les 2 prereqs satisfaits).
 *
 * Le pin tape directement sur le bundle SRD (pas de mock) : un drift
 * structurel des `prerequisites[]` sur `lutteur` (renommé, mauvais kind,
 * borne décalée) fait rougir cette matrice.
 */
describe('matrice level-up — éligibilité Lutteur sur Wizard/Fighter L4 (JALON 2C-feat-5)', () => {
  let lutteur: Feat;

  beforeAll(() => {
    const allFeats = JSON.parse(
      readFileSync('public/data/feats.json', 'utf-8'),
    ) as Feat[];
    const found = allFeats.find((f) => f.id === 'lutteur');
    if (!found) throw new Error('[matrix 2C-feat-5] feat « lutteur » absent du bundle');
    lutteur = found;
  });

  it("Wizard L4 (FOR 8) — Lutteur bloqué par la borne FOR 13+", () => {
    const wizardL4 = applyChain(l1('base-wizard'), [
      {
        classId: 'wizard',
        newClassLevel: 2,
        hpRoll: { kind: 'average' },
        newSpellsKnown: ['mains-brulantes'],
      },
      {
        classId: 'wizard',
        newClassLevel: 3,
        hpRoll: { kind: 'average' },
        subclassId: 'evoker',
        newSpellsKnown: ['identification'],
      },
      {
        classId: 'wizard',
        newClassLevel: 4,
        hpRoll: { kind: 'average' },
        asiOrFeat: {
          kind: 'asi',
          abilityIncreases: [{ ability: 'int', bonus: 2 }],
        },
        newCantrips: ['lumiere'],
        newSpellsKnown: ['comprehension-des-langues'],
      },
    ]);

    // Standard array Wizard : FOR 8 (cf. reference-builds/wizard.ts).
    expect(wizardL4.abilities.for).toBe(8);
    expect(wizardL4.totalLevel).toBe(4);

    const availability = computeFeatAvailability(wizardL4, lutteur.prerequisites);
    expect(availability.available).toBe(false);
    // Le prereq character-level=4 EST satisfait (totalLevel=4) ;
    // seul ability-score FOR 13+ est unmet → on pin la liste exacte.
    expect(availability.unmetPrerequisites).toEqual([
      { kind: 'ability-score', ability: 'for', minimum: 13 },
    ]);
  });

  it("Fighter L4 (FOR 17 post-ASI) — Lutteur éligible", () => {
    const fighterL4 = applyChain(l1('base-fighter'), [
      { classId: 'fighter', newClassLevel: 2, hpRoll: { kind: 'average' } },
      {
        classId: 'fighter',
        newClassLevel: 3,
        hpRoll: { kind: 'average' },
        subclassId: 'champion',
      },
      {
        classId: 'fighter',
        newClassLevel: 4,
        hpRoll: { kind: 'average' },
        asiOrFeat: {
          kind: 'asi',
          abilityIncreases: [{ ability: 'for', bonus: 2 }],
        },
      },
    ]);

    // Standard array Fighter : FOR 15 + ASI +2 = 17.
    expect(fighterL4.abilities.for).toBe(17);
    expect(fighterL4.totalLevel).toBe(4);

    const availability = computeFeatAvailability(fighterL4, lutteur.prerequisites);
    expect(availability.available).toBe(true);
    expect(availability.unmetPrerequisites).toEqual([]);
  });

  it("Wizard L1 (FOR 8) — Lutteur bloqué par les DEUX prereqs (level + FOR)", () => {
    const wizardL1 = l1('base-wizard');
    expect(wizardL1.totalLevel).toBe(1);
    expect(wizardL1.abilities.for).toBe(8);

    const availability = computeFeatAvailability(wizardL1, lutteur.prerequisites);
    expect(availability.available).toBe(false);
    // Pin de l'AND strict : on doit voir les 2 prérequis unmet dans
    // l'ordre du bundle (level puis ability-score).
    expect(availability.unmetPrerequisites).toEqual([
      { kind: 'character-level', minimum: 4 },
      { kind: 'ability-score', ability: 'for', minimum: 13 },
    ]);
  });
});

/**
 * Matrix pins — multi-class (JALON 2D.5).
 *
 * Cat. 4 (résultat chiffré) + cat. 6 (cas-limite SRD intersection) :
 *
 *   - Slots unifiés au multiclass-add (Fighter L3 + Wizard L1 → table SRD
 *     `spellSlotsForCasterLevel(1)` = 2 emplacements L1).
 *   - HP au multiclass-add forcé à l'avg (audit 2D Décision 2 — réservé à
 *     la primaryClassId au L1 de prendre le dé max).
 *   - `extraProficiencies` accumule le subset multiclass de la classe
 *     ajoutée (Wizard multiclass = 0 armure, Fighter multiclass = light
 *     + medium + shields + martial weapons).
 *   - Hit dice pool : nouvelle entrée appendée (pas un +1 sur existant).
 *   - `applyLevelUp` refuse l'add quand `multiclassPrerequisite` non
 *     satisfait (defense in depth — l'UI grise déjà).
 *   - `applyLevelUp` refuse l'add quand `classes.length >= 4` (borne SRD).
 */
describe('matrice level-up — multi-class add-class (JALON 2D.5)', () => {
  function fighterL3IntellectualLite(): Character {
    const base = l1('base-fighter');
    // Tweak abilities pour respecter Wizard prereq (INT 13).
    return {
      ...base,
      abilities: { ...base.abilities, int: 13 },
    };
  }

  it("Fighter L3 (INT 13) + add Wizard L1 → slots L1=2 + HP avg + extraProficiencies vides Wizard", () => {
    const base = fighterL3IntellectualLite();
    // Monte Fighter à L3 d'abord pour valider l'add-class à L4 total.
    const fighterL3 = applyChain(base, [
      { classId: 'fighter', newClassLevel: 2, hpRoll: { kind: 'average' } },
      {
        classId: 'fighter',
        newClassLevel: 3,
        hpRoll: { kind: 'average' },
        subclassId: 'champion',
      },
    ]);
    expect(fighterL3.totalLevel).toBe(3);
    const hpBeforeAdd = fighterL3.hp.max;

    const wizardDef = bundles.classes.find((c) => c.id === 'wizard');
    expect(wizardDef).toBeDefined();

    // Add Wizard L1 (multiclass).
    const fighter3Wizard1 = applyLevelUp({
      character: fighterL3,
      draft: {
        classId: 'wizard',
        newClassLevel: 1,
        hpRoll: { kind: 'average' },
        addClassSubChoices: {
          wizardSpellbookL1: [
            'mains-brulantes',
            'projectile-magique',
            'armure-du-mage',
            'detection-de-la-magie',
            'identification',
            'sommeil',
          ],
        },
      },
      classDefinitions: { ...classDefs(fighterL3), wizard: wizardDef! },
    });

    // Total level + classes shape
    expect(fighter3Wizard1.totalLevel).toBe(4);
    expect(fighter3Wizard1.classes).toHaveLength(2);
    expect(fighter3Wizard1.classes[1]?.classId).toBe('wizard');
    expect(fighter3Wizard1.classes[1]?.level).toBe(1);

    // Slots SRD unifié : caster level = 0 (Fighter non-caster) + 1 (Wizard
    // full) = 1 → SLOT_TABLE[1] = { 1: 2 }.
    expect(fighter3Wizard1.spellSlots).toMatchObject({
      1: { max: 2 },
    });

    // HP au multiclass-add : Wizard d6 avg=4 + CON 14 → conMod=+2 → +6 HP.
    expect(fighter3Wizard1.hp.max).toBe(hpBeforeAdd + 6);

    // Hit dice : nouvelle entrée Wizard (1 d6, current=1, max=1).
    expect(fighter3Wizard1.hitDice).toContainEqual(
      expect.objectContaining({ classId: 'wizard', max: 1, die: 'd6' }),
    );

    // extraProficiencies Wizard multiclass = aucune (SRD 2024 — cf. 2D.2).
    // Le subset Wizard est { armor: [], weapons: [], tools: [] }. Vérifie que
    // l'append n'a rien polué côté Fighter (qui avait déjà ses profs au L1).
    expect(fighter3Wizard1.extraProficiencies.armor).toEqual(
      fighterL3.extraProficiencies.armor,
    );
    expect(fighter3Wizard1.extraProficiencies.weapons).toEqual(
      fighterL3.extraProficiencies.weapons,
    );
  });

  it("Paladin standard (CHA 8) + tentative add Bard → throw (CHA <13)", () => {
    // Construit un Paladin synthétique à partir d'un L1 Fighter et tweak.
    const base = l1('base-fighter');
    const paladinSynthetic: Character = {
      ...base,
      classes: [
        { ...base.classes[0]!, classId: 'paladin' },
      ],
      primaryClassId: 'paladin',
      hitDice: [{ classId: 'paladin', current: 1, max: 1, die: 'd10' }],
      abilities: { ...base.abilities, for: 15, cha: 8 },
    };

    const bardDef = bundles.classes.find((c) => c.id === 'bard');
    const paladinDef = bundles.classes.find((c) => c.id === 'paladin');
    expect(bardDef).toBeDefined();
    expect(paladinDef).toBeDefined();

    expect(() =>
      applyLevelUp({
        character: paladinSynthetic,
        draft: {
          classId: 'bard',
          newClassLevel: 1,
          hpRoll: { kind: 'average' },
        },
        classDefinitions: { paladin: paladinDef!, bard: bardDef! },
      }),
    ).toThrow(/prérequis multiclass non satisfaits.*CHA/i);
  });

  it("Borne 4 classes : add-class refusé quand classes.length === 4", () => {
    const base = l1('base-fighter');
    // Construit un perso bourré à 4 classes synthétiques.
    const fourClassChar: Character = {
      ...base,
      classes: [
        { ...base.classes[0]!, classId: 'fighter' },
        { ...base.classes[0]!, classId: 'rogue' },
        { ...base.classes[0]!, classId: 'wizard' },
        { ...base.classes[0]!, classId: 'cleric' },
      ],
      totalLevel: 4,
    };
    const barbarianDef = bundles.classes.find((c) => c.id === 'barbarian');
    expect(barbarianDef).toBeDefined();
    const classDefMap = Object.fromEntries(
      bundles.classes
        .filter((c) => ['fighter', 'rogue', 'wizard', 'cleric', 'barbarian'].includes(c.id))
        .map((c) => [c.id, c] as const),
    );

    expect(() =>
      applyLevelUp({
        character: fourClassChar,
        draft: {
          classId: 'barbarian',
          newClassLevel: 1,
          hpRoll: { kind: 'average' },
        },
        classDefinitions: classDefMap,
      }),
    ).toThrow(/classes\.length=4.*max=4/);
  });
});
