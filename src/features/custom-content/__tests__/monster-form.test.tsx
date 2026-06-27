import { describe, expect, it } from 'vitest';

import {
  EMPTY_MONSTER_DRAFT,
  buildMonsterFromDraft,
  draftFromMonster,
  validateMonsterDraft,
} from '../forms/monster-form';

/**
 * Tests pure-fonction du formulaire monstre (directive 2026-06-27). On verrouille
 * draft ↔ Monster : vitesses/sens optionnels (toggle → présent/absent),
 * reactions/legendaryActions `nullable` (null quand vide), listes de chips,
 * traits/actions nom+desc, et les règles de validation.
 */

function goblinDraft() {
  return {
    ...EMPTY_MONSTER_DRAFT,
    id: 'gobelin-eclaireur',
    nameFr: 'Gobelin éclaireur',
    nameEn: 'Goblin Scout',
    size: 'small' as const,
    type: 'humanoïde',
    alignmentFr: 'Neutre mauvais',
    ac: 13,
    hpAvg: 7,
    hpFormula: '2d6',
    abilities: { for: 8, dex: 14, con: 10, int: 10, sag: 8, cha: 8 },
    passivePerception: 9,
    cr: 0.125,
    xp: 25,
  };
}

describe('buildMonsterFromDraft', () => {
  it('produit un Monster minimal — reactions/legendaryActions null, source homebrew', () => {
    const m = buildMonsterFromDraft(goblinDraft());
    expect(m.id).toBe('gobelin-eclaireur');
    expect(m.name).toEqual({ fr: 'Gobelin éclaireur', en: 'Goblin Scout' });
    expect(m.size).toBe('small');
    expect(m.ac).toBe(13);
    expect(m.hp).toEqual({ avg: 7, formula: '2d6' });
    expect(m.speed).toEqual({ walk: 30 });
    expect(m.senses).toEqual({ passivePerception: 9 });
    expect(m.acDetail).toBeNull();
    expect(m.reactions).toBeNull();
    expect(m.legendaryActions).toBeNull();
    expect(m.source).toBe('aidedd-homebrew');
  });

  it('inclut les vitesses + sens optionnels quand les toggles sont actifs', () => {
    const m = buildMonsterFromDraft({
      ...goblinDraft(),
      hasFly: true,
      speedFly: 60,
      hasDarkvision: true,
      darkvision: 60,
    });
    expect(m.speed).toEqual({ walk: 30, fly: 60 });
    expect(m.senses).toEqual({ passivePerception: 9, darkvision: 60 });
  });

  it('filtre les entrées nom+desc incomplètes et garde les complètes', () => {
    const m = buildMonsterFromDraft({
      ...goblinDraft(),
      traits: [
        {
          nameFr: 'Agile',
          nameEn: 'Nimble',
          descriptionFr: 'Se désengage en bonus.',
          descriptionEn: '',
        },
        { nameFr: 'Incomplet', nameEn: '', descriptionFr: '', descriptionEn: '' },
      ],
      actions: [
        {
          nameFr: 'Cimeterre',
          nameEn: '',
          descriptionFr: 'Mêlée, +4, 1d6+2 tranchant.',
          descriptionEn: '',
        },
      ],
    });
    expect(m.traits).toHaveLength(1);
    expect(m.traits[0]?.name.fr).toBe('Agile');
    expect(m.actions).toHaveLength(1);
  });

  it('convertit saves/skills en record et les chips en tableaux propres', () => {
    const m = buildMonsterFromDraft({
      ...goblinDraft(),
      saves: [{ key: 'dex', bonus: 4 }],
      skills: [
        { key: 'stealth', bonus: 6 },
        { key: '', bonus: 99 }, // clé vide → ignorée
      ],
      resistances: ['feu', '  '],
      languages: ['gobelin', 'commun'],
    });
    expect(m.saves).toEqual({ dex: 4 });
    expect(m.skills).toEqual({ stealth: 6 });
    expect(m.resistances).toEqual(['feu']);
    expect(m.languages).toEqual(['gobelin', 'commun']);
  });
});

describe('validateMonsterDraft', () => {
  it('valide un monstre complet (calcul SRD : FP 1/8 → schéma OK)', () => {
    const result = validateMonsterDraft(goblinDraft());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.monster.cr).toBe(0.125);
      expect(result.monster.abilities.dex).toBe(14);
    }
  });

  it('refuse id / type / alignement / formule PV manquants', () => {
    const result = validateMonsterDraft({
      ...EMPTY_MONSTER_DRAFT,
      nameFr: 'Sans rien',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors.id).toBeTruthy();
      expect(result.fieldErrors.type).toBeTruthy();
      expect(result.fieldErrors.alignmentFr).toBeTruthy();
      expect(result.fieldErrors.hpFormula).toBeTruthy();
    }
  });
});

describe('draftFromMonster — round-trip', () => {
  it('reconstruit le draft (build → draft → build identique)', () => {
    const monster = buildMonsterFromDraft({
      ...goblinDraft(),
      hasFly: true,
      speedFly: 40,
      hasDarkvision: true,
      darkvision: 60,
      saves: [{ key: 'dex', bonus: 4 }],
      resistances: ['feu'],
      traits: [
        {
          nameFr: 'Agile',
          nameEn: '',
          descriptionFr: 'Désengagement bonus.',
          descriptionEn: '',
        },
      ],
    });
    const draft = draftFromMonster(monster);
    expect(draft.hasFly).toBe(true);
    expect(draft.speedFly).toBe(40);
    expect(draft.hasDarkvision).toBe(true);
    expect(draft.saves).toEqual([{ key: 'dex', bonus: 4 }]);
    expect(draft.traits).toHaveLength(1);
    expect(buildMonsterFromDraft(draft)).toEqual(monster);
  });

  it('reactions null → draft.reactions = [] (pas de null parasite dans le draft)', () => {
    const monster = buildMonsterFromDraft(goblinDraft());
    const draft = draftFromMonster(monster);
    expect(draft.reactions).toEqual([]);
    expect(draft.legendaryActions).toEqual([]);
  });
});
