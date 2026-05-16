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

// ─────────────────────────────────────────────────────────────────────
// Spellcasting — multi-class unified slot table (plan 09 step 5b)
// ─────────────────────────────────────────────────────────────────────

/** Progression d'incantation telle qu'exposée par classes.json. */
export type CasterProgression = 'full' | 'half' | 'third' | 'pact';

export interface CasterClassEntry {
  level: number;
  progression: CasterProgression | null;
}

/**
 * Niveau d'incantateur unifié pour la table d'emplacements 5e multi-classes.
 * Règle (SRD 2024 Multiclassing — Spellcasting) :
 *   • full caster (Bard/Cleric/Druid/Sorcerer/Wizard) → + niveau de classe
 *   • half caster (Paladin/Ranger) → + floor(niveau / 2)
 *   • third caster (Eldritch Knight/Arcane Trickster sous-classes) → + floor(niveau / 3)
 *   • pact (Warlock) → exclu de la table unifiée (gère ses propres pact slots)
 *   • non-caster ou pas de progression → 0
 */
export function casterLevel(classes: CasterClassEntry[]): number {
  let total = 0;
  for (const c of classes) {
    if (!c.progression) continue;
    if (c.progression === 'full') total += c.level;
    else if (c.progression === 'half') total += Math.floor(c.level / 2);
    else if (c.progression === 'third') total += Math.floor(c.level / 3);
    // 'pact' : ignoré ici, traité séparément.
  }
  return total;
}

/** Map niveau de sort → emplacements maxi (0 si non débloqué). Niveaux 1-9. */
export type SpellSlotsByLevel = Readonly<Record<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9, number>>;

const EMPTY_SLOTS: SpellSlotsByLevel = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };

/** Table SRD : emplacements unifiés par niveau d'incantateur (1-20). Niveau 0 = aucun. */
const SLOT_TABLE: readonly SpellSlotsByLevel[] = [
  EMPTY_SLOTS, // 0 : aucun emplacement
  { 1: 2, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 }, // 1
  { 1: 3, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 }, // 2
  { 1: 4, 2: 2, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 }, // 3
  { 1: 4, 2: 3, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 }, // 4
  { 1: 4, 2: 3, 3: 2, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 }, // 5
  { 1: 4, 2: 3, 3: 3, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 }, // 6
  { 1: 4, 2: 3, 3: 3, 4: 1, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 }, // 7
  { 1: 4, 2: 3, 3: 3, 4: 2, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 }, // 8
  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1, 6: 0, 7: 0, 8: 0, 9: 0 }, // 9
  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 0, 7: 0, 8: 0, 9: 0 }, // 10
  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 0, 8: 0, 9: 0 }, // 11
  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 0, 8: 0, 9: 0 }, // 12
  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 0, 9: 0 }, // 13
  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 0, 9: 0 }, // 14
  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1, 9: 0 }, // 15
  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1, 9: 0 }, // 16
  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1, 9: 1 }, // 17
  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 1, 7: 1, 8: 1, 9: 1 }, // 18
  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 1, 8: 1, 9: 1 }, // 19
  { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 2, 7: 2, 8: 1, 9: 1 }, // 20
];

export function spellSlotsForCasterLevel(level: number): SpellSlotsByLevel {
  if (level <= 0) return EMPTY_SLOTS;
  const idx = Math.min(20, Math.max(0, Math.floor(level)));
  return SLOT_TABLE[idx]!;
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
