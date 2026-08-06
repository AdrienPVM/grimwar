import { describe, expect, it } from 'vitest';

import type { GameEvent } from '@/shared/types/event';

import { compileJournal } from '../compiler';
import type { JournalContext } from '../templates';

/**
 * Tests du compilateur de journal (plan 25.1, step 10) — GROUPAGE.
 *
 * On vérifie que le compilateur segmente correctement le flux par `encounterId`
 * (exploration vs « ## Combat — {nom} »), respecte l'ordre chronologique des
 * segments (alternance exploration/combat), rend le pied d'issue du combat, et
 * retombe sur le repli `journal.empty` quand il n'y a rien à raconter.
 *
 * Le contexte est mocké (acteurs résolus) — on teste la STRUCTURE Markdown
 * produite, pas la résolution d'identité (couverte par templates.test.ts).
 */

const ctx: JournalContext = {
  resolveCharacterName: (id) => (id === 'lyralei' ? 'Lyralei' : null),
  resolveSpellName: (s) => s,
  resolveItemName: (r) => r,
  resolveConditionName: (c) => c,
};

let seq = 0;
function ev(
  kind: GameEvent['kind'],
  payload: Record<string, unknown>,
  encounterId: string | null = null,
  actor: string | null = null,
): GameEvent {
  seq += 1;
  return {
    id: `e${seq}`,
    kind,
    actorUserId: 'u1',
    actorCharacterId: actor,
    targetCharacterId: null,
    sessionId: 's1',
    encounterId,
    payload,
    visibility: 'all',
    createdAt: null,
  };
}

describe('compileJournal — groupage', () => {
  it('flux vide → repli journal.empty', () => {
    expect(compileJournal([], ctx)).toBe('_Aucun événement enregistré pour cette séance._');
  });

  it('événements hors-combat → une seule section ## Exploration', () => {
    const md = compileJournal(
      [
        ev('session-start', { sessionNumber: 1, title: 'Le départ' }),
        ev('roll', { label: 'Perception', rollKind: 'check', total: 14 }, null, 'lyralei'),
      ],
      ctx,
    );
    expect(md).toBe(
      [
        '## Exploration',
        '',
        '- La séance 1 — « Le départ » — commence.',
        '- Lyralei tente un test (Perception) — total 14.',
      ].join('\n'),
    );
  });

  it('combat → section ## Combat — {nom} avec pied d’issue', () => {
    const md = compileJournal(
      [
        ev('encounter-start', { name: 'Embuscade', participantCount: 4 }, 'enc1'),
        ev('turn-start', { participantName: 'Lyralei', round: 1 }, 'enc1'),
        ev('monster-hp-change', { monsterName: 'Gobelin 1', before: 7, after: 0, delta: -7 }, 'enc1'),
        ev('encounter-end', { name: 'Embuscade', outcome: 'victory' }, 'enc1'),
      ],
      ctx,
    );
    expect(md).toBe(
      [
        '## Combat — Embuscade',
        '',
        '- Au tour de **Lyralei** (round 1).',
        '- **Gobelin 1** subit 7 dégâts — PV : 7 → 0.',
        '',
        'Issue : victoire.',
      ].join('\n'),
    );
  });

  it('alternance exploration → combat → exploration préservée dans l’ordre', () => {
    const md = compileJournal(
      [
        ev('roll', { label: 'Discrétion', rollKind: 'check', total: 18 }, null, 'lyralei'),
        ev('encounter-start', { name: 'Le pont', participantCount: 2 }, 'enc1'),
        ev('turn-start', { participantName: 'Lyralei', round: 1 }, 'enc1'),
        ev('encounter-end', { name: 'Le pont', outcome: 'fled' }, 'enc1'),
        ev('roll', { label: 'Survie', rollKind: 'check', total: 9 }, null, 'lyralei'),
      ],
      ctx,
    );
    const sections = md.split('\n\n## ');
    // 1ʳᵉ section Exploration, 2ᵉ Combat, 3ᵉ Exploration (ordre chronologique).
    expect(md.startsWith('## Exploration')).toBe(true);
    expect(sections).toHaveLength(3);
    expect(sections[1]!.startsWith('Combat — Le pont')).toBe(true);
    expect(sections[2]!.startsWith('Exploration')).toBe(true);
    expect(md).toContain('Issue : fuite.');
    expect(md).toContain('Lyralei tente un test (Survie) — total 9.');
  });

  it('un combat réduit à start+end (aucun event en ligne) sans issue → section sautée', () => {
    // start + end sans outcome lisible ET sans tour/dégât → segment muet.
    const md = compileJournal(
      [
        ev('roll', { label: 'Init', rollKind: 'init', total: 12 }, null, 'lyralei'),
        ev('encounter-start', { name: 'Vide', participantCount: 1 }, 'enc1'),
        ev('encounter-end', { name: 'Vide', outcome: 'unknown' }, 'enc1'),
      ],
      ctx,
    );
    // Seule l'exploration subsiste ; pas de section Combat vide.
    expect(md).toContain('## Exploration');
    expect(md).not.toContain('## Combat');
  });

  // Les exemples étaient `level-up` / `xp-gain` jusqu'à M44, qui a templaté le
  // premier. L'invariant testé est le repli du compilateur quand AUCUN event ne
  // produit de ligne — il faut donc deux kinds encore réellement muets.
  it('tous les events muets (kinds non templatés) → repli journal.empty', () => {
    const md = compileJournal(
      [ev('treasure-drop', { gold: 120 }), ev('stabilize', {})],
      ctx,
    );
    expect(md).toBe('_Aucun événement enregistré pour cette séance._');
  });
});
