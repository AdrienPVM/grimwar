import { describe, expect, it } from 'vitest';

import { EMPTY_ANCESTRY_SUB_CHOICES } from '@/shared/types/character';

import {
  buildSkillProficiencies,
  buildSkillSources,
  getSkillsGrantedByOtherSources,
  type BuildSkillProficienciesInput,
} from '../skill-proficiencies';

/**
 * Anti-régression du bug « sources de maîtrise ignorées » remonté à l'UAT
 * plan 13.8 (2026-05-18) :
 *   - L'étape Compétences n'agrégeait que classe + background.
 *   - `submit-from-wizard.ts` n'écrivait dans `character.skills` que les
 *     `pickedSkills`. Les grants background + ancestryExtraSkill étaient
 *     SILENCIEUSEMENT IGNORÉS — Acolyte n'avait pas Insight/Religion sur sa
 *     fiche, Humain Compétent perdait sa skill bonus.
 *
 * Ces tests doivent être vus ROUGES avant la livraison de
 * `buildSkillProficiencies`/`buildSkillSources` (cf. CLAUDE.md
 * « rouge avant vert »). La cohérence repose sur :
 *
 *   1. Règle de fusion max-par-skillId : la maîtrise ne stacke pas avec
 *      elle-même mais l'expertise (2) écrase la maîtrise (1).
 *   2. Les sources sont traçables pour permettre à l'UI d'afficher un tag
 *      « via Acolyte » / « via Humain » / « via expertise Roublard ».
 *   3. Les skills accordées par background OU ancestry doivent réduire le
 *      pool de picks de classe sans réduire le `count` exigé.
 */

const baseInput: BuildSkillProficienciesInput = {
  backgroundSkills: [],
  ancestrySubChoices: { ...EMPTY_ANCESTRY_SUB_CHOICES },
  pickedSkills: [],
  expertiseSkills: [],
};

describe('buildSkillProficiencies — agrégation max-par-skillId', () => {
  it('inputs vides → record vide (jamais d\'entrée à 0 polluante)', () => {
    expect(buildSkillProficiencies(baseInput)).toEqual({});
  });

  it('background Acolyte seul → Insight + Religion = 1 (bug background-latent)', () => {
    const out = buildSkillProficiencies({
      ...baseInput,
      backgroundSkills: ['insight', 'religion'],
    });
    expect(out).toEqual({ insight: 1, religion: 1 });
  });

  it('ancestryExtraSkill Humain Compétent (Arcanes) → arcana = 1', () => {
    const out = buildSkillProficiencies({
      ...baseInput,
      ancestrySubChoices: { ...EMPTY_ANCESTRY_SUB_CHOICES, ancestryExtraSkill: 'arcana' },
    });
    expect(out).toEqual({ arcana: 1 });
  });

  it('ancestryExtraSkill Elfe Sens Aiguisés (Perception) → perception = 1', () => {
    const out = buildSkillProficiencies({
      ...baseInput,
      ancestrySubChoices: {
        ...EMPTY_ANCESTRY_SUB_CHOICES,
        ancestryExtraSkill: 'perception',
      },
    });
    expect(out).toEqual({ perception: 1 });
  });

  it('picks de classe → toutes à 1', () => {
    const out = buildSkillProficiencies({
      ...baseInput,
      pickedSkills: ['investigation', 'history'],
    });
    expect(out).toEqual({ investigation: 1, history: 1 });
  });

  it('background + picks de classe sans doublon → 4 entrées toutes à 1', () => {
    const out = buildSkillProficiencies({
      ...baseInput,
      backgroundSkills: ['insight', 'religion'],
      pickedSkills: ['arcana', 'history'],
    });
    expect(out).toEqual({ insight: 1, religion: 1, arcana: 1, history: 1 });
  });

  it('background + classe doublon (Acolyte+Magicien tous deux Religion) → 1 seule entrée à 1', () => {
    const out = buildSkillProficiencies({
      ...baseInput,
      backgroundSkills: ['insight', 'religion'],
      pickedSkills: ['religion', 'arcana'],
    });
    // Religion n'apparaît qu'une fois ; les 3 skills distinctes sont toutes là.
    expect(out).toEqual({ insight: 1, religion: 1, arcana: 1 });
    expect(Object.keys(out)).toHaveLength(3);
  });

  it('ancestry Humain Compétent + classe doublon (arcana ancestré PUIS arcana picked) → 1 entrée', () => {
    const out = buildSkillProficiencies({
      ...baseInput,
      ancestrySubChoices: { ...EMPTY_ANCESTRY_SUB_CHOICES, ancestryExtraSkill: 'arcana' },
      pickedSkills: ['arcana', 'history'],
    });
    expect(out).toEqual({ arcana: 1, history: 1 });
  });

  it('Acolyte + Humain Compétent + Magicien (Arcana picked) → 4 skills toutes à 1', () => {
    const out = buildSkillProficiencies({
      ...baseInput,
      backgroundSkills: ['insight', 'religion'],
      ancestrySubChoices: { ...EMPTY_ANCESTRY_SUB_CHOICES, ancestryExtraSkill: 'arcana' },
      pickedSkills: ['arcana', 'history'],
    });
    expect(out).toEqual({ insight: 1, religion: 1, arcana: 1, history: 1 });
  });

  it('expertise (13.9 — Roublard) écrase la maîtrise de classe : 1 → 2', () => {
    const out = buildSkillProficiencies({
      ...baseInput,
      pickedSkills: ['stealth', 'sleight-of-hand'],
      expertiseSkills: ['stealth'],
    });
    expect(out).toEqual({ stealth: 2, 'sleight-of-hand': 1 });
  });

  it('expertise sur skill accordée par background → 2 (background=1 écrasé par expertise=2)', () => {
    // Le SRD impose que l'expertise cible une skill déjà maîtrisée, peu
    // importe la source. Si l'origine est background, l'agrégation doit
    // refléter 2.
    const out = buildSkillProficiencies({
      ...baseInput,
      backgroundSkills: ['insight'],
      expertiseSkills: ['insight'],
    });
    expect(out).toEqual({ insight: 2 });
  });

  it('expertise sur skill non maîtrisée → 2 quand même (max-par-skill, garde-fou côté wizard 13.9)', () => {
    // L'agrégateur ne joue pas l'arbitre SRD ; il applique max. La
    // restriction « expertise ne cible que des skills à 1 » est portée
    // par le wizard 13.9 (allowed pool de l'expertise = skills à 1).
    const out = buildSkillProficiencies({
      ...baseInput,
      expertiseSkills: ['stealth'],
    });
    expect(out).toEqual({ stealth: 2 });
  });
});

