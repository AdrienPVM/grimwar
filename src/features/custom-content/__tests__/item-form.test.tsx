import { describe, expect, it } from 'vitest';

import {
  EMPTY_ITEM_DRAFT,
  buildItemFromDraft,
  draftFromItem,
  validateItemDraft,
} from '../forms/item-form';

/**
 * Tests pure-fonction du formulaire item (JALON 3C.7). Le rendu React est
 * couvert au niveau intégration dans `pack-editor-screen.test.tsx`. Ici on
 * verrouille les transformations draft ↔ Item + les règles de validation
 * (8 catégories, champs conditionnels weapon/armor, propriétés libres).
 */

function gearDraft() {
  return {
    ...EMPTY_ITEM_DRAFT,
    id: 'corde-de-chanvre',
    nameFr: 'Corde de chanvre',
    category: 'gear' as const,
    weight: 5,
  };
}

function weaponDraft() {
  return {
    ...EMPTY_ITEM_DRAFT,
    id: 'epee-rituelle',
    nameFr: 'Épée rituelle',
    category: 'weapon' as const,
    weight: 1,
    hasDamage: true,
    damage: {
      dice: '1d8',
      type: 'slashing' as const,
      typeLabelFr: 'tranchant',
      typeLabelEn: 'slashing',
    },
  };
}

function armorDraft() {
  return {
    ...EMPTY_ITEM_DRAFT,
    id: 'plastron-runique',
    nameFr: 'Plastron runique',
    category: 'armor' as const,
    weight: 9,
    acBase: 14,
    hasAcDexMax: true,
    acDexMax: 2,
  };
}

