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
  // L'exemple était `level-up` jusqu'à M44, qui lui a donné un template. Ce que
  // ce test protège n'est pas ce kind-là mais l'invariant : un kind sans
  // template retourne `null` au lieu de planter. `treasure-drop` est déclaré au
  // schéma et toujours sans logger — il tient le rôle.
  it('un kind sans template (treasure-drop, non encore journalisé) → null (pas de crash)', () => {
    expect(renderEventLine(ev('treasure-drop', { gold: 120 }), ctx)).toBeNull();
  });
});

describe('renderEventLine — dm-edit (plan 26)', () => {
  function dmEditEvent(target: string | null, fieldsChanged: string[]): GameEvent {
    return {
      id: 'e1',
      kind: 'dm-edit',
      actorUserId: 'gm-1',
      actorCharacterId: null,
      targetCharacterId: target,
      sessionId: 's1',
      encounterId: null,
      payload: { fieldsChanged, changes: {} },
      visibility: 'all',
      createdAt: null,
    };
  }

  it('nomme la fiche CIBLE + le nombre de champs (identité exacte)', () => {
    expect(renderEventLine(dmEditEvent('lyralei', ['hp', 'conditions']), ctx)).toBe(
      'Le meneur ajuste la fiche de **Lyralei** (2 champ·s).',
    );
  });

  it('cible non résolue → repli « Quelqu’un » (jamais l’id brut)', () => {
    expect(renderEventLine(dmEditEvent('inconnu', ['status']), ctx)).toBe(
      'Le meneur ajuste la fiche de **Quelqu’un** (1 champ·s).',
    );
  });
});

/**
 * M44 — jalons de vie du personnage. Ces quatre kinds étaient déclarés au schéma
 * et documentés avec leur payload dans EVENT-LOG.md, mais aucun logger ne les
 * écrivait et aucun template ne les rendait : `renderEventLine` retournait
 * `null`, donc le journal d'une séance ne mentionnait jamais qu'un personnage
 * était monté de niveau, mort, ou revenu.
 *
 * Vérité du contenu : chaque assertion fige la prose FR mot pour mot, et chaque
 * branche (nouvelle classe vs progression, 20 naturel vs meneur, repos court vs
 * long) est distinguée — un template qui les confondrait passerait un test de
 * simple présence.
 */
describe('renderEventLine — jalons de vie (M44)', () => {
  it('montée de niveau dans une classe déjà possédée', () => {
    expect(
      renderEventLine(
        ev(
          'level-up',
          { newLevel: 5, classId: 'rogue', className: 'Roublard', classLevel: 5, isNewClass: false },
          'lyralei',
        ),
        ctx,
      ),
    ).toBe('Lyralei passe **niveau 5** (Roublard 5).');
  });

  it('ouverture d’une nouvelle classe → formulation distincte du simple niveau', () => {
    expect(
      renderEventLine(
        ev(
          'level-up',
          { newLevel: 5, classId: 'rogue', className: 'Roublard', classLevel: 1, isNewClass: true },
          'thorin',
        ),
        ctx,
      ),
    ).toBe('Thorin embrasse une nouvelle voie : **Roublard** — niveau 5 au total.');
  });

  it('mort par sauvegardes ratées', () => {
    expect(renderEventLine(ev('death', { cause: 'death-saves' }, 'lyralei'), ctx)).toBe(
      '**Lyralei** succombe à ses blessures.',
    );
  });

  it('mort décidée par le meneur → formulation neutre', () => {
    expect(renderEventLine(ev('death', { cause: 'dm' }, 'thorin'), ctx)).toBe('**Thorin** meurt.');
  });

  it('20 naturel en sauvegarde de mort → on se relève seul', () => {
    expect(renderEventLine(ev('revival', { source: 'nat20' }, 'lyralei'), ctx)).toBe(
      '**Lyralei** rouvre les yeux au dernier moment et se relève.',
    );
  });

  it('résurrection par le meneur → formulation distincte du 20 naturel', () => {
    expect(renderEventLine(ev('revival', { source: 'dm' }, 'thorin'), ctx)).toBe(
      '**Thorin** est ramené à la vie.',
    );
  });

  it('repos court → aucun bilan chiffré (il ne soigne pas)', () => {
    expect(
      renderEventLine(ev('rest', { type: 'short', hpHealed: 0, resourcesReset: 2 }, 'lyralei'), ctx),
    ).toBe('Lyralei prend un repos court.');
  });

  it('repos long qui soigne → le bilan chiffré entre dans la prose', () => {
    expect(
      renderEventLine(ev('rest', { type: 'long', hpHealed: 12, resourcesReset: 3 }, 'thorin'), ctx),
    ).toBe('Thorin prend un repos long et récupère 12 PV.');
  });

  it('repos long sans PV rendus (slowHealing, ou déjà au max) → pas de « 0 PV »', () => {
    expect(
      renderEventLine(ev('rest', { type: 'long', hpHealed: 0, resourcesReset: 3 }, 'thorin'), ctx),
    ).toBe('Thorin prend un repos long.');
  });

  it('acteur non résolu → repli générique, jamais l’id brut', () => {
    expect(renderEventLine(ev('rest', { type: 'short' }, 'inconnu'), ctx)).toBe(
      'Quelqu’un prend un repos court.',
    );
  });
});

describe('renderEventLine — level-up à payload partiel (M44)', () => {
  it('sans nom de classe → phrase courte, jamais une parenthèse vide « (— 1) »', () => {
    const line = renderEventLine(ev('level-up', { newLevel: 2 }, 'lyralei'), ctx);
    expect(line).toBe('Lyralei passe **niveau 2**.');
  });
});
