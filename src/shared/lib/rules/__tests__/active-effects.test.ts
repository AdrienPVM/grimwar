import { describe, expect, it } from 'vitest';

import type { MagicItem, MagicItemEffect } from '@/shared/types/content';
import type { InventoryItem } from '@/shared/lib/inventory';

import {
  aggregateEffects,
  computeDisplayedAbility,
  computeDisplayedSpeed,
  computeDisplayedSaveBonus,
  effectsContributingAcBonus,
} from '../active-effects';

const baseMagic = (id: string, effects?: MagicItemEffect[]): MagicItem => ({
  id,
  name: { fr: id, en: id },
  category: 'gear',
  rarity: 'rare',
  attunement: true,
  magicDescription: { fr: 'desc', en: 'desc' },
  description: null,
  source: 'srd-5.2.1',
  effects,
});

const inv = (
  contentId: string,
  opts: { equipped: boolean; attuned: boolean },
): InventoryItem => ({
  contentScope: 'public',
  contentId,
  qty: 1,
  equipped: opts.equipped,
  attuned: opts.attuned,
  notes: '',
});

describe('aggregateEffects — agrégateur', () => {
  it('ignore les items non équipés', () => {
    const items = [
      {
        inventory: inv('a', { equipped: false, attuned: true }),
        magic: baseMagic('a', [{ kind: 'ac-bonus', bonus: 1 }]),
      },
    ];
    expect(aggregateEffects(items)).toEqual([]);
  });

  it('ignore les items équipés mais non attunés quand attunement requis', () => {
    const items = [
      {
        inventory: inv('a', { equipped: true, attuned: false }),
        magic: { ...baseMagic('a', [{ kind: 'ac-bonus', bonus: 1 }]), attunement: true as const },
      },
    ];
    expect(aggregateEffects(items)).toEqual([]);
  });

  it('applique les effets équipés + attunés', () => {
    const items = [
      {
        inventory: inv('a', { equipped: true, attuned: true }),
        magic: baseMagic('a', [{ kind: 'ac-bonus', bonus: 1 }]),
      },
    ];
    expect(aggregateEffects(items)).toEqual([{ kind: 'ac-bonus', bonus: 1 }]);
  });

  it('applique les effets sans attunement requis quand l\'item est équipé seul', () => {
    const items = [
      {
        inventory: inv('a', { equipped: true, attuned: false }),
        magic: {
          ...baseMagic('a', [{ kind: 'ac-bonus', bonus: 1 }]),
          attunement: false as const,
        },
      },
    ];
    expect(aggregateEffects(items)).toEqual([{ kind: 'ac-bonus', bonus: 1 }]);
  });

  it('agrège les effets de plusieurs items', () => {
    const items = [
      {
        inventory: inv('a', { equipped: true, attuned: true }),
        magic: baseMagic('a', [{ kind: 'ac-bonus', bonus: 1 }]),
      },
      {
        inventory: inv('b', { equipped: true, attuned: true }),
        magic: baseMagic('b', [{ kind: 'save-bonus-all', bonus: 1 }]),
      },
    ];
    expect(aggregateEffects(items)).toEqual([
      { kind: 'ac-bonus', bonus: 1 },
      { kind: 'save-bonus-all', bonus: 1 },
    ]);
  });

  it('ignore les items sans effects[] (legacy bundle)', () => {
    const items = [
      {
        inventory: inv('a', { equipped: true, attuned: true }),
        magic: baseMagic('a'),
      },
    ];
    expect(aggregateEffects(items)).toEqual([]);
  });
});

describe('computeDisplayedAbility — ability-set-floor', () => {
  it('porte une valeur basse au minimum demandé', () => {
    expect(
      computeDisplayedAbility('con', 14, [
        { kind: 'ability-set-floor', ability: 'con', minimum: 19 },
      ]),
    ).toBe(19);
  });

  it('ne baisse jamais une valeur déjà supérieure au floor', () => {
    expect(
      computeDisplayedAbility('con', 20, [
        { kind: 'ability-set-floor', ability: 'con', minimum: 19 },
      ]),
    ).toBe(20);
  });

  it('ignore les effets d\'une autre ability', () => {
    expect(
      computeDisplayedAbility('con', 14, [
        { kind: 'ability-set-floor', ability: 'for', minimum: 21 },
      ]),
    ).toBe(14);
  });

  it('prend le maximum si plusieurs floors sur la même ability', () => {
    expect(
      computeDisplayedAbility('for', 10, [
        { kind: 'ability-set-floor', ability: 'for', minimum: 21 },
        { kind: 'ability-set-floor', ability: 'for', minimum: 23 },
      ]),
    ).toBe(23);
  });

  it('renvoie la valeur de base quand aucun effet ne s\'applique', () => {
    expect(computeDisplayedAbility('dex', 12, [])).toBe(12);
  });
});

describe('computeDisplayedSpeed — speed-bonus additif', () => {
  it('additionne les bonus de vitesse', () => {
    expect(
      computeDisplayedSpeed(30, [
        { kind: 'speed-bonus', bonus: 10 },
        { kind: 'speed-bonus', bonus: 5 },
      ]),
    ).toBe(45);
  });

  it('renvoie la valeur de base quand aucun effet', () => {
    expect(computeDisplayedSpeed(30, [])).toBe(30);
  });

  it('plancher à 0 sur bonus négatif (cas pathologique mais légitime)', () => {
    expect(
      computeDisplayedSpeed(30, [{ kind: 'speed-bonus', bonus: -40 }]),
    ).toBe(0);
  });
});

describe('computeDisplayedSaveBonus — save-bonus-all additif', () => {
  it('additionne les bonus sur toutes les sauves', () => {
    expect(
      computeDisplayedSaveBonus([
        { kind: 'save-bonus-all', bonus: 1 },
        { kind: 'save-bonus-all', bonus: 1 },
      ]),
    ).toBe(2);
  });

  it('renvoie 0 quand aucun effet', () => {
    expect(computeDisplayedSaveBonus([])).toBe(0);
  });
});

describe('effectsContributingAcBonus — filtre dédié AC', () => {
  it('ne renvoie que les ac-bonus', () => {
    expect(
      effectsContributingAcBonus([
        { kind: 'ac-bonus', bonus: 1 },
        { kind: 'save-bonus-all', bonus: 1 },
        { kind: 'ac-bonus', bonus: 2 },
      ]),
    ).toBe(3);
  });

  it('renvoie 0 quand aucun ac-bonus', () => {
    expect(
      effectsContributingAcBonus([{ kind: 'save-bonus-all', bonus: 1 }]),
    ).toBe(0);
  });
});
