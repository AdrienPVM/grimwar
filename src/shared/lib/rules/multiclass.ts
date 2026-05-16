import type { CharacterClassEntry } from '../../types/character';

/** Standard 5e proficiency-bonus table (CR or character total level → bonus). */
export function proficiencyBonus(totalLevel: number): number {
  if (totalLevel < 1) return 2;
  if (totalLevel <= 4) return 2;
  if (totalLevel <= 8) return 3;
  if (totalLevel <= 12) return 4;
  if (totalLevel <= 16) return 5;
  return 6;
}

export function totalLevel(classes: CharacterClassEntry[]): number {
  return classes.reduce((acc, c) => acc + c.level, 0);
}

/**
 * Max HP from class hit die + CON mod, level 1 = max die, level N+ = avg.
 * For multi-class : sum across classes (level 1 of *first* class = max die,
 * subsequent levels = average rounded up).
 */
const HIT_DIE_VALUE: Record<'d6' | 'd8' | 'd10' | 'd12', number> = {
  d6: 6,
  d8: 8,
  d10: 10,
  d12: 12,
};
const HIT_DIE_AVG: Record<'d6' | 'd8' | 'd10' | 'd12', number> = {
  d6: 4,
  d8: 5,
  d10: 6,
  d12: 7,
};

interface HpInputs {
  classes: Array<{ classId: string; level: number; die: 'd6' | 'd8' | 'd10' | 'd12' }>;
  primaryClassId: string;
  conMod: number;
}

export function maxHp({ classes, primaryClassId, conMod }: HpInputs): number {
  let total = 0;
  for (const c of classes) {
    const isPrimary = c.classId === primaryClassId;
    const firstLevelHp = HIT_DIE_VALUE[c.die];
    const avgPerLevel = HIT_DIE_AVG[c.die];
    if (isPrimary) {
      total += firstLevelHp + conMod;
      total += (c.level - 1) * (avgPerLevel + conMod);
    } else {
      total += c.level * (avgPerLevel + conMod);
    }
  }
  return Math.max(1, total);
}