describe('buildItemFromDraft', () => {
  it('produit un Item gear minimal — cost=null, description=null, source=aidedd-homebrew', () => {
    const item = buildItemFromDraft(gearDraft());
    expect(item).toEqual({
      id: 'corde-de-chanvre',
      name: { fr: 'Corde de chanvre' },
      category: 'gear',
      cost: null,
      weight: 5,
      description: null,
      source: 'aidedd-homebrew',
    });
  });

  it('propage le coût quand hasCost=true', () => {
    const item = buildItemFromDraft({
      ...gearDraft(),
      hasCost: true,
      costQty: 2,
      costUnit: 'gp',
    });
    expect(item.cost).toEqual({ qty: 2, unit: 'gp' });
  });

  it('propage la description i18n quand hasDescription=true', () => {
    const item = buildItemFromDraft({
      ...gearDraft(),
      hasDescription: true,
      descriptionFr: 'Une corde solide.',
      descriptionEn: 'A sturdy rope.',
    });
    expect(item.description).toEqual({
      fr: 'Une corde solide.',
      en: 'A sturdy rope.',
    });
  });

  it("description=null quand hasDescription=true mais texte FR vide (validation bloque en amont)", () => {
    const item = buildItemFromDraft({
      ...gearDraft(),
      hasDescription: true,
      descriptionFr: '   ',
    });
    expect(item.description).toBeNull();
  });

  it('inclut damage + typeLabel i18n quand category=weapon + hasDamage', () => {
    const item = buildItemFromDraft(weaponDraft());
    expect(item.damage).toEqual({
      dice: '1d8',
      type: 'slashing',
      typeLabel: { fr: 'tranchant', en: 'slashing' },
    });
  });

  it('omet damage si category != weapon même si hasDamage=true', () => {
    const item = buildItemFromDraft({
      ...gearDraft(),
      hasDamage: true,
      damage: {
        dice: '1d6',
        type: 'fire' as const,
        typeLabelFr: 'feu',
        typeLabelEn: '',
      },
    });
    expect(item).not.toHaveProperty('damage');
  });

  it('inclut range quand category=weapon + hasRange', () => {
    const item = buildItemFromDraft({
      ...weaponDraft(),
      hasRange: true,
      rangeNormal: 30,
      rangeMax: 120,
    });
    expect(item.range).toEqual({ normal: 30, max: 120 });
  });

  it('inclut masteryProperty quand category=weapon + hasMastery + valeur choisie', () => {
    const item = buildItemFromDraft({
      ...weaponDraft(),
      hasMastery: true,
      masteryProperty: 'cleave',
    });
    expect(item.masteryProperty).toBe('cleave');
  });

  it("omet masteryProperty si hasMastery=true mais aucune valeur choisie", () => {
    const item = buildItemFromDraft({
      ...weaponDraft(),
      hasMastery: true,
      masteryProperty: '',
    });
    expect(item).not.toHaveProperty('masteryProperty');
  });

  it('expose acBase + acDexMax + stealthDisadvantage pour category=armor', () => {
    const item = buildItemFromDraft({
      ...armorDraft(),
      stealthDisadvantage: true,
    });
    expect(item.acBase).toBe(14);
    expect(item.acDexMax).toBe(2);
    expect(item.stealthDisadvantage).toBe(true);
  });

  it('omet acDexMax quand hasAcDexMax=false (Dex pleine ajoutée — armures légères)', () => {
    const item = buildItemFromDraft({
      ...armorDraft(),
      hasAcDexMax: false,
    });
    expect(item).not.toHaveProperty('acDexMax');
  });

  it('inclut strRequired quand hasStrRequired=true (typique armures lourdes)', () => {
    const item = buildItemFromDraft({
      ...armorDraft(),
      hasStrRequired: true,
      strRequired: 13,
    });
    expect(item.strRequired).toBe(13);
  });

  it('expose acBase pour shield comme pour armor', () => {
    const item = buildItemFromDraft({
      ...armorDraft(),
      id: 'bouclier-eclat',
      nameFr: 'Bouclier d’éclat',
      category: 'shield',
      acBase: 2,
      hasAcDexMax: false,
    });
    expect(item.acBase).toBe(2);
  });

  it('propage les propriétés libres en trim + filtre les vides', () => {
    const item = buildItemFromDraft({
      ...gearDraft(),
      properties: ['  léger ', 'finesse', '   ', ''],
    });
    expect(item.properties).toEqual(['léger', 'finesse']);
  });

  it('omet `properties` quand le tableau est vide', () => {
    const item = buildItemFromDraft(gearDraft());
    expect(item).not.toHaveProperty('properties');
  });

  it('trim id + name + description', () => {
    const item = buildItemFromDraft({
      ...gearDraft(),
      id: '  corde-de-chanvre  ',
      nameFr: '  Corde de chanvre  ',
      hasDescription: true,
      descriptionFr: '  Une corde solide.  ',
    });
    expect(item.id).toBe('corde-de-chanvre');
    expect(item.name.fr).toBe('Corde de chanvre');
    expect(item.description?.fr).toBe('Une corde solide.');
  });
});

describe('draftFromItem', () => {
  it('roundtrip gear minimal — draft → Item → draft équivalent', () => {
    const initial = gearDraft();
    const item = buildItemFromDraft(initial);
    const back = draftFromItem(item);
    expect(back).toEqual(initial);
  });

  it('roundtrip weapon avec damage + range + mastery', () => {
    const initial = {
      ...weaponDraft(),
      hasRange: true,
      rangeNormal: 30,
      rangeMax: 120,
      hasMastery: true,
      masteryProperty: 'vex' as const,
      properties: ['légère', 'finesse'],
    };
    const item = buildItemFromDraft(initial);
    const back = draftFromItem(item);
    expect(back).toEqual(initial);
  });

  it('roundtrip armor avec acBase + acDexMax + strRequired + stealthDisadvantage', () => {
    const initial = {
      ...armorDraft(),
      hasStrRequired: true,
      strRequired: 15,
      stealthDisadvantage: true,
    };
    const item = buildItemFromDraft(initial);
    const back = draftFromItem(item);
    expect(back).toEqual(initial);
  });
});

