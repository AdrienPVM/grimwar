import { describe, expect, it } from 'vitest';

import {
  buildLevelUpDraft,
  canSubmitFlow,
  initialLevelUpFlowState,
  levelUpFlowReducer,
} from '../level-up-flow';
import type { LevelUpStep } from '../level-up-choices';

/**
 * JALON 2B.4b — Reducer pur + builder pour la modale de level-up.
 *
 * Red-green-refactor : on assert d'abord la forme de la machine à états
 * (état initial, transitions par action, prédicats), puis on dérive la fonction
 * `buildLevelUpDraft` qui transforme l'état accumulé en `LevelUpDraft` validé
 * par Zod — frontière vers `applyLevelUp` (jalon 2B.3a).
 *
 * Le reducer ne connaît PAS les étapes — `steps: LevelUpStep[]` est porté par
 * le composant (issu de `levelUpChoices`). Le reducer ne gère que les inputs
 * utilisateur. Les prédicats `canSubmitFlow(state, steps)` prennent les steps
 * en entrée.
 */

describe('initialLevelUpFlowState', () => {
  it('est vide (aucun choix posé) et stepIdx=0', () => {
    expect(initialLevelUpFlowState).toEqual({
      stepIdx: 0,
      hpRoll: null,
      subclassId: null,
      asiOrFeat: null,
      newSpellsKnown: [],
      newCantrips: [],
      newInvocations: [],
    });
  });
});

describe('levelUpFlowReducer — navigation', () => {
  it('go-next incrémente stepIdx', () => {
    const next = levelUpFlowReducer(initialLevelUpFlowState, { type: 'go-next' });
    expect(next.stepIdx).toBe(1);
  });

  it('go-next puis go-next puis go-prev → stepIdx=1', () => {
    let s = initialLevelUpFlowState;
    s = levelUpFlowReducer(s, { type: 'go-next' });
    s = levelUpFlowReducer(s, { type: 'go-next' });
    s = levelUpFlowReducer(s, { type: 'go-prev' });
    expect(s.stepIdx).toBe(1);
  });

  it('go-prev sur stepIdx=0 reste à 0 (pas de stepIdx négatif)', () => {
    const next = levelUpFlowReducer(initialLevelUpFlowState, { type: 'go-prev' });
    expect(next.stepIdx).toBe(0);
  });

  it("'reset' restaure l'état initial", () => {
    let s = levelUpFlowReducer(initialLevelUpFlowState, { type: 'go-next' });
    s = levelUpFlowReducer(s, { type: 'set-hp-roll', value: { kind: 'average' } });
    s = levelUpFlowReducer(s, { type: 'reset' });
    expect(s).toEqual(initialLevelUpFlowState);
  });
});

