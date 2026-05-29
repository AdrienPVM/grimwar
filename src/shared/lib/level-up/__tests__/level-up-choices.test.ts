import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  createEmptyClassSubChoices,
  type CharacterClassEntry,
} from '@/shared/types/character';
import type { ClassEntity } from '@/shared/types/content';

import { levelUpChoices, type LevelUpStep } from '../level-up-choices';

/**
 * JALON 2B.4a — Tests TDD de `levelUpChoices`.
 *
 * Couvre :
 *   - HP toujours présent
 *   - Subclass uniquement à L3 quand pas encore choisie
 *   - ASI à L4/L6 (Fighter)/L8/L12/L16/L19 selon classes.json
 *   - Cantrips/Spells deltas (Wizard, Sorcerer, Warlock, Bard)
 *   - Invocations Warlock (delta L1=1, L2=3 → +2)
 *   - Paladin/Ranger half caster sans cantrips
 *   - Bornes (newClassLevel hors 2..20 throw, newClassLevel ≠ level+1 throw)
 *   - Idempotence : sortie déterministe pour même entrée
 *
 * Test-vérité du contenu catégorie 4 : on assert les COUNTS exacts contre
 * la table SRD 5.2.1 (publiée dans classes.json).
 */

function loadClasses(): Record<string, ClassEntity> {
  const path = join(process.cwd(), 'public', 'data', 'classes.json');
  const arr = JSON.parse(readFileSync(path, 'utf8')) as ClassEntity[];
  return Object.fromEntries(arr.map((c) => [c.id, c]));
}

const CLASSES = loadClasses();

function mkEntry(classId: string, level: number, subclassId: string | null = null): CharacterClassEntry {
  return {
    classId,
    subclassId,
    level,
    ...createEmptyClassSubChoices(),
  };
}

// ─────────────────────────────────────────────────────────────────────
// HP roll toujours présent
// ─────────────────────────────────────────────────────────────────────

