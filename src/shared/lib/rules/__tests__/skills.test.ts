import { describe, expect, it } from 'vitest';

import { abilityModifier } from '../abilities';
import { getSkill, getSkillProficiency, SKILLS, skillModifier } from '../skills';

describe('SKILLS registry', () => {
  it('contains the 18 SRD skills', () => {
    expect(SKILLS).toHaveLength(18);
  });

  it('has unique ids', () => {
    const ids = SKILLS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('covers the 6 abilities with the right defaults', () => {
    // SRD 5e par défaut : 1×FOR, 3×DEX, 5×INT, 5×SAG, 4×CHA (CON n'a aucune skill).
    const byAbility = SKILLS.reduce<Record<string, number>>((acc, s) => {
      acc[s.ability] = (acc[s.ability] ?? 0) + 1;
      return acc;
    }, {});
    expect(byAbility.for).toBe(1);
    expect(byAbility.dex).toBe(3);
    expect(byAbility.int).toBe(5);
    expect(byAbility.sag).toBe(5);
    expect(byAbility.cha).toBe(4);
    expect(byAbility.con ?? 0).toBe(0);
  });

  it('FR + EN names are non-empty for each skill', () => {
    for (const s of SKILLS) {
      expect(s.name.fr.length).toBeGreaterThan(0);
      expect((s.name.en ?? '').length).toBeGreaterThan(0);
    }
  });
});

describe('getSkill', () => {
  it('looks up by id', () => {
    expect(getSkill('athletics')?.ability).toBe('for');
    expect(getSkill('stealth')?.ability).toBe('dex');
    expect(getSkill('persuasion')?.ability).toBe('cha');
  });
  it('returns undefined for unknown id', () => {
    expect(getSkill('unknown')).toBeUndefined();
  });
});

describe('skillModifier', () => {
  it('non-proficient = ability mod only', () => {
    expect(
      skillModifier({ skillId: 'athletics', abilityMod: 3, profBonus: 2, proficiencyLevel: 0 }),
    ).toBe(3);
  });
  it('proficient = ability mod + PB', () => {
    expect(
      skillModifier({ skillId: 'athletics', abilityMod: 3, profBonus: 2, proficiencyLevel: 1 }),
    ).toBe(5);
  });
  it('expertise = ability mod + 2×PB', () => {
    expect(
      skillModifier({ skillId: 'athletics', abilityMod: 3, profBonus: 2, proficiencyLevel: 2 }),
    ).toBe(7);
  });
  it('integrates with abilityModifier (e.g. INT 18, prof, level 5 → +abilityMod 4 + PB 3 = +7)', () => {
    const intMod = abilityModifier(18);
    const skillMod = skillModifier({
      skillId: 'arcana',
      abilityMod: intMod,
      profBonus: 3,
      proficiencyLevel: 1,
    });
    expect(skillMod).toBe(7);
  });
  it('handles negative ability mod cleanly', () => {
    // FOR 8 = -1, non proficient: -1 reste -1
    expect(
      skillModifier({ skillId: 'athletics', abilityMod: -1, profBonus: 2, proficiencyLevel: 0 }),
    ).toBe(-1);
  });
});

describe('getSkillProficiency', () => {
  it('returns 0 when skill is missing', () => {
    expect(getSkillProficiency({}, 'athletics')).toBe(0);
  });
  it('returns the stored level', () => {
    expect(getSkillProficiency({ athletics: 1 }, 'athletics')).toBe(1);
    expect(getSkillProficiency({ athletics: 2 }, 'athletics')).toBe(2);
  });
});
