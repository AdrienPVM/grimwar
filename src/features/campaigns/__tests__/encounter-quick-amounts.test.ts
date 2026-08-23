import { describe, expect, it } from 'vitest';

import {
  CUSTOM_CONDITION_LABEL_MAX,
  customConditionLabel,
  isCustomCondition,
  toCustomConditionId,
} from '../custom-condition';
import { quickHpAmounts } from '../encounter-hp';

/**
 * M37 — les paliers de dégâts/soin rapides suivent la créature.
 *
 * Le mur d'origine : `[1, 5, 10]` pour tout le monde. Un dragon à 250 PV
 * obligeait le MJ à cliquer vingt-cinq fois « −10 ».
 */
describe('quickHpAmounts', () => {
  it('propose toujours trois montants distincts et croissants', () => {
    for (const maxHp of [1, 4, 7, 11, 27, 58, 132, 250, 546]) {
      const amounts = quickHpAmounts(maxHp);
      expect(amounts).toHaveLength(3);
      expect([...new Set(amounts)]).toHaveLength(3);
      expect([...amounts].sort((a, b) => a - b)).toEqual(amounts);
      expect(amounts.every((a) => a >= 1 && Number.isInteger(a))).toBe(true);
    }
  });

  it('un dragon à 250 PV se joue par gros paliers', () => {
    expect(quickHpAmounts(250)).toEqual([15, 40, 80]);
  });

  it('un gobelin à 7 PV garde des paliers fins', () => {
    expect(quickHpAmounts(7)).toEqual([1, 2, 5]);
  });

  it('un adversaire moyen (30 PV) tombe sur des montants ronds', () => {
    expect(quickHpAmounts(30)).toEqual([2, 5, 10]);
  });

  it('sans PV max exploitable, on retombe sur l’échelle par défaut', () => {
    expect(quickHpAmounts(0)).toEqual([1, 5, 10]);
    expect(quickHpAmounts(-4)).toEqual([1, 5, 10]);
    expect(quickHpAmounts(Number.NaN)).toEqual([1, 5, 10]);
  });
});

/**
 * M8 — états maison. Le stockage acceptait déjà n'importe quelle chaîne ; il
 * manquait la convention qui empêche une collision avec un id SRD, et la
 * garantie que le libellé revient intact à l'écran.
 */
describe('états maison', () => {
  it('préserve accents, casse et espaces du libellé tapé', () => {
    const id = toCustomConditionId('Marqué par le Chasseur');
    expect(id).toBe('custom:Marqué par le Chasseur');
    expect(customConditionLabel(id!)).toBe('Marqué par le Chasseur');
  });

  it('ne peut jamais entrer en collision avec un état SRD', () => {
    expect(toCustomConditionId('poisoned')).toBe('custom:poisoned');
    expect(isCustomCondition('poisoned')).toBe(false);
    expect(customConditionLabel('poisoned')).toBeNull();
  });

  it('rogne les espaces et refuse une saisie vide', () => {
    expect(toCustomConditionId('  Corrompu  ')).toBe('custom:Corrompu');
    expect(toCustomConditionId('')).toBeNull();
    expect(toCustomConditionId('   ')).toBeNull();
  });

  it('tronque pour rester sous la limite du schéma (64 caractères)', () => {
    const id = toCustomConditionId('x'.repeat(200));
    expect(id).not.toBeNull();
    expect(id!.length).toBeLessThanOrEqual(64);
    expect(customConditionLabel(id!)).toHaveLength(CUSTOM_CONDITION_LABEL_MAX);
  });
});
