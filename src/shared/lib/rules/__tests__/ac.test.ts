import { describe, expect, it } from 'vitest';

import type { CharacterClassEntry, FightingStyle } from '@/shared/types/character';

import { computeDisplayedAc } from '../ac';

/**
 * Helper factory : minimal CharacterClassEntry — on n'a besoin que de
 * `fighterFightingStyle` pour la règle Defense (D19). Le reste est zéro/[].
 */
function makeClass(opts: {
  classId: string;
  fightingStyle?: FightingStyle | null;
}): CharacterClassEntry {
  return {
    classId: opts.classId,
    subclassId: null,
    level: 1,
    clericDivineOrder: null,
    druidPrimalOrder: null,
    fighterFightingStyle: opts.fightingStyle ?? null,
    weaponMasteries: [],
    expertiseSkills: [],
    eldritchInvocations: [],
    wizardSpellbookL1: [],
  };
}

describe('computeDisplayedAc', () => {
  // ─────────────────────────────────────────────────────────────────────
  // Les 3 cas du plan 13.14b (D19 + D20), gravés par l'utilisateur :
  //  1. Guerrier·defense + cotte de mailles → 16 + 1 = 17
  //  2. Guerrier·defense sans armure       → CA désarmée (10+DEX), pas de bonus
  //  3. Magicien + armure                  → CA armure, pas de Defense
  // ─────────────────────────────────────────────────────────────────────

  it('Guerrier·defense + cotte de mailles équipée → 17 (16 + Defense +1)', () => {
    const ac = computeDisplayedAc({
      character: {
        ac: 11, // valeur désarmée wizard (10 + DEX +1) — ignorée car armure équipée
        classes: [makeClass({ classId: 'fighter', fightingStyle: 'defense' })],
      },
      acFromArmor: 16, // cotte de mailles, acDexMax 0
      hasEquippedBodyArmor: true,
    });
    expect(ac).toBe(17);
  });

  it('Guerrier·defense sans armure équipée → CA désarmée brute (10+DEX), pas de bonus', () => {
    const ac = computeDisplayedAc({
      character: {
        ac: 12, // 10 + DEX +2
        classes: [makeClass({ classId: 'fighter', fightingStyle: 'defense' })],
      },
      acFromArmor: null,
      hasEquippedBodyArmor: false,
    });
    expect(ac).toBe(12);
  });

  it('Magicien + armure équipée → CA armure (pas de Defense, autre classe)', () => {
    const ac = computeDisplayedAc({
      character: {
        ac: 13,
        classes: [makeClass({ classId: 'wizard', fightingStyle: null })],
      },
      acFromArmor: 14, // armure quelconque
      hasEquippedBodyArmor: true,
    });
    expect(ac).toBe(14);
  });

  // ─────────────────────────────────────────────────────────────────────
  // Edge cases ciblés (pas du gold-plating — chacun ferme une porte connue)
  // ─────────────────────────────────────────────────────────────────────

  it('Guerrier·archery + armure → pas de bonus (Defense ≠ Archery)', () => {
    const ac = computeDisplayedAc({
      character: {
        ac: 12,
        classes: [makeClass({ classId: 'fighter', fightingStyle: 'archery' })],
      },
      acFromArmor: 16,
      hasEquippedBodyArmor: true,
    });
    expect(ac).toBe(16);
  });

  it('Guerrier·defense + bouclier seul (pas d\'armure portée) → pas de Defense', () => {
    // Cas piège : `acFromArmor` n'est pas null (shield gonfle à 10+DEX+2),
    // mais `hasEquippedBodyArmor=false` doit suffire à veto le +1.
    const ac = computeDisplayedAc({
      character: {
        ac: 12,
        classes: [makeClass({ classId: 'fighter', fightingStyle: 'defense' })],
      },
      acFromArmor: 14, // 10 + DEX +2 + shield +2
      hasEquippedBodyArmor: false,
    });
    expect(ac).toBe(14);
  });

  it('Guerrier·defense + armure + bouclier → Defense s\'applique (armure portée)', () => {
    const ac = computeDisplayedAc({
      character: {
        ac: 12,
        classes: [makeClass({ classId: 'fighter', fightingStyle: 'defense' })],
      },
      acFromArmor: 15, // 11 + DEX +2 + shield +2 (armure légère)
      hasEquippedBodyArmor: true,
    });
    expect(ac).toBe(16);
  });

  it('Multiclasse Guerrier·defense + Magicien + armure → +1 (n\'importe quelle entrée suffit)', () => {
    const ac = computeDisplayedAc({
      character: {
        ac: 12,
        classes: [
          makeClass({ classId: 'wizard', fightingStyle: null }),
          makeClass({ classId: 'fighter', fightingStyle: 'defense' }),
        ],
      },
      acFromArmor: 11,
      hasEquippedBodyArmor: true,
    });
    expect(ac).toBe(12);
  });

  it('Aucune classe sans Defense, pas d\'armure → fallback `character.ac`', () => {
    const ac = computeDisplayedAc({
      character: {
        ac: 13,
        classes: [makeClass({ classId: 'wizard', fightingStyle: null })],
      },
      acFromArmor: null,
      hasEquippedBodyArmor: false,
    });
    expect(ac).toBe(13);
  });
});