describe('validateItemDraft', () => {
  it('accepte un gear minimal valide', () => {
    const result = validateItemDraft(gearDraft());
    expect(result.ok).toBe(true);
  });

  it('rejette si id manque', () => {
    const result = validateItemDraft({ ...gearDraft(), id: '' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors.id).toBeDefined();
  });

  it("rejette si id n'est pas en kebab-case", () => {
    const result = validateItemDraft({ ...gearDraft(), id: 'Corde_Chanvre' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors.id).toBeDefined();
  });

  it('rejette si nameFr manque', () => {
    const result = validateItemDraft({ ...gearDraft(), nameFr: '' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors.nameFr).toBeDefined();
  });

  it('rejette si category est vide (sélection requise)', () => {
    const result = validateItemDraft({ ...gearDraft(), category: '' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors.category).toBeDefined();
  });

  it('rejette si weight < 0', () => {
    const result = validateItemDraft({ ...gearDraft(), weight: -1 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors.weight).toBeDefined();
  });

  it('accepte weight=0 (objets sans poids significatif)', () => {
    const result = validateItemDraft({ ...gearDraft(), weight: 0 });
    expect(result.ok).toBe(true);
  });

  it('rejette si hasCost + costQty < 0', () => {
    const result = validateItemDraft({
      ...gearDraft(),
      hasCost: true,
      costQty: -5,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors.costQty).toBeDefined();
  });

  it('rejette si hasDescription=true mais descriptionFr est vide', () => {
    const result = validateItemDraft({
      ...gearDraft(),
      hasDescription: true,
      descriptionFr: '',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors.descriptionFr).toBeDefined();
  });

  it('rejette weapon + hasDamage sans dice', () => {
    const result = validateItemDraft({
      ...weaponDraft(),
      damage: { ...weaponDraft().damage, dice: '' },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors.damage).toBeDefined();
  });

  it('rejette weapon + hasDamage sans typeLabel FR', () => {
    const result = validateItemDraft({
      ...weaponDraft(),
      damage: { ...weaponDraft().damage, typeLabelFr: '' },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors.damage).toBeDefined();
  });

  it('rejette weapon + hasRange avec rangeMax < rangeNormal', () => {
    const result = validateItemDraft({
      ...weaponDraft(),
      hasRange: true,
      rangeNormal: 80,
      rangeMax: 60,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors.rangeMax).toBeDefined();
  });

  it('rejette armor sans acBase (acBase <= 0)', () => {
    const result = validateItemDraft({
      ...armorDraft(),
      acBase: 0,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors.acBase).toBeDefined();
  });

  it('rejette armor + hasStrRequired avec strRequired <= 0', () => {
    const result = validateItemDraft({
      ...armorDraft(),
      hasStrRequired: true,
      strRequired: 0,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors.strRequired).toBeDefined();
  });

  it('accepte shield avec acBase=2 (typique pour bouclier SRD)', () => {
    const result = validateItemDraft({
      ...armorDraft(),
      id: 'bouclier',
      nameFr: 'Bouclier',
      category: 'shield',
      acBase: 2,
      hasAcDexMax: false,
    });
    expect(result.ok).toBe(true);
  });

  it('accepte un weapon sans damage/range/mastery (arme cérémonielle)', () => {
    const result = validateItemDraft({
      ...weaponDraft(),
      hasDamage: false,
      hasRange: false,
      hasMastery: false,
    });
    expect(result.ok).toBe(true);
  });

  it("accepte les 8 catégories SRD", () => {
    const categories = [
      'weapon',
      'armor',
      'shield',
      'gear',
      'tool',
      'pack',
      'mount',
      'vehicle',
    ] as const;
    for (const c of categories) {
      const draft = { ...gearDraft(), category: c };
      // armor/shield exigent acBase > 0
      if (c === 'armor' || c === 'shield') {
        draft.acBase = 12;
      }
      const result = validateItemDraft(draft);
      expect(result.ok).toBe(true);
    }
  });
});
