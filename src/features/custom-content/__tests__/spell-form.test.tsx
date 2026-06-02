import { describe, expect, it } from 'vitest';

import {
  EMPTY_SPELL_DAMAGE_DRAFT,
  EMPTY_SPELL_DRAFT,
  buildSpellFromDraft,
  draftFromSpell,
  validateSpellDraft,
} from '../forms/spell-form';

/**
 * Tests pure-fonction du formulaire spell (JALON 3C.6). Le rendu React dépend
 * de `useContent('classes')` et est couvert par les tests UI dans
 * `pack-editor-screen.test.tsx`. Ici on verrouille les transformations draft
 * ↔ Spell + les règles de validation (14 champs requis + components struct +
 * damage repeater + nullable atHigherLevels).
 */

function validBaseDraft() {
  return {
    ...EMPTY_SPELL_DRAFT,
    id: 'boule-de-feu',
    nameFr: 'Boule de feu',
    level: 3,
    school: 'evocation' as const,
    castingTimeFr: '1 action',
    rangeFr: '45 mètres',
    durationFr: 'Instantanée',
    componentsV: true,
    componentsS: true,
    descriptionFr: 'Une lueur jaillit de votre doigt vers un point.',
  };
}

describe('buildSpellFromDraft', () => {
  it('produit un Spell minimal avec atHigherLevels=null + classes=[] + source=aidedd-homebrew', () => {
    const spell = buildSpellFromDraft(validBaseDraft());
    expect(spell).toEqual({
      id: 'boule-de-feu',
      name: { fr: 'Boule de feu' },
      level: 3,
      school: 'evocation',
      castingTime: { fr: '1 action' },
      range: { fr: '45 mètres' },
      components: { v: true, s: true, m: false },
      duration: { fr: 'Instantanée' },
      concentration: false,
      ritual: false,
      description: { fr: 'Une lueur jaillit de votre doigt vers un point.' },
      atHigherLevels: null,
      classes: [],
      source: 'aidedd-homebrew',
    });
  });

  it('inclut la composante matérielle quand M est coché ET materialFr est rempli', () => {
    const spell = buildSpellFromDraft({
      ...validBaseDraft(),
      componentsM: true,
      materialFr: 'une perle de 100 po',
      materialEn: 'a pearl worth 100 gp',
    });
    expect(spell.components).toEqual({
      v: true,
      s: true,
      m: true,
      material: { fr: 'une perle de 100 po', en: 'a pearl worth 100 gp' },
    });
  });

  it("omet `material` quand M est coché mais materialFr est vide (le validateur bloque en amont)", () => {
    const spell = buildSpellFromDraft({
      ...validBaseDraft(),
      componentsM: true,
      materialFr: '   ',
    });
    expect(spell.components).toEqual({ v: true, s: true, m: true });
    expect(spell.components).not.toHaveProperty('material');
  });

  it('propage atHigherLevels quand hasAtHigherLevels=true ET texte FR non vide', () => {
    const spell = buildSpellFromDraft({
      ...validBaseDraft(),
      hasAtHigherLevels: true,
      atHigherLevelsFr: '+1d6 par emplacement supérieur',
      atHigherLevelsEn: '+1d6 per slot above',
    });
    expect(spell.atHigherLevels).toEqual({
      fr: '+1d6 par emplacement supérieur',
      en: '+1d6 per slot above',
    });
  });

  it('atHigherLevels=null quand le toggle est désactivé même si du texte traîne', () => {
    const spell = buildSpellFromDraft({
      ...validBaseDraft(),
      hasAtHigherLevels: false,
      atHigherLevelsFr: 'reliquat',
    });
    expect(spell.atHigherLevels).toBeNull();
  });

  it('propage classes[] en trim + filtre les entrées vides', () => {
    const spell = buildSpellFromDraft({
      ...validBaseDraft(),
      classes: ['  magicien  ', 'sorcier', '  ', ''],
    });
    expect(spell.classes).toEqual(['magicien', 'sorcier']);
  });

  it('mappe damage[] avec typeLabel i18n + upcast optionnel', () => {
    const spell = buildSpellFromDraft({
      ...validBaseDraft(),
      damage: [
        {
          formula: '8d6',
          type: 'fire',
          typeLabelFr: 'feu',
          typeLabelEn: 'fire',
          hasUpcast: true,
          upcastPerLevel: '+1d6',
        },
        {
          formula: '1d4',
          type: 'force',
          typeLabelFr: 'force',
          typeLabelEn: '',
          hasUpcast: false,
          upcastPerLevel: '',
        },
      ],
    });
    expect(spell.damage).toEqual([
      {
        formula: '8d6',
        type: 'fire',
        typeLabel: { fr: 'feu', en: 'fire' },
        atHigherLevels: { perLevel: '+1d6' },
      },
      {
        formula: '1d4',
        type: 'force',
        typeLabel: { fr: 'force' },
      },
    ]);
  });

  it('omet `damage` du résultat quand le répéteur est vide', () => {
    const spell = buildSpellFromDraft(validBaseDraft());
    expect(spell).not.toHaveProperty('damage');
  });

  it('trim les whitespaces sur tous les champs scalaires', () => {
    const spell = buildSpellFromDraft({
      ...validBaseDraft(),
      id: '  boule-de-feu  ',
      nameFr: '  Boule de feu  ',
      castingTimeFr: '  1 action  ',
    });
    expect(spell.id).toBe('boule-de-feu');
    expect(spell.name.fr).toBe('Boule de feu');
    expect(spell.castingTime.fr).toBe('1 action');
  });
});

