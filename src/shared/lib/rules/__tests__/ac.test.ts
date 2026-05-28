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

  // ─────────────────────────────────────────────────────────────────────
  // D13a — Armor of Shadows (Eldritch Invocation Warlock). Tests gravés
  // par l'utilisateur dans la spec du chantier :
  //  1. Warlock·armor-of-shadows sans armure → 13 + modDEX (= +3 sur base désarmée).
  //  2. Warlock·armor-of-shadows + cotte → CA armure (PAS de +3).
  //  3. Warlock·armor-of-shadows + bouclier seul → +3 cumulé (bouclier ≠ armure).
  //  4. Warlock sans armor-of-shadows → pas de bonus (registre filtre).
  //  5. Multi-classe Warlock·armor-of-shadows × Fighter·defense → exclusion mutuelle.
  // ─────────────────────────────────────────────────────────────────────

  function makeWarlock(opts: { invocations?: readonly string[] } = {}) {
    return {
      classId: 'warlock',
      subclassId: null,
      level: 1,
      clericDivineOrder: null,
      druidPrimalOrder: null,
      fighterFightingStyle: null,
      weaponMasteries: [],
      expertiseSkills: [],
      eldritchInvocations: [...(opts.invocations ?? [])],
      wizardSpellbookL1: [],
    };
  }

  it('D13a cas 1 : Warlock·armor-of-shadows sans armure (DEX 14) → 13 (= 10+DEX +3 Mage Armor)', () => {
    const ac = computeDisplayedAc({
      character: {
        ac: 12, // valeur wizard désarmée : 10 + DEX +2
        classes: [makeWarlock({ invocations: ['armor-of-shadows'] })],
      },
      acFromArmor: null,
      hasEquippedBodyArmor: false,
    });
    expect(ac).toBe(15); // 12 + 3
  });

  it('D13a cas 2 : Warlock·armor-of-shadows + cotte de mailles → CA armure (pas de +3, Mage Armor veto)', () => {
    const ac = computeDisplayedAc({
      character: {
        ac: 12,
        classes: [makeWarlock({ invocations: ['armor-of-shadows'] })],
      },
      acFromArmor: 16, // cotte de mailles (acDexMax 0)
      hasEquippedBodyArmor: true,
    });
    expect(ac).toBe(16);
  });

  it('D13a cas 3 : Warlock·armor-of-shadows + bouclier seul → +3 cumulé (bouclier ≠ armure au sens SRD)', () => {
    // Bouclier seul : acFromArmor = 10 + DEX +2 + shield +2 = 14 (DEX 14).
    // Mage Armor s'ajoute → 14 + 3 = 17.
    const ac = computeDisplayedAc({
      character: {
        ac: 12,
        classes: [makeWarlock({ invocations: ['armor-of-shadows'] })],
      },
      acFromArmor: 14,
      hasEquippedBodyArmor: false,
    });
    expect(ac).toBe(17);
  });

  it('D13a cas 4 : Warlock·eldritch-mind (autre invocation L1) sans armure → 0 bonus (registre filtre)', () => {
    const ac = computeDisplayedAc({
      character: {
        ac: 12,
        classes: [makeWarlock({ invocations: ['eldritch-mind'] })],
      },
      acFromArmor: null,
      hasEquippedBodyArmor: false,
    });
    expect(ac).toBe(12);
  });

  it('D13a cas 5 : multi-classe Warlock·armor-of-shadows × Fighter·defense + cotte → 17 (Defense actif, AoS veto)', () => {
    // Armure portée → Defense +1 actif, AoS veto par requiresUnarmored.
    const ac = computeDisplayedAc({
      character: {
        ac: 12,
        classes: [
          makeClass({ classId: 'fighter', fightingStyle: 'defense' }),
          makeWarlock({ invocations: ['armor-of-shadows'] }),
        ],
      },
      acFromArmor: 16, // cotte
      hasEquippedBodyArmor: true,
    });
    expect(ac).toBe(17); // 16 + Defense 1 + AoS 0
  });

  it('D13a cas 5 bis : multi-classe Warlock·armor-of-shadows × Fighter·defense SANS armure → +3 (AoS actif, Defense veto)', () => {
    // Pas d'armure → Defense veto par hasEquippedBodyArmor, AoS actif.
    const ac = computeDisplayedAc({
      character: {
        ac: 12,
        classes: [
          makeClass({ classId: 'fighter', fightingStyle: 'defense' }),
          makeWarlock({ invocations: ['armor-of-shadows'] }),
        ],
      },
      acFromArmor: null,
      hasEquippedBodyArmor: false,
    });
    expect(ac).toBe(15); // 12 + 3 (AoS), Defense bloqué
  });

  it('D13a anti-régression : slug inconnu (seed corrompu) → ne crash pas, 0 bonus', () => {
    const ac = computeDisplayedAc({
      character: {
        ac: 12,
        classes: [makeWarlock({ invocations: ['invocation-fantome-inexistante'] })],
      },
      acFromArmor: null,
      hasEquippedBodyArmor: false,
    });
    expect(ac).toBe(12);
  });

  // ─────────────────────────────────────────────────────────────────────
  // JALON 1B.2 — bonus AC issus des magic items équipés (et attunés si
  // requis). Cumulables avec Defense + invocations, additif au final.
  // ─────────────────────────────────────────────────────────────────────

  it('1B.2 : magicItemsAcBonus +1 (Cape de protection) cumule avec armure équipée', () => {
    const ac = computeDisplayedAc({
      character: {
        ac: 11,
        classes: [makeClass({ classId: 'rogue' })],
      },
      acFromArmor: 14, // cuir clouté + DEX +2
      hasEquippedBodyArmor: true,
      magicItemsAcBonus: 1,
    });
    expect(ac).toBe(15);
  });

  it('1B.2 : magicItemsAcBonus +2 (Cape + Anneau de protection) cumule avec Defense', () => {
    const ac = computeDisplayedAc({
      character: {
        ac: 11,
        classes: [makeClass({ classId: 'fighter', fightingStyle: 'defense' })],
      },
      acFromArmor: 16, // cotte de mailles
      hasEquippedBodyArmor: true,
      magicItemsAcBonus: 2,
    });
    expect(ac).toBe(19); // 16 + Defense 1 + magic 2
  });

  it('1B.2 : magicItemsAcBonus optional → comportement strictement identique à avant le wire', () => {
    // Test garde-fou : sans `magicItemsAcBonus`, le résultat est inchangé
    // par rapport aux call sites legacy. Protège contre une régression silencieuse.
    const ac = computeDisplayedAc({
      character: {
        ac: 12,
        classes: [makeClass({ classId: 'rogue' })],
      },
      acFromArmor: null,
      hasEquippedBodyArmor: false,
    });
    expect(ac).toBe(12);
  });
});