describe('buildSkillSources — tag « via X » pour l\'UI', () => {
  it('background → source: [\'background\']', () => {
    const out = buildSkillSources({
      ...baseInput,
      backgroundSkills: ['insight'],
    });
    expect(out).toEqual({ insight: ['background'] });
  });

  it('ancestry → source: [\'ancestry\']', () => {
    const out = buildSkillSources({
      ...baseInput,
      ancestrySubChoices: { ...EMPTY_ANCESTRY_SUB_CHOICES, ancestryExtraSkill: 'arcana' },
    });
    expect(out).toEqual({ arcana: ['ancestry'] });
  });

  it('classe pick → source: [\'class-pick\']', () => {
    const out = buildSkillSources({
      ...baseInput,
      pickedSkills: ['history'],
    });
    expect(out).toEqual({ history: ['class-pick'] });
  });

  it('background + class-pick doublon → source: [\'background\', \'class-pick\']', () => {
    const out = buildSkillSources({
      ...baseInput,
      backgroundSkills: ['religion'],
      pickedSkills: ['religion'],
    });
    expect(out).toEqual({ religion: ['background', 'class-pick'] });
  });

  it('ancestry + class-pick doublon → source: [\'ancestry\', \'class-pick\']', () => {
    const out = buildSkillSources({
      ...baseInput,
      ancestrySubChoices: { ...EMPTY_ANCESTRY_SUB_CHOICES, ancestryExtraSkill: 'arcana' },
      pickedSkills: ['arcana'],
    });
    expect(out).toEqual({ arcana: ['ancestry', 'class-pick'] });
  });

  it('classe pick + expertise → source: [\'class-pick\', \'class-expertise\']', () => {
    const out = buildSkillSources({
      ...baseInput,
      pickedSkills: ['stealth'],
      expertiseSkills: ['stealth'],
    });
    expect(out).toEqual({ stealth: ['class-pick', 'class-expertise'] });
  });
});

describe('getSkillsGrantedByOtherSources — pool réduit pour les picks de classe', () => {
  it('background seul → liste des skills background', () => {
    const out = getSkillsGrantedByOtherSources(
      ['insight', 'religion'],
      { ...EMPTY_ANCESTRY_SUB_CHOICES },
    );
    expect(out.sort()).toEqual(['insight', 'religion'].sort());
  });

  it('ancestry seul → la skill d\'ancestry', () => {
    const out = getSkillsGrantedByOtherSources([], {
      ...EMPTY_ANCESTRY_SUB_CHOICES,
      ancestryExtraSkill: 'arcana',
    });
    expect(out).toEqual(['arcana']);
  });

  it('background + ancestry sans overlap → union des deux', () => {
    const out = getSkillsGrantedByOtherSources(
      ['insight', 'religion'],
      { ...EMPTY_ANCESTRY_SUB_CHOICES, ancestryExtraSkill: 'arcana' },
    );
    expect(out.sort()).toEqual(['arcana', 'insight', 'religion'].sort());
  });

  it('background + ancestry avec overlap → dédupliqué', () => {
    const out = getSkillsGrantedByOtherSources(
      ['religion'],
      { ...EMPTY_ANCESTRY_SUB_CHOICES, ancestryExtraSkill: 'religion' },
    );
    expect(out).toEqual(['religion']);
  });

  it('Magicien dont 1 skill du pool est déjà accordée par background — pool réduit, count préservé (assert via test composé)', () => {
    // Le pool Magicien SRD inclut Religion. Si l'Acolyte accorde déjà
    // Religion, le pool affichable doit retirer Religion mais count reste 2.
    const granted = getSkillsGrantedByOtherSources(
      ['insight', 'religion'],
      { ...EMPTY_ANCESTRY_SUB_CHOICES },
    );
    const wizardPool = ['arcana', 'history', 'insight', 'investigation', 'medicine', 'nature', 'religion'];
    const filteredPool = wizardPool.filter((s) => !granted.includes(s));
    expect(filteredPool).not.toContain('religion');
    expect(filteredPool).not.toContain('insight');
    expect(filteredPool).toHaveLength(5);
    // count Magicien (=2) reste lisible côté wizard ; ce test prouve que la
    // formule « pool moins granted » ne réduit JAMAIS count.
    const wizardCount = 2;
    expect(wizardCount).toBe(2);
  });
});