describe('draftFromSpell', () => {
  it('roundtrip draft → Spell → draft équivalent (champs EN vides)', () => {
    const initial = validBaseDraft();
    const spell = buildSpellFromDraft(initial);
    const back = draftFromSpell(spell);
    expect(back).toEqual(initial);
  });

  it('reconstruit hasAtHigherLevels=true quand le sort en porte un', () => {
    const draft = draftFromSpell({
      id: 'tracer',
      name: { fr: 'Tracer' },
      level: 1,
      school: 'evocation',
      castingTime: { fr: '1 action' },
      range: { fr: 'Toucher' },
      components: { v: true, s: false, m: false },
      duration: { fr: 'Instantanée' },
      concentration: false,
      ritual: false,
      description: { fr: 'D' },
      atHigherLevels: { fr: '+1d6 par niveau', en: '+1d6 per slot' },
      classes: ['magicien'],
      source: 'aidedd-homebrew',
    });
    expect(draft.hasAtHigherLevels).toBe(true);
    expect(draft.atHigherLevelsFr).toBe('+1d6 par niveau');
    expect(draft.atHigherLevelsEn).toBe('+1d6 per slot');
    expect(draft.classes).toEqual(['magicien']);
  });

  it('reconstruit material i18n quand le sort en porte un', () => {
    const draft = draftFromSpell({
      id: 'spell-m',
      name: { fr: 'Sort M' },
      level: 2,
      school: 'transmutation',
      castingTime: { fr: '1 action' },
      range: { fr: 'Toucher' },
      components: {
        v: true,
        s: false,
        m: true,
        material: { fr: 'une bougie', en: 'a candle' },
      },
      duration: { fr: 'Instantanée' },
      concentration: false,
      ritual: false,
      description: { fr: 'D' },
      atHigherLevels: null,
      classes: [],
      source: 'aidedd-homebrew',
    });
    expect(draft.componentsM).toBe(true);
    expect(draft.materialFr).toBe('une bougie');
    expect(draft.materialEn).toBe('a candle');
  });
});

