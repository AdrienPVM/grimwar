import { describe, expect, it } from 'vitest';

import type { Character } from '@/shared/types/character';

import {
  ancestryCombatUsageKey,
  ancestryCombatUsageMax,
  remainingAncestryCombatUses,
  setAncestryCombatUses,
} from '../ancestry-combat-usage';

/**
 * Helper d'usage des aptitudes de combat d'ascendance (Souffle / Ascendance
 * gigante). Cat. 4 (calcul de règle au NOMBRE : max = bonus de maîtrise) +
 * sémantique de consommation/recharge.
 */

function charWith(
  featureUsage: Character['featureUsage'],
  totalLevel: number,
): Character {
  // On ne fabrique qu'un Character partiel typé : les helpers ne lisent que
  // `featureUsage`. Cast unique, justifié par le périmètre de lecture du module.
  return { featureUsage, totalLevel } as unknown as Character;
}

describe('ancestry-combat-usage — clé', () => {
  it('namespace distinct des sorts d\'ascendance', () => {
    expect(ancestryCombatUsageKey('breath-weapon')).toBe('ancestry-combat:breath-weapon');
    expect(ancestryCombatUsageKey('giant-ancestry')).toBe('ancestry-combat:giant-ancestry');
  });
});

describe('ancestry-combat-usage — max = bonus de maîtrise', () => {
  it('suit la table SRD du bonus de maîtrise selon le niveau total', () => {
    expect(ancestryCombatUsageMax(1)).toBe(2);
    expect(ancestryCombatUsageMax(5)).toBe(3);
    expect(ancestryCombatUsageMax(9)).toBe(4);
    expect(ancestryCombatUsageMax(13)).toBe(5);
    expect(ancestryCombatUsageMax(17)).toBe(6);
  });
});

describe('ancestry-combat-usage — usages restants (init paresseuse)', () => {
  it('plein par défaut tant que jamais consommé', () => {
    const c = charWith({}, 5);
    expect(remainingAncestryCombatUses(c, 'breath-weapon', 5)).toBe(3);
  });

  it('lit la valeur stockée quand présente', () => {
    const c = charWith(
      { 'ancestry-combat:breath-weapon': { current: 1, max: 3, restoresOn: 'long' } },
      5,
    );
    expect(remainingAncestryCombatUses(c, 'breath-weapon', 5)).toBe(1);
  });
});

describe('ancestry-combat-usage — setAncestryCombatUses', () => {
  it('dépense (init paresseuse → max-1) et écrit le patch correct', () => {
    const c = charWith({}, 5); // PB 3 → plein = 3
    const patch = setAncestryCombatUses(c, 'breath-weapon', 5, 2);
    expect(patch).toEqual({
      'ancestry-combat:breath-weapon': { current: 2, max: 3, restoresOn: 'long' },
    });
  });

  it('clampe à 0 (pas de valeur négative)', () => {
    const c = charWith(
      { 'ancestry-combat:giant-ancestry': { current: 0, max: 2, restoresOn: 'long' } },
      1,
    );
    expect(setAncestryCombatUses(c, 'giant-ancestry', 1, -1)).toBeNull();
  });

  it('clampe à max et préserve les autres aptitudes', () => {
    const c = charWith(
      {
        'ancestry-combat:breath-weapon': { current: 1, max: 3, restoresOn: 'long' },
        'ancestry-spell:represailles-infernales': { current: 0, max: 1, restoresOn: 'long' },
      },
      5,
    );
    const patch = setAncestryCombatUses(c, 'breath-weapon', 5, 99);
    expect(patch).toEqual({
      'ancestry-combat:breath-weapon': { current: 3, max: 3, restoresOn: 'long' },
      'ancestry-spell:represailles-infernales': { current: 0, max: 1, restoresOn: 'long' },
    });
  });

  it('no-op (null) si la valeur ne change pas', () => {
    const c = charWith(
      { 'ancestry-combat:breath-weapon': { current: 2, max: 3, restoresOn: 'long' } },
      5,
    );
    expect(setAncestryCombatUses(c, 'breath-weapon', 5, 2)).toBeNull();
  });
});
