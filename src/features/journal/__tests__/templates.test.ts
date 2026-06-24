import { describe, expect, it } from 'vitest';

import type { GameEvent } from '@/shared/types/event';

import type { JournalContext } from '../templates';
import { renderEventLine } from '../templates';

/**
 * Tests des templates de journal (plan 25.1, step 9) — VÉRITÉ DU CONTENU :
 * chaque assertion vérifie l'IDENTITÉ exacte de la ligne produite (la prose FR
 * attendue mot pour mot), pas une simple présence de sous-chaîne. Un template
 * qui afficherait un id machine cru, inventerait un libellé, ou se tromperait de
 * branche (crit vs normal, sort mineur vs emplacement) échouerait ici.
 *
 * Le contexte de résolution est mocké de façon déterministe : on contrôle les
 * libellés d'identité pour figer la sortie attendue.
 */

const ctx: JournalContext = {
  resolveCharacterName: (id) =>
    id === 'lyralei' ? 'Lyralei' : id === 'thorin' ? 'Thorin' : null,
  resolveSpellName: (slug) => (slug === 'fireball' ? 'Boule de feu' : slug),
  resolveItemName: (ref) => (ref === 'longsword' ? 'Épée longue' : ref),
  resolveConditionName: (slug) => (slug === 'poisoned' ? 'Empoisonné' : slug),
};

/** Construit un GameEvent minimal pour un kind + payload donnés. */
function ev(kind: GameEvent['kind'], payload: Record<string, unknown>, actor: string | null = null): GameEvent {
  return {
    id: 'e1',
    kind,
    actorUserId: 'u1',
    actorCharacterId: actor,
    targetCharacterId: null,
    sessionId: 's1',
    encounterId: null,
    payload,
    visibility: 'all',
    createdAt: null,
  };
}

describe('renderEventLine — jets (roll)', () => {
  it('attaque avec coup critique → libellé crit exact', () => {
    const line = renderEventLine(
      ev('roll', { label: 'Épée longue', rollKind: 'attack', total: 23, crit: true }, 'lyralei'),
      ctx,
    );
    expect(line).toBe('Lyralei attaque et obtient un **coup critique** (Épée longue, total 23) !');
  });

  it('attaque avec échec critique → libellé fumble exact', () => {
    const line = renderEventLine(
      ev('roll', { label: 'Dague', rollKind: 'attack', total: 4, fumble: true }, 'thorin'),
      ctx,
    );
    expect(line).toBe('Thorin attaque et subit un **échec critique** (Dague, total 4).');
  });

  it('attaque normale (ni crit ni fumble) → libellé attaque simple', () => {
    const line = renderEventLine(
      ev('roll', { label: 'Arc', rollKind: 'attack', total: 15 }, 'lyralei'),
      ctx,
    );
    expect(line).toBe('Lyralei attaque (Arc) — total 15.');
  });

  it('dégâts → libellé dégâts', () => {
    const line = renderEventLine(
      ev('roll', { label: '2d6 feu', rollKind: 'damage', total: 9 }, 'lyralei'),
      ctx,
    );
    expect(line).toBe('Lyralei inflige 9 dégâts (2d6 feu).');
  });

  it('acteur introuvable → repli « Quelqu’un »', () => {
    const line = renderEventLine(
      ev('roll', { label: 'Test', rollKind: 'check', total: 12 }, 'inconnu'),
      ctx,
    );
    expect(line).toBe('Quelqu’un tente un test (Test) — total 12.');
  });
});

describe('renderEventLine — sorts (spell-cast)', () => {
  it('sort à emplacement → niveau + emplacement consommé, nom résolu', () => {
    const line = renderEventLine(
      ev('spell-cast', { spellId: 'fireball', level: 3, slotConsumed: 3 }, 'lyralei'),
      ctx,
    );
    expect(line).toBe(
      'Lyralei lance **Boule de feu** (niveau 3, emplacement de niveau 3 consommé).',
    );
  });

  it('sort mineur (slotConsumed null) → libellé sort mineur, pas « emplacement »', () => {
    const line = renderEventLine(
      ev('spell-cast', { spellId: 'fire-bolt', level: 0, slotConsumed: null }, 'lyralei'),
      ctx,
    );
    // Repli de nom = slug (le mock ne connaît que fireball) — on teste la BRANCHE.
    expect(line).toBe('Lyralei lance le sort mineur **fire-bolt**.');
  });
});