describe('validateSpellDraft', () => {
  it('accepte un draft minimal valide', () => {
    const result = validateSpellDraft(validBaseDraft());
    expect(result.ok).toBe(true);
  });

  it('rejette si id manque', () => {
    const result = validateSpellDraft({ ...validBaseDraft(), id: '' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors.id).toBeDefined();
  });

  it("rejette si id n'est pas en kebab-case", () => {
    const result = validateSpellDraft({
      ...validBaseDraft(),
      id: 'Boule_De_Feu',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors.id).toBeDefined();
  });

  it('rejette si nameFr manque', () => {
    const result = validateSpellDraft({ ...validBaseDraft(), nameFr: '' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors.nameFr).toBeDefined();
  });

  it('rejette si school est vide (sélection requise)', () => {
    const result = validateSpellDraft({ ...validBaseDraft(), school: '' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors.school).toBeDefined();
  });

  it.each([
    ['castingTimeFr'],
    ['rangeFr'],
    ['durationFr'],
    ['descriptionFr'],
  ] as const)('rejette si %s manque', (field) => {
    const result = validateSpellDraft({ ...validBaseDraft(), [field]: '' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors[field]).toBeDefined();
  });

  it('rejette si M est coché mais materialFr est vide', () => {
    const result = validateSpellDraft({
      ...validBaseDraft(),
      componentsM: true,
      materialFr: '',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors.materialFr).toBeDefined();
  });

  it('accepte M coché + materialFr rempli', () => {
    const result = validateSpellDraft({
      ...validBaseDraft(),
      componentsM: true,
      materialFr: 'une perle',
    });
    expect(result.ok).toBe(true);
  });

  it('rejette si hasAtHigherLevels=true mais atHigherLevelsFr est vide', () => {
    const result = validateSpellDraft({
      ...validBaseDraft(),
      hasAtHigherLevels: true,
      atHigherLevelsFr: '',
    });
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.fieldErrors.atHigherLevelsFr).toBeDefined();
  });

  it("rejette une ligne de dégâts sans formule ou sans typeLabel FR", () => {
    const draftNoFormula = validateSpellDraft({
      ...validBaseDraft(),
      damage: [
        {
          ...EMPTY_SPELL_DAMAGE_DRAFT,
          formula: '',
          typeLabelFr: 'feu',
        },
      ],
    });
    expect(draftNoFormula.ok).toBe(false);
    if (!draftNoFormula.ok)
      expect(draftNoFormula.fieldErrors.damage).toBeDefined();

    const draftNoLabel = validateSpellDraft({
      ...validBaseDraft(),
      damage: [
        {
          ...EMPTY_SPELL_DAMAGE_DRAFT,
          formula: '1d6',
          typeLabelFr: '',
        },
      ],
    });
    expect(draftNoLabel.ok).toBe(false);
    if (!draftNoLabel.ok)
      expect(draftNoLabel.fieldErrors.damage).toBeDefined();
  });

  it("rejette deux lignes de dégâts du même type", () => {
    const result = validateSpellDraft({
      ...validBaseDraft(),
      damage: [
        {
          ...EMPTY_SPELL_DAMAGE_DRAFT,
          formula: '8d6',
          type: 'fire',
          typeLabelFr: 'feu',
        },
        {
          ...EMPTY_SPELL_DAMAGE_DRAFT,
          formula: '2d6',
          type: 'fire',
          typeLabelFr: 'feu',
        },
      ],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors.damage).toBeDefined();
  });

  it("accepte deux lignes de dégâts de types différents (ex. feu + radiant)", () => {
    const result = validateSpellDraft({
      ...validBaseDraft(),
      damage: [
        {
          ...EMPTY_SPELL_DAMAGE_DRAFT,
          formula: '4d6',
          type: 'fire',
          typeLabelFr: 'feu',
        },
        {
          ...EMPTY_SPELL_DAMAGE_DRAFT,
          formula: '4d6',
          type: 'radiant',
          typeLabelFr: 'radiants',
        },
      ],
    });
    expect(result.ok).toBe(true);
  });

  it("accepte un sort sans aucune classe (le schéma autorise classes=[])", () => {
    const result = validateSpellDraft({ ...validBaseDraft(), classes: [] });
    expect(result.ok).toBe(true);
  });

  it("accepte un sort avec classes peuplées", () => {
    const result = validateSpellDraft({
      ...validBaseDraft(),
      classes: ['magicien', 'sorcier'],
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.spell.classes).toEqual(['magicien', 'sorcier']);
  });
});