describe('levelUpChoices — HP roll', () => {
  it('inclut hp-roll comme première étape pour Fighter L1→L2', () => {
    const steps = levelUpChoices({
      classEntry: mkEntry('fighter', 1),
      classDefinition: CLASSES.fighter!,
      newClassLevel: 2,
    });
    expect(steps[0]).toEqual({ kind: 'hp-roll' });
  });

  it('inclut hp-roll même quand aucun autre choix (Fighter L1→L2 = juste HP)', () => {
    const steps = levelUpChoices({
      classEntry: mkEntry('fighter', 1),
      classDefinition: CLASSES.fighter!,
      newClassLevel: 2,
    });
    expect(steps).toEqual<LevelUpStep[]>([{ kind: 'hp-roll' }]);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Subclass à L3 (toutes classes), pas avant, pas re-demandée
// ─────────────────────────────────────────────────────────────────────

describe('levelUpChoices — Subclass à L3', () => {
  it.each([
    'fighter',
    'wizard',
    'rogue',
    'barbarian',
    'bard',
    'cleric',
    'druid',
    'monk',
    'paladin',
    'ranger',
    'sorcerer',
    'warlock',
  ])('demande la sous-classe à L2→L3 pour %s quand subclassId est null', (classId) => {
    const steps = levelUpChoices({
      classEntry: mkEntry(classId, 2),
      classDefinition: CLASSES[classId]!,
      newClassLevel: 3,
    });
    expect(steps).toContainEqual({ kind: 'subclass' });
  });

  it('ne re-demande PAS la sous-classe à L3 si déjà choisie (cas reprise)', () => {
    const steps = levelUpChoices({
      classEntry: mkEntry('fighter', 2, 'champion'),
      classDefinition: CLASSES.fighter!,
      newClassLevel: 3,
    });
    expect(steps).not.toContainEqual({ kind: 'subclass' });
  });

  it('ne demande PAS la sous-classe à L4 (déjà choisie ou pas la fenêtre)', () => {
    const steps = levelUpChoices({
      classEntry: mkEntry('wizard', 3, 'evoker'),
      classDefinition: CLASSES.wizard!,
      newClassLevel: 4,
    });
    expect(steps).not.toContainEqual({ kind: 'subclass' });
  });
});

// ─────────────────────────────────────────────────────────────────────
// ASI ou feat — détection par scan features
// ─────────────────────────────────────────────────────────────────────

describe('levelUpChoices — ASI/feat', () => {
  it('demande ASI/feat à Fighter L3→L4', () => {
    const steps = levelUpChoices({
      classEntry: mkEntry('fighter', 3, 'champion'),
      classDefinition: CLASSES.fighter!,
      newClassLevel: 4,
    });
    expect(steps).toContainEqual({ kind: 'asi-or-feat' });
  });

  it('demande ASI/feat à Wizard L3→L4', () => {
    const steps = levelUpChoices({
      classEntry: mkEntry('wizard', 3, 'evoker'),
      classDefinition: CLASSES.wizard!,
      newClassLevel: 4,
    });
    expect(steps).toContainEqual({ kind: 'asi-or-feat' });
  });

  it('ne demande PAS ASI à Fighter L1→L2 (Action Surge level, pas ASI)', () => {
    const steps = levelUpChoices({
      classEntry: mkEntry('fighter', 1),
      classDefinition: CLASSES.fighter!,
      newClassLevel: 2,
    });
    expect(steps).not.toContainEqual({ kind: 'asi-or-feat' });
  });

  it('demande ASI à Fighter L5→L6 (Fighter a ASI bonus à L6 SRD 5.2.1)', () => {
    const steps = levelUpChoices({
      classEntry: mkEntry('fighter', 5, 'champion'),
      classDefinition: CLASSES.fighter!,
      newClassLevel: 6,
    });
    expect(steps).toContainEqual({ kind: 'asi-or-feat' });
  });
});

// ─────────────────────────────────────────────────────────────────────
// Cantrips delta — full casters
// ─────────────────────────────────────────────────────────────────────

describe('levelUpChoices — cantrips delta', () => {
  it('Wizard L3→L4 = +1 cantrip (3→4 selon SRD)', () => {
    const steps = levelUpChoices({
      classEntry: mkEntry('wizard', 3, 'evoker'),
      classDefinition: CLASSES.wizard!,
      newClassLevel: 4,
    });
    expect(steps).toContainEqual({ kind: 'cantrips', count: 1 });
  });

  it('Wizard L1→L2 = 0 cantrip (3→3 selon SRD)', () => {
    const steps = levelUpChoices({
      classEntry: mkEntry('wizard', 1),
      classDefinition: CLASSES.wizard!,
      newClassLevel: 2,
    });
    expect(steps.some((s) => s.kind === 'cantrips')).toBe(false);
  });

  it('Sorcerer L3→L4 = +1 cantrip (4→5 selon SRD)', () => {
    const steps = levelUpChoices({
      classEntry: mkEntry('sorcerer', 3, 'wild-magic'),
      classDefinition: CLASSES.sorcerer!,
      newClassLevel: 4,
    });
    expect(steps).toContainEqual({ kind: 'cantrips', count: 1 });
  });

  it('Bard L3→L4 = +1 cantrip (2→3 selon SRD)', () => {
    const steps = levelUpChoices({
      classEntry: mkEntry('bard', 3, 'lore'),
      classDefinition: CLASSES.bard!,
      newClassLevel: 4,
    });
    expect(steps).toContainEqual({ kind: 'cantrips', count: 1 });
  });

  it('Paladin n\'a pas de cantrips (half caster sans colonne)', () => {
    const steps = levelUpChoices({
      classEntry: mkEntry('paladin', 1),
      classDefinition: CLASSES.paladin!,
      newClassLevel: 2,
    });
    expect(steps.some((s) => s.kind === 'cantrips')).toBe(false);
  });

  it('Ranger n\'a pas de cantrips (half caster sans colonne)', () => {
    const steps = levelUpChoices({
      classEntry: mkEntry('ranger', 1),
      classDefinition: CLASSES.ranger!,
      newClassLevel: 2,
    });
    expect(steps.some((s) => s.kind === 'cantrips')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Spells delta — Sorcerer/Warlock/Bard known casters
// ─────────────────────────────────────────────────────────────────────

describe('levelUpChoices — spells delta', () => {
  it('Sorcerer L1→L2 = +2 sorts (2→4 selon SRD)', () => {
    const steps = levelUpChoices({
      classEntry: mkEntry('sorcerer', 1),
      classDefinition: CLASSES.sorcerer!,
      newClassLevel: 2,
    });
    expect(steps).toContainEqual({ kind: 'spells', count: 2 });
  });

  it('Warlock L1→L2 = +1 sort (2→3 selon SRD)', () => {
    const steps = levelUpChoices({
      classEntry: mkEntry('warlock', 1),
      classDefinition: CLASSES.warlock!,
      newClassLevel: 2,
    });
    expect(steps).toContainEqual({ kind: 'spells', count: 1 });
  });

  it('Bard L1→L2 = +1 sort (4→5 selon SRD)', () => {
    const steps = levelUpChoices({
      classEntry: mkEntry('bard', 1),
      classDefinition: CLASSES.bard!,
      newClassLevel: 2,
    });
    expect(steps).toContainEqual({ kind: 'spells', count: 1 });
  });

  it('Paladin L1→L2 = +1 sort préparé (2→3 selon SRD half caster)', () => {
    const steps = levelUpChoices({
      classEntry: mkEntry('paladin', 1),
      classDefinition: CLASSES.paladin!,
      newClassLevel: 2,
    });
    expect(steps).toContainEqual({ kind: 'spells', count: 1 });
  });

  it('Ranger L1→L2 = +1 sort préparé (2→3 selon SRD half caster)', () => {
    const steps = levelUpChoices({
      classEntry: mkEntry('ranger', 1),
      classDefinition: CLASSES.ranger!,
      newClassLevel: 2,
    });
    expect(steps).toContainEqual({ kind: 'spells', count: 1 });
  });
});

// ─────────────────────────────────────────────────────────────────────
// Invocations Warlock
// ─────────────────────────────────────────────────────────────────────

describe('levelUpChoices — invocations Warlock', () => {
  it('Warlock L1→L2 = +2 invocations (1→3 selon SRD)', () => {
    const steps = levelUpChoices({
      classEntry: mkEntry('warlock', 1),
      classDefinition: CLASSES.warlock!,
      newClassLevel: 2,
    });
    expect(steps).toContainEqual({ kind: 'invocations', count: 2 });
  });

  it('Warlock L2→L3 = 0 invocation (3→3 selon SRD)', () => {
    const steps = levelUpChoices({
      classEntry: mkEntry('warlock', 2),
      classDefinition: CLASSES.warlock!,
      newClassLevel: 3,
    });
    expect(steps.some((s) => s.kind === 'invocations')).toBe(false);
  });

  it('Warlock L4→L5 = +2 invocations (3→5 selon SRD)', () => {
    const steps = levelUpChoices({
      classEntry: mkEntry('warlock', 4),
      classDefinition: CLASSES.warlock!,
      newClassLevel: 5,
    });
    expect(steps).toContainEqual({ kind: 'invocations', count: 2 });
  });

  it('Fighter n\'a pas d\'invocations', () => {
    const steps = levelUpChoices({
      classEntry: mkEntry('fighter', 1),
      classDefinition: CLASSES.fighter!,
      newClassLevel: 2,
    });
    expect(steps.some((s) => s.kind === 'invocations')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Ordre canonique
// ─────────────────────────────────────────────────────────────────────

describe('levelUpChoices — ordre des étapes', () => {
  it('HP < subclass < ASI < cantrips < spells < invocations pour Warlock L2→L3 (avec subclass)', () => {
    const steps = levelUpChoices({
      classEntry: mkEntry('warlock', 2),
      classDefinition: CLASSES.warlock!,
      newClassLevel: 3,
    });
    const kinds = steps.map((s) => s.kind);
    const canonical: LevelUpStep['kind'][] = [
      'hp-roll',
      'subclass',
      'asi-or-feat',
      'cantrips',
      'spells',
      'invocations',
    ];
    let lastIdx = -1;
    for (const k of kinds) {
      const idx = canonical.indexOf(k);
      expect(idx).toBeGreaterThan(lastIdx);
      lastIdx = idx;
    }
  });

  it('Wizard L3→L4 ordre : hp-roll, asi-or-feat, cantrips, spells', () => {
    const steps = levelUpChoices({
      classEntry: mkEntry('wizard', 3, 'evoker'),
      classDefinition: CLASSES.wizard!,
      newClassLevel: 4,
    });
    expect(steps.map((s) => s.kind)).toEqual([
      'hp-roll',
      'asi-or-feat',
      'cantrips',
      'spells',
    ]);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Bornes & validation
// ─────────────────────────────────────────────────────────────────────

describe('levelUpChoices — bornes', () => {
  it('throw quand newClassLevel < 2', () => {
    expect(() =>
      levelUpChoices({
        classEntry: mkEntry('fighter', 0),
        classDefinition: CLASSES.fighter!,
        newClassLevel: 1,
      }),
    ).toThrow(/hors bornes/);
  });

  it('throw quand newClassLevel > 20', () => {
    expect(() =>
      levelUpChoices({
        classEntry: mkEntry('fighter', 20),
        classDefinition: CLASSES.fighter!,
        newClassLevel: 21,
      }),
    ).toThrow(/hors bornes/);
  });

  it('throw quand newClassLevel ≠ classEntry.level + 1', () => {
    expect(() =>
      levelUpChoices({
        classEntry: mkEntry('fighter', 1),
        classDefinition: CLASSES.fighter!,
        newClassLevel: 5,
      }),
    ).toThrow(/attendu/);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Déterminisme
// ─────────────────────────────────────────────────────────────────────

describe('levelUpChoices — déterminisme', () => {
  it('même entrée → même sortie (pas d\'aléa caché)', () => {
    const params = {
      classEntry: mkEntry('sorcerer', 3, 'wild-magic'),
      classDefinition: CLASSES.sorcerer!,
      newClassLevel: 4,
    };
    const a = levelUpChoices(params);
    const b = levelUpChoices(params);
    expect(a).toEqual(b);
  });
});
