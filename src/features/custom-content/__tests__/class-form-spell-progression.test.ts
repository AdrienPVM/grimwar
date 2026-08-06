import { describe, expect, it } from 'vitest';

import {
  EMPTY_CLASS_DRAFT,
  buildClassFromDraft,
  draftFromClass,
  parseProgressionColumn,
  validateClassDraft,
  type ClassFormDraft,
} from '../forms/class-form';

/**
 * M51 — « ma classe maison monte au niveau 5 et prépare ses sorts comme un
 * clerc ». Le formulaire ne produisait jamais `spellProgression`, donc
 * `preparationCap` rendait 0 à tous les niveaux : la classe lançait des sorts
 * sur le papier et n'en préparait aucun.
 */

const FULL_CASTER_COLUMN = '2 3 4 5 6 6 7 7 9 9 10 10 11 11 12 12 14 14 15 15';
const CANTRIP_COLUMN = '3 3 3 4 4 4 4 4 4 5 5 5 5 5 5 5 5 5 5 5';

function casterDraft(overrides: Partial<ClassFormDraft> = {}): ClassFormDraft {
  return {
    ...EMPTY_CLASS_DRAFT,
    id: 'thaumaturge',
    nameFr: 'Thaumaturge',
    descriptionFr: 'La classe de ma table.',
    primaryAbility: ['sag'],
    saveProficiencies: ['sag'],
    spellcastingEnabled: true,
    spellcastingAbility: 'sag',
    spellcastingProgression: 'full',
    spellcastingPreparation: 'prepared',
    spellsKnownOrPrepared: FULL_CASTER_COLUMN,
    ...overrides,
  };
}

describe('parseProgressionColumn', () => {
  it('accepte 20 valeurs séparées par des espaces', () => {
    expect(parseProgressionColumn(FULL_CASTER_COLUMN)).toHaveLength(20);
    expect(parseProgressionColumn(FULL_CASTER_COLUMN)?.[4]).toBe(6);
  });

  it('accepte les virgules — un MJ colle ce qu’il a', () => {
    const commas = FULL_CASTER_COLUMN.split(' ').join(', ');
    expect(parseProgressionColumn(commas)).toEqual(
      parseProgressionColumn(FULL_CASTER_COLUMN),
    );
  });

  it('refuse une colonne incomplète', () => {
    expect(parseProgressionColumn('2 3 4')).toBeNull();
  });

  it('refuse une valeur non entière ou négative', () => {
    expect(parseProgressionColumn(FULL_CASTER_COLUMN.replace('2', 'deux'))).toBeNull();
    expect(parseProgressionColumn('-1 ' + FULL_CASTER_COLUMN.split(' ').slice(1).join(' '))).toBeNull();
  });
});

describe('buildClassFromDraft — table de progression', () => {
  it('produit `spellProgression` avec la colonne saisie', () => {
    const cls = buildClassFromDraft(casterDraft());
    expect(cls.spellProgression?.spellsKnownOrPrepared).toHaveLength(20);
    // Niveau 5 → 5e valeur de la colonne.
    expect(cls.spellProgression?.spellsKnownOrPrepared[4]).toBe(6);
    expect(cls.spellProgression?.cantripsKnown).toBeUndefined();
  });

  it('joint la colonne de sorts mineurs quand elle est saisie', () => {
    const cls = buildClassFromDraft(
      casterDraft({ cantripsKnown: CANTRIP_COLUMN }),
    );
    expect(cls.spellProgression?.cantripsKnown?.[0]).toBe(3);
  });

  it('omet `spellProgression` quand aucune colonne n’est saisie', () => {
    const cls = buildClassFromDraft(casterDraft({ spellsKnownOrPrepared: '' }));
    expect(cls.spellProgression).toBeUndefined();
  });

  it('n’écrit aucune progression pour une classe sans magie', () => {
    const cls = buildClassFromDraft(
      casterDraft({ spellcastingEnabled: false }),
    );
    expect(cls.spellcasting).toBeNull();
    expect(cls.spellProgression).toBeUndefined();
  });

  it('porte le mode de préparation déclaré', () => {
    expect(buildClassFromDraft(casterDraft()).spellcasting?.preparation).toBe(
      'prepared',
    );
    expect(
      buildClassFromDraft(casterDraft({ spellcastingPreparation: 'known' }))
        .spellcasting?.preparation,
    ).toBe('known');
  });
});

describe('validateClassDraft — colonnes de progression', () => {
  it('refuse une colonne incomplète au champ, pas au save', () => {
    const result = validateClassDraft(
      casterDraft({ spellsKnownOrPrepared: '2 3 4' }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors.spellsKnownOrPrepared).toBeDefined();
  });

  it('refuse une colonne de sorts mineurs seule — elle ne produirait rien', () => {
    const result = validateClassDraft(
      casterDraft({ spellsKnownOrPrepared: '', cantripsKnown: CANTRIP_COLUMN }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors.spellsKnownOrPrepared).toBeDefined();
  });

  it('accepte une classe magique sans aucune table', () => {
    expect(
      validateClassDraft(casterDraft({ spellsKnownOrPrepared: '' })).ok,
    ).toBe(true);
  });
});

describe('draftFromClass — aller-retour', () => {
  it('recharge les colonnes et le mode de préparation à l’identique', () => {
    const cls = buildClassFromDraft(
      casterDraft({ cantripsKnown: CANTRIP_COLUMN }),
    );
    const back = draftFromClass(cls);
    expect(back.spellsKnownOrPrepared).toBe(FULL_CASTER_COLUMN);
    expect(back.cantripsKnown).toBe(CANTRIP_COLUMN);
    expect(back.spellcastingPreparation).toBe('prepared');
    expect(buildClassFromDraft(back).spellProgression).toEqual(
      cls.spellProgression,
    );
  });
});
