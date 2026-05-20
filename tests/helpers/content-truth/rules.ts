import { expect } from 'vitest';

import { abilityModifier } from '@/shared/lib/rules/abilities';
import { proficiencyBonus } from '@/shared/lib/rules/multiclass';
import { skillModifier } from '@/shared/lib/rules/skills';
import {
  computeAcFromArmor,
  type EquippedRow,
} from '@/features/sheet/modes/avoir/inventory-rules';
import type { SkillProf } from '@/shared/types/character';

/**
 * Cat. 4 — Calculs de regles, resultat chiffre contre la regle SRD.
 * (CLAUDE.md > Required at every commit > Verite du contenu, point 4.)
 *
 * BORNAGE (plan 13.12, Q1) : armure + CA + DD + mods + bonus de maitrise +
 * expertise (×2, pas ×3). Les degats de SORT sont HORS scope — `spell.damage[]`
 * n'est pas peuple (dette D1, rencontree par cette categorie, traitee par un
 * plan dedie post-13.12). Les degats d'ARME restent couverts (donnees peuplees).
 *
 * Chaque helper COMPOSE la fonction de prod reelle (pas une reimplementation)
 * puis asserte le NOMBRE attendu. Une regression dans la regle de prod est donc
 * attrapee — pas seulement un `toBeGreaterThan(0)`.
 */

/** Bonus de maitrise pour un niveau total donne (SRD 2024). */
export function expectProfBonus(totalLevel: number, expected: number): void {
  expect(
    proficiencyBonus(totalLevel),
    `[content-truth] bonus de maitrise (niveau total ${totalLevel})`,
  ).toBe(expected);
}

/**
 * CA depuis l'armure equipee. Compose `computeAcFromArmor` (prod). `null` =
 * aucune armure/bouclier (la fiche garde 10 + DEX). On asserte la valeur exacte,
 * y compris `null` quand `expected === null`.
 */
export function expectAC(
  rows: readonly EquippedRow[],
  dexScore: number,
  expected: number | null,
): void {
  expect(
    computeAcFromArmor(rows, dexScore),
    `[content-truth] CA (DEX ${dexScore})`,
  ).toBe(expected);
}

/**
 * DD de sauvegarde d'un sort = 8 + bonus de maitrise + mod de caracteristique
 * d'incantation (SRD 2024). Encode la formule via les primitives de prod.
 */
export function expectSaveDC(
  args: { abilityScore: number; totalLevel: number },
  expected: number,
): void {
  const dc = 8 + proficiencyBonus(args.totalLevel) + abilityModifier(args.abilityScore);
  expect(
    dc,
    `[content-truth] DD de sauvegarde (carac ${args.abilityScore}, niveau ${args.totalLevel})`,
  ).toBe(expected);
}

/**
 * Bonus d'attaque = mod de caracteristique + (bonus de maitrise si maitrise
 * l'arme/le sort). Vaut pour attaque d'arme et attaque de sort.
 */
export function expectAttackMod(
  args: { abilityScore: number; totalLevel: number; proficient: boolean },
  expected: number,
): void {
  const mod =
    abilityModifier(args.abilityScore) +
    (args.proficient ? proficiencyBonus(args.totalLevel) : 0);
  expect(
    mod,
    `[content-truth] bonus d'attaque (carac ${args.abilityScore}, niveau ${args.totalLevel}, maitrise=${args.proficient})`,
  ).toBe(expected);
}

/**
 * Modificateur de competence avec niveau de maitrise. Compose `skillModifier`
 * (prod). Cas-limite cat. 6 : l'EXPERTISE (niveau 2) donne mod + 2×PB, JAMAIS
 * 3×PB — meme quand la classe maitrisait deja la competence (×2 final).
 */
export function expectExpertise(
  args: { abilityScore: number; totalLevel: number; proficiencyLevel: SkillProf },
  expected: number,
): void {
  const value = skillModifier({
    skillId: 'reference',
    abilityMod: abilityModifier(args.abilityScore),
    profBonus: proficiencyBonus(args.totalLevel),
    proficiencyLevel: args.proficiencyLevel,
  });
  expect(
    value,
    `[content-truth] modificateur competence (carac ${args.abilityScore}, niveau ${args.totalLevel}, maitrise=${args.proficiencyLevel})`,
  ).toBe(expected);
}
