import { describe, expect, it } from 'vitest';

import {
  applyDamage,
  applyDeathSaveOutcome,
  applyHeal,
  clampHpCurrent,
  concentrationSaveDc,
  HP_BAND_LABEL,
  hpHealthBand,
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

describe('hpHealthBand', () => {
  it('classe 0 PV en "dead" (pastille « Inconscient »)', () => {
    expect(hpHealthBand(0)).toBe('dead');
  });
  it('classe < 25 % en "critique"', () => {
    expect(hpHealthBand(0.24)).toBe('critical');
    expect(hpHealthBand(0.01)).toBe('critical');
  });
  it('classe [25 %, 60 %[ en "blessé"', () => {
    expect(hpHealthBand(0.25)).toBe('wounded');
    expect(hpHealthBand(0.59)).toBe('wounded');
  });
  it('classe >= 60 % en "sain"', () => {
    expect(hpHealthBand(0.6)).toBe('healthy');
    expect(hpHealthBand(1)).toBe('healthy');
  });
});

describe('HP_BAND_LABEL', () => {
  it('mappe chaque bande sur son libellé FR officiel/descriptif', () => {
    expect(HP_BAND_LABEL.healthy).toBe('Sain');
    expect(HP_BAND_LABEL.wounded).toBe('Blessé');
    expect(HP_BAND_LABEL.critical).toBe('Critique');
    // 0 PV = condition SRD FR « Inconscient » — surtout pas « À terre » (= Prone).
    expect(HP_BAND_LABEL.dead).toBe('Inconscient');
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

describe('concentrationSaveDc', () => {
  // SRD 5.2.1 : DD = max(10, floor(dégâts / 2)), plafonné à 30.
  it('petits dégâts → plancher DD 10', () => {
    expect(concentrationSaveDc(1)).toBe(10);
    expect(concentrationSaveDc(19)).toBe(10); // floor(19/2)=9 < 10
    expect(concentrationSaveDc(20)).toBe(10); // floor(20/2)=10
  });

  it('dégâts moyens → moitié arrondie à l’inférieur', () => {
    expect(concentrationSaveDc(21)).toBe(10); // floor(21/2)=10
    expect(concentrationSaveDc(22)).toBe(11); // floor(22/2)=11
    expect(concentrationSaveDc(45)).toBe(22); // floor(45/2)=22
  });

  it('gros dégâts → plafonné à DD 30', () => {
    expect(concentrationSaveDc(60)).toBe(30);
    expect(concentrationSaveDc(200)).toBe(30);
  });

  it('dégâts négatifs ou nuls → plancher DD 10', () => {
    expect(concentrationSaveDc(0)).toBe(10);
    expect(concentrationSaveDc(-5)).toBe(10);
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
