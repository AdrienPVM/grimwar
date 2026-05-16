import { describe, expect, it } from 'vitest';

import {
  applyDamage,
  applyDeathSaveOutcome,
  applyHeal,
  clampHpCurrent,
  isSheetReadOnly,
} from '../hp-combat';

/**
 * Tests pures de la logique combat. Aucune dépendance React/Firestore — toutes
 * les règles "qui plante en prod le vendredi soir" doivent être verrouillées ici.
 */

describe('clampHpCurrent', () => {
  it("ne passe pas en négatif", () => {
    expect(clampHpCurrent(-3, 30)).toBe(0);
  });
  it('ne dépasse pas le max', () => {
    expect(clampHpCurrent(45, 30)).toBe(30);
  });
  it('renvoie 0 si max <= 0 (cas dégénéré)', () => {
    expect(clampHpCurrent(5, 0)).toBe(0);
  });
  it('passe-plat sur valeur valide', () => {
    expect(clampHpCurrent(12, 30)).toBe(12);
  });
});

describe('applyDamage', () => {
  it('absorbe par hp.temp avant hp.current', () => {
    const r = applyDamage({ current: 20, max: 30, temp: 7 }, 5);
    expect(r.hp).toEqual({ current: 20, max: 30, temp: 2 });
    expect(r.triggeredDying).toBe(false);
  });
  it('vide hp.temp puis entame hp.current', () => {
    const r = applyDamage({ current: 20, max: 30, temp: 4 }, 10);
    expect(r.hp).toEqual({ current: 14, max: 30, temp: 0 });
  });
  it('déclenche dying quand current passe à 0 sans massive', () => {
    const r = applyDamage({ current: 8, max: 30, temp: 0 }, 12);
    expect(r.hp.current).toBe(0);
    expect(r.triggeredDying).toBe(true);
    expect(r.triggeredMassiveDeath).toBe(false);
  });
  it('déclenche mort massive si dégâts excédentaires ≥ hp.max', () => {
    const r = applyDamage({ current: 8, max: 30, temp: 0 }, 40); // 8 amenés à 0 + 32 d'excès
    expect(r.hp.current).toBe(0);
    expect(r.triggeredDying).toBe(false);
    expect(r.triggeredMassiveDeath).toBe(true);
  });
  it('zéro damage = no-op', () => {
    const r = applyDamage({ current: 10, max: 30, temp: 0 }, 0);
    expect(r.hp).toEqual({ current: 10, max: 30, temp: 0 });
    expect(r.triggeredDying).toBe(false);
  });
  it('damage négatif clampé à 0 (UI safe)', () => {
    const r = applyDamage({ current: 10, max: 30, temp: 0 }, -5);
    expect(r.hp).toEqual({ current: 10, max: 30, temp: 0 });
  });
});

describe('applyHeal', () => {
  it("clampe au max et n'augmente jamais hp.temp", () => {
    const next = applyHeal({ current: 25, max: 30, temp: 4 }, 20);
    expect(next).toEqual({ current: 30, max: 30, temp: 4 });
  });
  it('soin 0 = no-op', () => {
    const next = applyHeal({ current: 5, max: 30, temp: 0 }, 0);
    expect(next).toEqual({ current: 5, max: 30, temp: 0 });
  });
  it("relève d'un PJ tombé à 0 (sortie de mode dying)", () => {
    const next = applyHeal({ current: 0, max: 30, temp: 0 }, 8);
    expect(next.current).toBe(8);
  });
});

describe('applyDeathSaveOutcome', () => {
  it('nat 20 → revived à 1 PV avec deathSaves remis à 0', () => {
    const o = applyDeathSaveOutcome({ success: 2, fail: 1 }, 20);
    expect(o.kind).toBe('revived');
    if (o.kind === 'revived') {
      expect(o.restoredHp).toBe(1);
      expect(o.deathSaves).toEqual({ success: 0, fail: 0 });
    }
  });
  it('nat 1 → +2 échecs (peut tuer directement à fail=1)', () => {
    const o = applyDeathSaveOutcome({ success: 0, fail: 1 }, 1);
    expect(o.kind).toBe('dead');
    expect(o.deathSaves).toEqual({ success: 0, fail: 3 });
  });
  it('nat 1 à fail=0 → pending fail=2', () => {
    const o = applyDeathSaveOutcome({ success: 0, fail: 0 }, 1);
    expect(o.kind).toBe('pending');
    expect(o.deathSaves).toEqual({ success: 0, fail: 2 });
  });
  it('≥10 → +1 succès', () => {
    const o = applyDeathSaveOutcome({ success: 1, fail: 1 }, 12);
    expect(o.kind).toBe('pending');
    expect(o.deathSaves).toEqual({ success: 2, fail: 1 });
  });
  it('3e succès → stabilized (reset deathSaves)', () => {
    const o = applyDeathSaveOutcome({ success: 2, fail: 1 }, 15);
    expect(o.kind).toBe('stabilized');
    expect(o.deathSaves).toEqual({ success: 0, fail: 0 });
  });
  it('<10 → +1 échec', () => {
    const o = applyDeathSaveOutcome({ success: 1, fail: 0 }, 7);
    expect(o.kind).toBe('pending');
    expect(o.deathSaves).toEqual({ success: 1, fail: 1 });
  });
  it('3e échec → dead', () => {
    const o = applyDeathSaveOutcome({ success: 0, fail: 2 }, 5);
    expect(o.kind).toBe('dead');
    expect(o.deathSaves).toEqual({ success: 0, fail: 3 });
  });
  it('lance non valide → throw (fail-loud)', () => {
    expect(() => applyDeathSaveOutcome({ success: 0, fail: 0 }, 0)).toThrow();
    expect(() => applyDeathSaveOutcome({ success: 0, fail: 0 }, 21)).toThrow();
    expect(() => applyDeathSaveOutcome({ success: 0, fail: 0 }, 3.5)).toThrow();
  });
});

describe('isSheetReadOnly', () => {
  it('alive = false', () => {
    expect(isSheetReadOnly({ status: 'alive' })).toBe(false);
  });
  it('dead = true', () => {
    expect(isSheetReadOnly({ status: 'dead' })).toBe(true);
  });
});
