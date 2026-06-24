import { describe, expect, it } from 'vitest';

import { buildJournalContext } from '../build-journal-context';

/**
 * Tests du constructeur de contexte (plan 25.2) — résolution d'identité PURE.
 * Vérifie l'IDENTITÉ des libellés résolus (FR officiel du bundle), pas la
 * présence, et les replis (id introuvable → slug capitalisé, jamais l'id cru).
 */

const ctx = buildJournalContext({
  characterNames: new Map([['c1', 'Lyralei']]),
  spells: [{ id: 'fireball', name: { fr: 'Boule de feu', en: 'Fireball' } }],
  items: [{ id: 'longsword', name: { fr: 'Épée longue', en: 'Longsword' } }],
  conditions: [{ id: 'poisoned', name: { fr: 'Empoisonné', en: 'Poisoned' } }],
});

describe('buildJournalContext', () => {
  it('résout un nom de personnage connu', () => {
    expect(ctx.resolveCharacterName('c1')).toBe('Lyralei');
  });

  it('personnage inconnu → null (le template applique son repli)', () => {
    expect(ctx.resolveCharacterName('c999')).toBeNull();
  });

  it('characterId null → null', () => {
    expect(ctx.resolveCharacterName(null)).toBeNull();
  });

  it('résout le libellé FR d’un sort connu (identité, pas slug)', () => {
    expect(ctx.resolveSpellName('fireball')).toBe('Boule de feu');
  });

  it('sort inconnu → slug capitalisé, jamais l’id cru sans transformation', () => {
    expect(ctx.resolveSpellName('magic-missile')).toBe('Magic missile');
  });

  it('résout le libellé FR d’un objet connu', () => {
    expect(ctx.resolveItemName('longsword')).toBe('Épée longue');
  });

  it('résout le libellé FR d’un état connu', () => {
    expect(ctx.resolveConditionName('poisoned')).toBe('Empoisonné');
  });

  it('état inconnu → slug capitalisé', () => {
    expect(ctx.resolveConditionName('prone')).toBe('Prone');
  });
});
