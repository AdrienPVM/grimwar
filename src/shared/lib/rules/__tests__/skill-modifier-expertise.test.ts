import { describe, expect, it } from 'vitest';

import { EMPTY_ANCESTRY_SUB_CHOICES } from '@/shared/types/character';

import { abilityModifier } from '../abilities';
import { proficiencyBonus } from '../multiclass';
import { buildSkillProficiencies } from '../skill-proficiencies';
import { getSkillProficiency, SKILLS, skillModifier } from '../skills';

/**
 * Cat. 4 (calculs de règles chiffrés) + Cat. 6 (cas-limites — intersections),
 * politique « Vérité du contenu » 2026-05-19 (CLAUDE.md > Required at every
 * commit > Vérité du contenu), appliquée au périmètre Essence du plan 13.9
 * commit 4b.
 *
 * Question d'Adrien : « L'Expertise sur une compétence DÉJÀ maîtrisée par la
 * classe donne-t-elle bien ×2 et pas ×3 ? »
 *
 * Test négatif explicite : un Roublard L1 Dex 14 Stealth avec maîtrise classe
 * + expertise classe a un bonus FINAL de +6 (Dex 14 → +2, PB L1 → +2,
 * expertise level=2 → 2×PB = +4 ; total = +2 + 4 = +6) — PAS +8 (qui serait
 * +2 + 3×PB s'il y avait stacking, ce que le SRD INTERDIT).
 *
 * On itère sur les 18 skills SRD avec une ability mod typique pour vérifier
 * que la formule est correcte à grande échelle, pas juste sur un cas pris au
 * hasard.
 */

const PB_L1 = proficiencyBonus(1);
const PB_L5 = proficiencyBonus(5);

describe('cat. 4 + 6 — Expertise sur compétence DÉJÀ maîtrisée : ×2 final, jamais ×3', () => {
  it('Roublard L1 Dex 14 Stealth (prof+expertise) → +6, PAS +8 (cas-limite SRD)', () => {
    // Source unique de vérité : l'agrégateur skill-proficiencies maxe à 2.
    const skills = buildSkillProficiencies({
      backgroundSkills: [],
      ancestrySubChoices: { ...EMPTY_ANCESTRY_SUB_CHOICES },
      // Stealth est maîtrisée par la classe Roublard L1.
      pickedSkills: ['stealth'],
      // L'Expertise Roublard cible la même compétence (SRD impose qu'elle
      // soit déjà maîtrisée). Le bug que ce test attrape : un agrégateur
      // qui additionnerait 1 + 2 = 3 au lieu de max(1, 2) = 2.
      expertiseSkills: ['stealth'],
    });
    expect(getSkillProficiency(skills, 'stealth')).toBe(2);

    const dexMod = abilityModifier(14);
    expect(dexMod).toBe(2);
    const bonus = skillModifier({
      skillId: 'stealth',
      abilityMod: dexMod,
      profBonus: PB_L1,
      proficiencyLevel: getSkillProficiency(skills, 'stealth'),
    });
    // Expertise = abilityMod + 2×PB. PAS abilityMod + 3×PB.
    expect(bonus).toBe(6);
    // Test négatif explicite — la régression « stacking interdit » ferait +8.
    expect(bonus).not.toBe(8);
  });

  it.each(SKILLS.map((s) => ({ skillId: s.id, ability: s.ability })))(
    'skill=$skillId — prof seule = ability+PB ; prof+expertise = ability+2PB (jamais +3PB)',
    ({ skillId }) => {
      // Ability mod fixe pour rendre les chiffres lisibles ; le test est
      // sur la formule, pas sur la statistique d'ability.
      const abilityMod = 3; // ex. score 16

      // Cas A : juste maîtrise classe.
      const profOnly = buildSkillProficiencies({
        backgroundSkills: [],
        ancestrySubChoices: { ...EMPTY_ANCESTRY_SUB_CHOICES },
        pickedSkills: [skillId],
        expertiseSkills: [],
      });
      const bonusProfOnly = skillModifier({
        skillId,
        abilityMod,
        profBonus: PB_L1,
        proficiencyLevel: getSkillProficiency(profOnly, skillId),
      });
      // abilityMod (3) + PB (2) × prof level (1) = +5.
      expect(bonusProfOnly).toBe(5);

      // Cas B : maîtrise classe + Expertise classe sur LA MÊME skill.
      const profPlusExpertise = buildSkillProficiencies({
        backgroundSkills: [],
        ancestrySubChoices: { ...EMPTY_ANCESTRY_SUB_CHOICES },
        pickedSkills: [skillId],
        expertiseSkills: [skillId],
      });
      expect(
        getSkillProficiency(profPlusExpertise, skillId),
        `${skillId} : la fusion prof+expertise doit valoir 2 (max), JAMAIS 3 (stacking interdit SRD)`,
      ).toBe(2);
      const bonusBoth = skillModifier({
        skillId,
        abilityMod,
        profBonus: PB_L1,
        proficiencyLevel: getSkillProficiency(profPlusExpertise, skillId),
      });
      // abilityMod (3) + PB (2) × expertise level (2) = +7.
      expect(bonusBoth).toBe(7);
      // Test négatif — si stacking, ce serait +9.
      expect(bonusBoth).not.toBe(9);
    },
  );

  it('Expertise sur skill accordée par background (NON par classe) : final = 2 (max), bonus = ability+2PB', () => {
    // Cas tordu : background donne Insight (Acolyte → Insight + Religion),
    // puis l'Expertise tape sur Insight (cas-limite SRD : « expertise must
    // target an already-proficient skill »). L'agrégateur doit reconnaître
    // que c'est légitime — fond background = 1, plus expertise = 2 final.
    const skills = buildSkillProficiencies({
      backgroundSkills: ['insight'],
      ancestrySubChoices: { ...EMPTY_ANCESTRY_SUB_CHOICES },
      pickedSkills: [],
      expertiseSkills: ['insight'],
    });
    expect(getSkillProficiency(skills, 'insight')).toBe(2);

    const sagMod = abilityModifier(14);
    const bonus = skillModifier({
      skillId: 'insight',
      abilityMod: sagMod,
      profBonus: PB_L5,
      proficiencyLevel: getSkillProficiency(skills, 'insight'),
    });
    // sagMod (2) + PB L5 (3) × 2 = +8.
    expect(bonus).toBe(8);
    // Cas-limite : pas de stacking « background=1 + expertise=2 = 3 » → +11.
    expect(bonus).not.toBe(11);
  });
});