describe('levelUpFlowReducer — setters', () => {
  it("'set-hp-roll' pose hpRoll", () => {
    const next = levelUpFlowReducer(initialLevelUpFlowState, {
      type: 'set-hp-roll',
      value: { kind: 'average' },
    });
    expect(next.hpRoll).toEqual({ kind: 'average' });
  });

  it("'set-hp-roll' rolled pose la valeur", () => {
    const next = levelUpFlowReducer(initialLevelUpFlowState, {
      type: 'set-hp-roll',
      value: { kind: 'rolled', rolled: 6 },
    });
    expect(next.hpRoll).toEqual({ kind: 'rolled', rolled: 6 });
  });

  it("'set-subclass' pose subclassId", () => {
    const next = levelUpFlowReducer(initialLevelUpFlowState, {
      type: 'set-subclass',
      id: 'fiend',
    });
    expect(next.subclassId).toBe('fiend');
  });

  it("'set-asi-or-feat' ASI pose asiOrFeat", () => {
    const asi = {
      kind: 'asi' as const,
      abilityIncreases: [{ ability: 'for' as const, bonus: 2 as const }],
    };
    const next = levelUpFlowReducer(initialLevelUpFlowState, {
      type: 'set-asi-or-feat',
      value: asi,
    });
    expect(next.asiOrFeat).toEqual(asi);
  });

  it("'set-asi-or-feat' feat pose featId", () => {
    const feat = { kind: 'feat' as const, featId: 'tough' };
    const next = levelUpFlowReducer(initialLevelUpFlowState, {
      type: 'set-asi-or-feat',
      value: feat,
    });
    expect(next.asiOrFeat).toEqual(feat);
  });

  it("'set-spells' pose newSpellsKnown", () => {
    const next = levelUpFlowReducer(initialLevelUpFlowState, {
      type: 'set-spells',
      ids: ['fireball', 'magic-missile'],
    });
    expect(next.newSpellsKnown).toEqual(['fireball', 'magic-missile']);
  });

  it("'set-cantrips' pose newCantrips", () => {
    const next = levelUpFlowReducer(initialLevelUpFlowState, {
      type: 'set-cantrips',
      ids: ['fire-bolt'],
    });
    expect(next.newCantrips).toEqual(['fire-bolt']);
  });

  it("'set-invocations' pose newInvocations", () => {
    const next = levelUpFlowReducer(initialLevelUpFlowState, {
      type: 'set-invocations',
      ids: ['agonizing-blast'],
    });
    expect(next.newInvocations).toEqual(['agonizing-blast']);
  });

  it("'set-hp-roll' deux fois remplace (pas accumulation)", () => {
    let s = levelUpFlowReducer(initialLevelUpFlowState, {
      type: 'set-hp-roll',
      value: { kind: 'rolled', rolled: 4 },
    });
    s = levelUpFlowReducer(s, {
      type: 'set-hp-roll',
      value: { kind: 'average' },
    });
    expect(s.hpRoll).toEqual({ kind: 'average' });
  });

  it("'set-spells' deux fois remplace (le caller envoie la liste complète à chaque fois)", () => {
    let s = levelUpFlowReducer(initialLevelUpFlowState, {
      type: 'set-spells',
      ids: ['fireball'],
    });
    s = levelUpFlowReducer(s, {
      type: 'set-spells',
      ids: ['magic-missile', 'shield'],
    });
    expect(s.newSpellsKnown).toEqual(['magic-missile', 'shield']);
  });
});

