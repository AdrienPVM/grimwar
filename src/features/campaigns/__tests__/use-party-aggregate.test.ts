import { describe, expect, it } from 'vitest';

import {
  computePartyAggregate,
  type CharacterSummary,
} from '../use-party-aggregate';

const alive = (totalLevel: number): CharacterSummary => ({ totalLevel, status: 'alive' });
const dead = (totalLevel: number): CharacterSummary => ({ totalLevel, status: 'dead' });

// ─────────────────────────────────────────────────────────────────────
// Agrégat compagnie — fonction pure. Valeurs chiffrées assertées contre la
// règle (CLAUDE « calculs de règles : résultat chiffré, pas > 0 »).
// ─────────────────────────────────────────────────────────────────────

describe('computePartyAggregate', () => {
  it('compagnie vide, aucune fiche attendue → agrégat vide, pas en chargement', () => {
    const agg = computePartyAggregate([], 0, 0);
    expect(agg).toEqual({
      count: 0,
      averageLevel: null,
      minLevel: null,
      maxLevel: null,
      downedCount: 0,
      isLoading: false,
    });
  });

  it('fiches attendues mais aucune encore résolue → isLoading vrai, count 0', () => {
    const agg = computePartyAggregate([], 0, 3);
    expect(agg.count).toBe(0);
    expect(agg.isLoading).toBe(true);
  });

  it('une seule fiche niv. 5 → moyenne / min / max = 5', () => {
    const agg = computePartyAggregate([alive(5)], 1, 1);
    expect(agg.count).toBe(1);
    expect(agg.averageLevel).toBe(5);
    expect(agg.minLevel).toBe(5);
    expect(agg.maxLevel).toBe(5);
    expect(agg.downedCount).toBe(0);
    expect(agg.isLoading).toBe(false);
  });

  it('niveaux [3, 5, 7] → moyenne 5, min 3, max 7, effectif 3', () => {
    const agg = computePartyAggregate([alive(3), alive(5), alive(7)], 3, 3);
    expect(agg.count).toBe(3);
    expect(agg.averageLevel).toBe(5);
    expect(agg.minLevel).toBe(3);
    expect(agg.maxLevel).toBe(7);
  });

  it('moyenne arrondie à l’entier — [1, 2] → 2 (Math.round de 1,5)', () => {
    expect(computePartyAggregate([alive(1), alive(2)], 2, 2).averageLevel).toBe(2);
  });

  it('moyenne arrondie à l’entier — [1, 1, 2] → 1 (1,33 arrondi bas)', () => {
    expect(
      computePartyAggregate([alive(1), alive(1), alive(2)], 3, 3).averageLevel,
    ).toBe(1);
  });

  it('compte les personnages à terre (status dead) sans les exclure du niveau', () => {
    const agg = computePartyAggregate([dead(5), dead(3), alive(7)], 3, 3);
    expect(agg.count).toBe(3);
    expect(agg.downedCount).toBe(2);
    expect(agg.minLevel).toBe(3);
    expect(agg.maxLevel).toBe(7);
    expect(agg.averageLevel).toBe(5);
  });

  it('chargement partiel — 1 fiche résolue sur 3 attendues → isLoading vrai', () => {
    const agg = computePartyAggregate([alive(4)], 1, 3);
    expect(agg.count).toBe(1);
    expect(agg.isLoading).toBe(true);
  });

  it('toutes les fiches résolues (loaded == refs) → isLoading faux', () => {
    const agg = computePartyAggregate([alive(4), alive(6)], 2, 2);
    expect(agg.isLoading).toBe(false);
  });
});