describe('renderEventLine — diff de fiche', () => {
  it('hp-change dégâts → montant absolu + PV avant→après', () => {
    const line = renderEventLine(
      ev('hp-change', { before: 20, after: 13, delta: -7, reason: 'damage' }, 'thorin'),
      ctx,
    );
    expect(line).toBe('Thorin subit 7 dégâts — PV : 20 → 13.');
  });

  it('hp-change soin → libellé soin', () => {
    const line = renderEventLine(
      ev('hp-change', { before: 5, after: 12, delta: 7, reason: 'heal' }, 'thorin'),
      ctx,
    );
    expect(line).toBe('Thorin récupère 7 PV — PV : 5 → 12.');
  });

  it('condition-add → état résolu en libellé FR (identité, pas slug)', () => {
    const line = renderEventLine(ev('condition-add', { conditionId: 'poisoned' }, 'thorin'), ctx);
    expect(line).toBe('Thorin est désormais **Empoisonné**.');
  });

  it('condition-remove → libellé de retrait', () => {
    const line = renderEventLine(ev('condition-remove', { conditionId: 'poisoned' }, 'thorin'), ctx);
    expect(line).toBe('Thorin n’est plus **Empoisonné**.');
  });

  it('slot-consumed singulier (count=1) → « un emplacement »', () => {
    const line = renderEventLine(ev('slot-consumed', { slotLevel: 2, count: 1 }, 'lyralei'), ctx);
    expect(line).toBe('Lyralei consomme un emplacement de niveau 2.');
  });

  it('slot-consumed pluriel (count=2) → « 2 emplacements »', () => {
    const line = renderEventLine(ev('slot-consumed', { slotLevel: 1, count: 2 }, 'lyralei'), ctx);
    expect(line).toBe('Lyralei consomme 2 emplacements de niveau 1.');
  });

  it('item-acquired qty 1 → sans multiplicateur, nom résolu', () => {
    const line = renderEventLine(ev('item-acquired', { itemRef: 'longsword', qty: 1 }, 'thorin'), ctx);
    expect(line).toBe('Thorin récupère **Épée longue**.');
  });

  it('item-acquired qty 3 → avec ×3', () => {
    const line = renderEventLine(ev('item-acquired', { itemRef: 'longsword', qty: 3 }, 'thorin'), ctx);
    expect(line).toBe('Thorin récupère **Épée longue** (×3).');
  });
});

describe('renderEventLine — rencontre (plan 24)', () => {
  it('turn-start → nom du participant + round', () => {
    const line = renderEventLine(
      ev('turn-start', { participantName: 'Gobelin 1', round: 2 }, null),
      ctx,
    );
    expect(line).toBe('Au tour de **Gobelin 1** (round 2).');
  });

  it('monster-hp-change dégâts → nom monstre + PV avant→après', () => {
    const line = renderEventLine(
      ev('monster-hp-change', { monsterName: 'Gobelin 1', before: 7, after: 0, delta: -7 }, null),
      ctx,
    );
    expect(line).toBe('**Gobelin 1** subit 7 dégâts — PV : 7 → 0.');
  });

  it('encounter-start est STRUCTUREL → aucune ligne (null)', () => {
    expect(renderEventLine(ev('encounter-start', { name: 'Embuscade', participantCount: 4 }), ctx)).toBeNull();
  });

  it('encounter-end est STRUCTUREL → aucune ligne (null)', () => {
    expect(renderEventLine(ev('encounter-end', { name: 'Embuscade', outcome: 'victory' }), ctx)).toBeNull();
  });
});

describe('renderEventLine — cycle de vie séance', () => {
  it('session-start → numéro + titre', () => {
    const line = renderEventLine(ev('session-start', { sessionNumber: 3, title: 'La crypte' }), ctx);
    expect(line).toBe('La séance 3 — « La crypte » — commence.');
  });

  it('session-end → numéro + titre', () => {
    const line = renderEventLine(ev('session-end', { sessionNumber: 3, title: 'La crypte' }), ctx);
    expect(line).toBe('La séance 3 — « La crypte » — se termine.');
  });
});

describe('renderEventLine — kind non templaté', () => {
  it('un kind sans template (level-up, non encore journalisé) → null (pas de crash)', () => {
    expect(renderEventLine(ev('level-up', { newLevel: 5 }), ctx)).toBeNull();
  });
});