describe('canSubmitFlow', () => {
  const stepsFighterL2: LevelUpStep[] = [{ kind: 'hp-roll' }];
  const stepsFighterL4: LevelUpStep[] = [{ kind: 'hp-roll' }, { kind: 'asi-or-feat' }];
  const stepsWarlockL3: LevelUpStep[] = [
    { kind: 'hp-roll' },
    { kind: 'subclass' },
    { kind: 'cantrips', count: 0 },
    { kind: 'spells', count: 1 },
    { kind: 'invocations', count: 1 },
  ];

  it('fighter L2 (HP seul) — false sans hpRoll', () => {
    expect(canSubmitFlow(initialLevelUpFlowState, stepsFighterL2)).toBe(false);
  });

  it('fighter L2 (HP seul) — true avec hpRoll', () => {
    const s = levelUpFlowReducer(initialLevelUpFlowState, {
      type: 'set-hp-roll',
      value: { kind: 'average' },
    });
    expect(canSubmitFlow(s, stepsFighterL2)).toBe(true);
  });

  it('fighter L4 (HP + ASI) — false avec juste hpRoll', () => {
    const s = levelUpFlowReducer(initialLevelUpFlowState, {
      type: 'set-hp-roll',
      value: { kind: 'average' },
    });
    expect(canSubmitFlow(s, stepsFighterL4)).toBe(false);
  });

  it('fighter L4 (HP + ASI) — true avec hpRoll + asi', () => {
    let s = levelUpFlowReducer(initialLevelUpFlowState, {
      type: 'set-hp-roll',
      value: { kind: 'average' },
    });
    s = levelUpFlowReducer(s, {
      type: 'set-asi-or-feat',
      value: {
        kind: 'asi',
        abilityIncreases: [{ ability: 'for', bonus: 2 }],
      },
    });
    expect(canSubmitFlow(s, stepsFighterL4)).toBe(true);
  });

  it('warlock L3 — false sans subclass', () => {
    let s = levelUpFlowReducer(initialLevelUpFlowState, {
      type: 'set-hp-roll',
      value: { kind: 'average' },
    });
    s = levelUpFlowReducer(s, { type: 'set-spells', ids: ['scorching-ray'] });
    s = levelUpFlowReducer(s, { type: 'set-invocations', ids: ['agonizing-blast'] });
    expect(canSubmitFlow(s, stepsWarlockL3)).toBe(false);
  });

  it("warlock L3 — false si nombre d'invocations ne matche pas count", () => {
    let s = levelUpFlowReducer(initialLevelUpFlowState, {
      type: 'set-hp-roll',
      value: { kind: 'average' },
    });
    s = levelUpFlowReducer(s, { type: 'set-subclass', id: 'fiend' });
    s = levelUpFlowReducer(s, { type: 'set-spells', ids: ['scorching-ray'] });
    // 0 invocation alors qu'on en attend 1
    expect(canSubmitFlow(s, stepsWarlockL3)).toBe(false);
  });

  it('warlock L3 — true avec subclass + spells + invocations conformes', () => {
    let s = levelUpFlowReducer(initialLevelUpFlowState, {
      type: 'set-hp-roll',
      value: { kind: 'average' },
    });
    s = levelUpFlowReducer(s, { type: 'set-subclass', id: 'fiend' });
    s = levelUpFlowReducer(s, { type: 'set-spells', ids: ['scorching-ray'] });
    s = levelUpFlowReducer(s, { type: 'set-invocations', ids: ['agonizing-blast'] });
    expect(canSubmitFlow(s, stepsWarlockL3)).toBe(true);
  });

  it('spells count=2 — false avec une seule', () => {
    const steps: LevelUpStep[] = [{ kind: 'hp-roll' }, { kind: 'spells', count: 2 }];
    let s = levelUpFlowReducer(initialLevelUpFlowState, {
      type: 'set-hp-roll',
      value: { kind: 'average' },
    });
    s = levelUpFlowReducer(s, { type: 'set-spells', ids: ['fireball'] });
    expect(canSubmitFlow(s, steps)).toBe(false);
  });

  it('cantrips count=1 — true avec un cantrip', () => {
    const steps: LevelUpStep[] = [{ kind: 'hp-roll' }, { kind: 'cantrips', count: 1 }];
    let s = levelUpFlowReducer(initialLevelUpFlowState, {
      type: 'set-hp-roll',
      value: { kind: 'average' },
    });
    s = levelUpFlowReducer(s, { type: 'set-cantrips', ids: ['fire-bolt'] });
    expect(canSubmitFlow(s, steps)).toBe(true);
  });
});

