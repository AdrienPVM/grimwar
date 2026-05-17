import { describe, it, expect } from 'vitest';

import { ANCESTRY_CASTING_ABILITY_HELP } from '../ancestry-casting-ability-help';
import { ANCESTRY_EXTRA_SKILL_HELP } from '../ancestry-extra-skill-help';
import { ANCESTRY_SIZE_HELP } from '../ancestry-size-help';
import { DRAGON_ANCESTRY_HELP } from '../dragon-ancestry-help';
import { ELF_LINEAGE_HELP } from '../elf-lineage-help';
import { GNOME_LINEAGE_HELP } from '../gnome-lineage-help';
import { GOLIATH_ANCESTRY_HELP } from '../goliath-ancestry-help';
import { TIEFLING_LEGACY_HELP } from '../tiefling-legacy-help';

/**
 * Garde de complétude (plan 13.8 step 22).
 *
 * Chaque dictionnaire d'aide doit couvrir TOUS les ids du schema (Zod enum).
 * Un help manquant → la fiche affiche un bloc tronqué pour ce choix. Ce
 * test prévient le bug silencieux où on ajoute un nouvel id sans MAJ
 * pédagogique.
 */

describe('Dictionnaires d\'aide — complétude par schema enum', () => {
  it('DRAGON_ANCESTRY_HELP couvre les 10 types SRD', () => {
    expect(Object.keys(DRAGON_ANCESTRY_HELP).sort()).toEqual([
      'black',
      'blue',
      'brass',
      'bronze',
      'copper',
      'gold',
      'green',
      'red',
      'silver',
      'white',
    ]);
  });

  it('TIEFLING_LEGACY_HELP couvre les 3 héritages SRD', () => {
    expect(Object.keys(TIEFLING_LEGACY_HELP).sort()).toEqual([
      'abyssal',
      'chthonic',
      'infernal',
    ]);
  });

  it('ELF_LINEAGE_HELP couvre les 3 lignages SRD', () => {
    expect(Object.keys(ELF_LINEAGE_HELP).sort()).toEqual([
      'drow',
      'high-elf',
      'wood-elf',
    ]);
  });

  it('GNOME_LINEAGE_HELP couvre les 2 lignages SRD', () => {
    expect(Object.keys(GNOME_LINEAGE_HELP).sort()).toEqual(['forest', 'rock']);
  });

  it('GOLIATH_ANCESTRY_HELP couvre les 6 ascendances gigantes SRD', () => {
    expect(Object.keys(GOLIATH_ANCESTRY_HELP).sort()).toEqual([
      'cloud',
      'fire',
      'frost',
      'hill',
      'stone',
      'storm',
    ]);
  });

  it('ANCESTRY_CASTING_ABILITY_HELP couvre int/sag/cha', () => {
    expect(Object.keys(ANCESTRY_CASTING_ABILITY_HELP).sort()).toEqual([
      'cha',
      'int',
      'sag',
    ]);
  });

  it('ANCESTRY_EXTRA_SKILL_HELP couvre elf + human', () => {
    expect(Object.keys(ANCESTRY_EXTRA_SKILL_HELP).sort()).toEqual(['elf', 'human']);
  });

  it('ANCESTRY_SIZE_HELP couvre small + medium', () => {
    expect(Object.keys(ANCESTRY_SIZE_HELP).sort()).toEqual(['medium', 'small']);
  });
});

describe('Dictionnaires d\'aide — qualité rédactionnelle (CLAUDE.md règle FR)', () => {
  /**
   * Chaque entrée doit : commencer par une majuscule, ne PAS finir par
   * « points de suspension » ouverts non typographiés, avoir un tagline
   * non-vide et au moins 1 bullet inGame.
   */
  const allEntries = [
    ...Object.entries(DRAGON_ANCESTRY_HELP).map(([k, v]) => [`dragon:${k}`, v] as const),
    ...Object.entries(TIEFLING_LEGACY_HELP).map(([k, v]) => [`tiefling:${k}`, v] as const),
    ...Object.entries(ELF_LINEAGE_HELP).map(([k, v]) => [`elf:${k}`, v] as const),
    ...Object.entries(GNOME_LINEAGE_HELP).map(([k, v]) => [`gnome:${k}`, v] as const),
    ...Object.entries(GOLIATH_ANCESTRY_HELP).map(
      ([k, v]) => [`goliath:${k}`, v] as const,
    ),
    ...Object.entries(ANCESTRY_CASTING_ABILITY_HELP).map(
      ([k, v]) => [`castingAbility:${k}`, v] as const,
    ),
    ...Object.entries(ANCESTRY_EXTRA_SKILL_HELP).map(
      ([k, v]) => [`extraSkill:${k}`, v] as const,
    ),
    ...Object.entries(ANCESTRY_SIZE_HELP).map(([k, v]) => [`size:${k}`, v] as const),
  ];

  it.each(allEntries)('entrée %s : tagline non vide + commence par majuscule', (_id, entry) => {
    expect(entry.tagline.length).toBeGreaterThan(0);
    expect(entry.tagline[0]).toBe(entry.tagline[0]!.toUpperCase());
  });

  it.each(allEntries)('entrée %s : whyChoose non vide + commence par majuscule', (_id, entry) => {
    expect(entry.whyChoose.length).toBeGreaterThan(0);
    expect(entry.whyChoose[0]).toBe(entry.whyChoose[0]!.toUpperCase());
  });

  it.each(allEntries)('entrée %s : >=1 bullet inGame', (_id, entry) => {
    expect(entry.inGame.length).toBeGreaterThanOrEqual(1);
  });
});
