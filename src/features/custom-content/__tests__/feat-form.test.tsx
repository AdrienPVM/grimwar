import { describe, expect, it } from 'vitest';

import {
  EMPTY_FEAT_DRAFT,
  buildFeatFromDraft,
  draftFromFeat,
  validateFeatDraft,
} from '../forms/feat-form';

/**
 * Tests pure-fonction du formulaire feat (JALON 3C.1) — pas de rendu React,
 * la couche UI est couverte par `pack-editor-screen.test.tsx`. On vérifie
 * les transformations draft ↔ Feat + les règles de validation.
 */

describe('buildFeatFromDraft', () => {
  it('produit un Feat minimal avec name.fr + source = aidedd-homebrew', () => {
    const feat = buildFeatFromDraft({
      ...EMPTY_FEAT_DRAFT,
      id: 'don-tracer',
      nameFr: 'Don tracer',
    });
    expect(feat).toEqual({
      id: 'don-tracer',
      name: { fr: 'Don tracer' },
      summary: null,
      prerequisite: null,
      source: 'aidedd-homebrew',
    });
  });

  it("inclut name.en quand fourni, sinon l'omet", () => {
    const withoutEn = buildFeatFromDraft({
      ...EMPTY_FEAT_DRAFT,
      id: 'a',
      nameFr: 'Foo',
    });
    expect(withoutEn.name).toEqual({ fr: 'Foo' });

    const withEn = buildFeatFromDraft({
      ...EMPTY_FEAT_DRAFT,
      id: 'a',
      nameFr: 'Foo',
      nameEn: 'Foo EN',
    });
    expect(withEn.name).toEqual({ fr: 'Foo', en: 'Foo EN' });
  });

  it('summary devient null si fr vide (même si en présent — fr obligatoire)', () => {
    const feat = buildFeatFromDraft({
      ...EMPTY_FEAT_DRAFT,
      id: 'a',
      nameFr: 'Foo',
      summaryFr: '',
      summaryEn: 'Only English',
    });
    expect(feat.summary).toBeNull();
  });

  it('summary i18n quand fr présent', () => {
    const feat = buildFeatFromDraft({
      ...EMPTY_FEAT_DRAFT,
      id: 'a',
      nameFr: 'Foo',
      summaryFr: 'Résumé',
      summaryEn: 'Summary',
    });
    expect(feat.summary).toEqual({ fr: 'Résumé', en: 'Summary' });
  });

  it('trim les whitespaces', () => {
    const feat = buildFeatFromDraft({
      ...EMPTY_FEAT_DRAFT,
      id: '  don-tracer  ',
      nameFr: '  Don tracer  ',
      summaryFr: '  Résumé  ',
    });
    expect(feat.id).toBe('don-tracer');
    expect(feat.name.fr).toBe('Don tracer');
    expect(feat.summary?.fr).toBe('Résumé');
  });
});

describe('draftFromFeat', () => {
  it('reconstruit un draft depuis un Feat null-safe', () => {
    const draft = draftFromFeat({
      id: 'don-tracer',
      name: { fr: 'Don', en: 'Feat' },
      summary: null,
      prerequisite: null,
      source: 'aidedd-homebrew',
    });
    expect(draft).toEqual({
      id: 'don-tracer',
      nameFr: 'Don',
      nameEn: 'Feat',
      summaryFr: '',
      summaryEn: '',
      prerequisiteFr: '',
      prerequisiteEn: '',
    });
  });

  it('roundtrip draft → Feat → draft équivalent', () => {
    const initial = {
      ...EMPTY_FEAT_DRAFT,
      id: 'don-tracer',
      nameFr: 'Don',
      summaryFr: 'Résumé',
      prerequisiteFr: 'Niveau 4+',
    };
    const feat = buildFeatFromDraft(initial);
    const back = draftFromFeat(feat);
    expect(back).toEqual(initial);
  });
});

describe('validateFeatDraft', () => {
  it('accepte un draft minimal valide', () => {
    const result = validateFeatDraft({
      ...EMPTY_FEAT_DRAFT,
      id: 'don-tracer',
      nameFr: 'Don',
    });
    expect(result.ok).toBe(true);
  });

  it('rejette un draft sans id', () => {
    const result = validateFeatDraft({
      ...EMPTY_FEAT_DRAFT,
      nameFr: 'Don',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors.id).toBeDefined();
    }
  });

  it('rejette un draft sans nameFr', () => {
    const result = validateFeatDraft({
      ...EMPTY_FEAT_DRAFT,
      id: 'don-tracer',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors.nameFr).toBeDefined();
    }
  });

  it('rejette un id non kebab-case (PascalCase, espaces, accents)', () => {
    for (const badId of ['Don Tracer', 'donTracer', 'don_tracer', 'doné']) {
      const result = validateFeatDraft({
        ...EMPTY_FEAT_DRAFT,
        id: badId,
        nameFr: 'Don',
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.fieldErrors.id).toBeDefined();
      }
    }
  });
});
