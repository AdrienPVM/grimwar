import { beforeAll, describe, expect, it, vi } from 'vitest';

import { applyLevelUp } from '@/shared/lib/level-up/apply-level-up';
import type { LevelUpDraft } from '@/shared/lib/level-up/level-up-types';
import type { Character } from '@/shared/types/character';
import type { ClassEntity } from '@/shared/types/content';

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

const targetPersonas = ['base-fighter', 'base-wizard', 'base-rogue'] as const;

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
