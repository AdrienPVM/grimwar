import { describe, expect, it } from 'vitest';

import {
  EMPTY_INVOCATION_DRAFT,
  buildInvocationFromDraft,
  draftFromInvocation,
  validateInvocationDraft,
} from '../forms/invocation-form';

/**
 * Tests pure-fonction du formulaire invocation (JALON 3C.2) — pas de rendu
 * React, la couche UI est couverte par `pack-editor-screen.test.tsx`. On
 * vérifie les transformations draft ↔ Invocation + les règles de validation.
 *
 * Différences clés vs FeatForm :
 *   - `summary` est requis (i18n FR obligatoire, pas nullable).
 *   - `prerequisiteWarlockLevel` est number | null, contrôlé par le toggle
 *     `hasLevelPrereq` côté draft.
 *   - `prerequisiteOther` est i18n nullable (même pattern que feat.summary).
 */

describe('buildInvocationFromDraft', () => {
  it('produit une Invocation minimale (sans prerequisites) + source aidedd-homebrew', () => {
    const inv = buildInvocationFromDraft({
      ...EMPTY_INVOCATION_DRAFT,
      id: 'invocation-tracer',
      nameFr: 'Invocation tracer',
      summaryFr: 'Effet de test',
    });
    expect(inv).toEqual({
      id: 'invocation-tracer',
      name: { fr: 'Invocation tracer' },
      summary: { fr: 'Effet de test' },
      prerequisiteWarlockLevel: null,
      prerequisiteOther: null,
      source: 'aidedd-homebrew',
    });
  });

  it('warlock level posé quand hasLevelPrereq=true', () => {
    const inv = buildInvocationFromDraft({
      ...EMPTY_INVOCATION_DRAFT,
      id: 'a',
      nameFr: 'A',
      summaryFr: 'S',
      hasLevelPrereq: true,
      prerequisiteWarlockLevel: 5,
    });
    expect(inv.prerequisiteWarlockLevel).toBe(5);
  });

  it('warlock level null quand hasLevelPrereq=false même si valeur draft non nulle', () => {
    const inv = buildInvocationFromDraft({
      ...EMPTY_INVOCATION_DRAFT,
      id: 'a',
      nameFr: 'A',
      summaryFr: 'S',
      hasLevelPrereq: false,
      prerequisiteWarlockLevel: 7,
    });
    expect(inv.prerequisiteWarlockLevel).toBeNull();
  });

  it('prerequisiteOther i18n quand fr présent, null sinon', () => {
    const without = buildInvocationFromDraft({
      ...EMPTY_INVOCATION_DRAFT,
      id: 'a',
      nameFr: 'A',
      summaryFr: 'S',
    });
    expect(without.prerequisiteOther).toBeNull();

    const withIt = buildInvocationFromDraft({
      ...EMPTY_INVOCATION_DRAFT,
      id: 'a',
      nameFr: 'A',
      summaryFr: 'S',
      prerequisiteOtherFr: 'Pacte de la Lame',
      prerequisiteOtherEn: 'Pact of the Blade',
    });
    expect(withIt.prerequisiteOther).toEqual({
      fr: 'Pacte de la Lame',
      en: 'Pact of the Blade',
    });
  });

  it('trim les whitespaces', () => {
    const inv = buildInvocationFromDraft({
      ...EMPTY_INVOCATION_DRAFT,
      id: '  invocation  ',
      nameFr: '  Inv  ',
      summaryFr: '  Effet  ',
    });
    expect(inv.id).toBe('invocation');
    expect(inv.name.fr).toBe('Inv');
    expect(inv.summary.fr).toBe('Effet');
  });
});