describe('buildLevelUpDraft', () => {
  it('fighter L1→L2 (HP avg seul) → draft minimal', () => {
    const s = levelUpFlowReducer(initialLevelUpFlowState, {
      type: 'set-hp-roll',
      value: { kind: 'average' },
    });
    const draft = buildLevelUpDraft({
      state: s,
      classId: 'fighter',
      newClassLevel: 2,
    });
    expect(draft).toEqual({
      classId: 'fighter',
      newClassLevel: 2,
      hpRoll: { kind: 'average' },
    });
  });

  it('fighter L3→L4 (HP + ASI +2 STR)', () => {
    let s = levelUpFlowReducer(initialLevelUpFlowState, {
      type: 'set-hp-roll',
      value: { kind: 'average' },
    });
    s = levelUpFlowReducer(s, {
      type: 'set-asi-or-feat',
      value: {
        kind: 'asi',
        abilityIncreases: [{ ability: 'for', bonus: 2 }],
      },
    });
    const draft = buildLevelUpDraft({
      state: s,
      classId: 'fighter',
      newClassLevel: 4,
    });
    expect(draft).toEqual({
      classId: 'fighter',
      newClassLevel: 4,
      hpRoll: { kind: 'average' },
      asiOrFeat: {
        kind: 'asi',
        abilityIncreases: [{ ability: 'for', bonus: 2 }],
      },
    });
  });

  it('warlock L2→L3 (HP + subclass + spell + invocation)', () => {
    let s = levelUpFlowReducer(initialLevelUpFlowState, {
      type: 'set-hp-roll',
      value: { kind: 'rolled', rolled: 5 },
    });
    s = levelUpFlowReducer(s, { type: 'set-subclass', id: 'fiend' });
    s = levelUpFlowReducer(s, { type: 'set-spells', ids: ['scorching-ray'] });
    s = levelUpFlowReducer(s, {
      type: 'set-invocations',
      ids: ['agonizing-blast'],
    });
    const draft = buildLevelUpDraft({
      state: s,
      classId: 'warlock',
      newClassLevel: 3,
    });
    expect(draft).toEqual({
      classId: 'warlock',
      newClassLevel: 3,
      hpRoll: { kind: 'rolled', rolled: 5 },
      subclassId: 'fiend',
      newSpellsKnown: ['scorching-ray'],
      newInvocations: ['agonizing-blast'],
    });
  });

  it('wizard L1→L2 (HP + cantrip + spell)', () => {
    let s = levelUpFlowReducer(initialLevelUpFlowState, {
      type: 'set-hp-roll',
      value: { kind: 'average' },
    });
    s = levelUpFlowReducer(s, {
      type: 'set-cantrips',
      ids: ['light'],
    });
    s = levelUpFlowReducer(s, {
      type: 'set-spells',
      ids: ['burning-hands', 'shield'],
    });
    const draft = buildLevelUpDraft({
      state: s,
      classId: 'wizard',
      newClassLevel: 2,
    });
    expect(draft).toEqual({
      classId: 'wizard',
      newClassLevel: 2,
      hpRoll: { kind: 'average' },
      newCantrips: ['light'],
      newSpellsKnown: ['burning-hands', 'shield'],
    });
  });

  it('jette quand hpRoll est null (hpRoll est obligatoire)', () => {
    expect(() =>
      buildLevelUpDraft({
        state: initialLevelUpFlowState,
        classId: 'fighter',
        newClassLevel: 2,
      }),
    ).toThrow(/hpRoll/i);
  });

  it('valide le draft via Zod (rejette classId non kebab-case)', () => {
    const s = levelUpFlowReducer(initialLevelUpFlowState, {
      type: 'set-hp-roll',
      value: { kind: 'average' },
    });
    expect(() =>
      buildLevelUpDraft({
        state: s,
        classId: 'Fighter',
        newClassLevel: 2,
      }),
    ).toThrow();
  });

  it('valide le draft via Zod (rejette newClassLevel hors bornes)', () => {
    const s = levelUpFlowReducer(initialLevelUpFlowState, {
      type: 'set-hp-roll',
      value: { kind: 'average' },
    });
    expect(() =>
      buildLevelUpDraft({
        state: s,
        classId: 'fighter',
        newClassLevel: 1,
      }),
    ).toThrow();
  });

  it("n'inclut pas asiOrFeat quand l'utilisateur n'a pas choisi", () => {
    const s = levelUpFlowReducer(initialLevelUpFlowState, {
      type: 'set-hp-roll',
      value: { kind: 'average' },
    });
    const draft = buildLevelUpDraft({
      state: s,
      classId: 'fighter',
      newClassLevel: 2,
    });
    expect(draft).not.toHaveProperty('asiOrFeat');
  });

  it("n'inclut pas subclassId quand vide", () => {
    const s = levelUpFlowReducer(initialLevelUpFlowState, {
      type: 'set-hp-roll',
      value: { kind: 'average' },
    });
    const draft = buildLevelUpDraft({
      state: s,
      classId: 'fighter',
      newClassLevel: 2,
    });
    expect(draft).not.toHaveProperty('subclassId');
  });

  it("n'inclut pas les tableaux de sorts/cantrips/invocations quand vides", () => {
    const s = levelUpFlowReducer(initialLevelUpFlowState, {
      type: 'set-hp-roll',
      value: { kind: 'average' },
    });
    const draft = buildLevelUpDraft({
      state: s,
      classId: 'fighter',
      newClassLevel: 2,
    });
    expect(draft).not.toHaveProperty('newSpellsKnown');
    expect(draft).not.toHaveProperty('newCantrips');
    expect(draft).not.toHaveProperty('newInvocations');
  });
});