describe('draftFromInvocation', () => {
  it('reconstruit un draft depuis une Invocation sans prereq', () => {
    const draft = draftFromInvocation({
      id: 'inv-a',
      name: { fr: 'Inv', en: 'Inv EN' },
      summary: { fr: 'Effet' },
      prerequisiteWarlockLevel: null,
      prerequisiteOther: null,
      source: 'aidedd-homebrew',
    });
    expect(draft).toEqual({
      id: 'inv-a',
      nameFr: 'Inv',
      nameEn: 'Inv EN',
      summaryFr: 'Effet',
      summaryEn: '',
      hasLevelPrereq: false,
      prerequisiteWarlockLevel: 2,
      prerequisiteOtherFr: '',
      prerequisiteOtherEn: '',
    });
  });

  it('reconstruit un draft depuis une Invocation avec niveau warlock', () => {
    const draft = draftFromInvocation({
      id: 'inv-b',
      name: { fr: 'B' },
      summary: { fr: 'S' },
      prerequisiteWarlockLevel: 5,
      prerequisiteOther: { fr: 'Pacte' },
      source: 'aidedd-homebrew',
    });
    expect(draft.hasLevelPrereq).toBe(true);
    expect(draft.prerequisiteWarlockLevel).toBe(5);
    expect(draft.prerequisiteOtherFr).toBe('Pacte');
  });

  it('roundtrip draft → Invocation → draft équivalent', () => {
    const initial = {
      ...EMPTY_INVOCATION_DRAFT,
      id: 'inv-tracer',
      nameFr: 'Inv',
      summaryFr: 'Effet',
      hasLevelPrereq: true,
      prerequisiteWarlockLevel: 9,
      prerequisiteOtherFr: 'Pacte de la Lame',
    };
    const inv = buildInvocationFromDraft(initial);
    const back = draftFromInvocation(inv);
    expect(back).toEqual(initial);
  });
});

describe('validateInvocationDraft', () => {
  it('accepte un draft minimal valide', () => {
    const result = validateInvocationDraft({
      ...EMPTY_INVOCATION_DRAFT,
      id: 'inv-a',
      nameFr: 'Inv',
      summaryFr: 'Effet',
    });
    expect(result.ok).toBe(true);
  });

  it('rejette un draft sans id', () => {
    const result = validateInvocationDraft({
      ...EMPTY_INVOCATION_DRAFT,
      nameFr: 'Inv',
      summaryFr: 'Effet',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors.id).toBeDefined();
    }
  });

  it('rejette un draft sans nameFr', () => {
    const result = validateInvocationDraft({
      ...EMPTY_INVOCATION_DRAFT,
      id: 'inv-a',
      summaryFr: 'Effet',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors.nameFr).toBeDefined();
    }
  });

  it('rejette un draft sans summaryFr (summary obligatoire — distinct de Feat)', () => {
    const result = validateInvocationDraft({
      ...EMPTY_INVOCATION_DRAFT,
      id: 'inv-a',
      nameFr: 'Inv',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors.summaryFr).toBeDefined();
    }
  });

  it('rejette un id non kebab-case', () => {
    for (const badId of ['Inv A', 'invA', 'inv_a', 'invé']) {
      const result = validateInvocationDraft({
        ...EMPTY_INVOCATION_DRAFT,
        id: badId,
        nameFr: 'Inv',
        summaryFr: 'Effet',
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.fieldErrors.id).toBeDefined();
      }
    }
  });

  it('rejette un niveau warlock hors [1,20] quand hasLevelPrereq=true', () => {
    for (const lvl of [0, 21, -1, 100]) {
      const result = validateInvocationDraft({
        ...EMPTY_INVOCATION_DRAFT,
        id: 'inv-a',
        nameFr: 'Inv',
        summaryFr: 'Effet',
        hasLevelPrereq: true,
        prerequisiteWarlockLevel: lvl,
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.fieldErrors.prerequisiteWarlockLevel).toBeDefined();
      }
    }
  });

  it("ignore le niveau hors-bornes si hasLevelPrereq=false (la valeur n'est pas posée)", () => {
    const result = validateInvocationDraft({
      ...EMPTY_INVOCATION_DRAFT,
      id: 'inv-a',
      nameFr: 'Inv',
      summaryFr: 'Effet',
      hasLevelPrereq: false,
      prerequisiteWarlockLevel: 99,
    });
    expect(result.ok).toBe(true);
  });
});
