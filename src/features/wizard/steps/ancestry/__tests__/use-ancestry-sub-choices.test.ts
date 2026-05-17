import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  AncestrySchema,
  type Ancestry,
} from '@/shared/types/content';
import { EMPTY_ANCESTRY_SUB_CHOICES } from '@/shared/types/character';

import {
  ANCESTRY_CASTING_ABILITY_VALUES,
  ANCESTRY_SIZE_VALUES,
  ELF_KEEN_SENSES_SKILLS,
  getAncestrySubChoiceKeys,
  getAncestrySubChoiceRequirements,
  isAncestrySubChoicesCompleted,
} from '../use-ancestry-sub-choices';

/**
 * Test d'intégration disque → fonction pure (plan 13.8 step 2).
 *
 * On charge le VRAI bundle `public/data/ancestries.json` via Zod pour valider
 * que la table de mapping (REQUIREMENTS_BY_ANCESTRY) + les options enrichies
 * (dragonAncestries / tieflingLegacies / elfLineages / etc.) sont cohérentes.
 *
 * Pas de stub fetch : ces helpers sont purs et lisent un array `Ancestry[]`
 * en mémoire — le bundle disque est consommé en lecture directe.
 */
const ANCESTRIES: readonly Ancestry[] = (() => {
  const raw = JSON.parse(
    readFileSync(resolve(__dirname, '../../../../../../public/data/ancestries.json'), 'utf-8'),
  ) as unknown;
  if (!Array.isArray(raw)) throw new Error('ancestries.json is not an array');
  return raw.map((entry) => AncestrySchema.parse(entry));
})();

describe('getAncestrySubChoiceKeys — mapping ancestry → sous-choix requis', () => {
  it('Drakéide → 1 sous-choix : dragonAncestry', () => {
    expect(getAncestrySubChoiceKeys('dragonborn')).toEqual(['dragonAncestry']);
  });

  it('Tieffelin → 3 sous-choix : héritage + caract. incantation + taille', () => {
    expect(getAncestrySubChoiceKeys('tiefling')).toEqual([
      'tieflingLegacy',
      'ancestryCastingAbility',
      'ancestrySize',
    ]);
  });

  it('Elfe → 3 sous-choix : lignage + caract. incantation + skill Sens Aiguisés', () => {
    expect(getAncestrySubChoiceKeys('elf')).toEqual([
      'elfLineage',
      'ancestryCastingAbility',
      'ancestryExtraSkill',
    ]);
  });

  it('Gnome → 2 sous-choix : lignage + caract. incantation', () => {
    expect(getAncestrySubChoiceKeys('gnome')).toEqual([
      'gnomeLineage',
      'ancestryCastingAbility',
    ]);
  });

  it('Goliath → 1 sous-choix : ascendance gigante', () => {
    expect(getAncestrySubChoiceKeys('goliath')).toEqual(['goliathAncestry']);
  });

  it('Humain → 2 sous-choix : taille + skill au choix', () => {
    expect(getAncestrySubChoiceKeys('human')).toEqual([
      'ancestrySize',
      'ancestryExtraSkill',
    ]);
  });

  it.each(['dwarf', 'halfling', 'orc'])(
    'ascendance sans sous-choix imposé (%s) → liste vide',
    (ancestryId) => {
      expect(getAncestrySubChoiceKeys(ancestryId)).toEqual([]);
    },
  );

  it('ancestryId null → liste vide (état initial wizard)', () => {
    expect(getAncestrySubChoiceKeys(null)).toEqual([]);
  });

  it('ancestryId inconnu → liste vide (custom content packs futurs)', () => {
    expect(getAncestrySubChoiceKeys('aasimar')).toEqual([]);
  });
});

describe('getAncestrySubChoiceRequirements — valeurs admises depuis bundle', () => {
  it('Drakéide : 10 types de dragon admis (table SRD complète)', () => {
    const reqs = getAncestrySubChoiceRequirements('dragonborn', ANCESTRIES);
    expect(reqs).toHaveLength(1);
    expect(reqs[0]!.key).toBe('dragonAncestry');
    expect(reqs[0]!.admissibleValues).toHaveLength(10);
    // Quelques sentinelles pour blinder la régression de bundle.
    expect(reqs[0]!.admissibleValues).toContain('red');
    expect(reqs[0]!.admissibleValues).toContain('silver');
    expect(reqs[0]!.admissibleValues).toContain('green');
  });

  it('Tieffelin : 3 héritages + 3 caract. d\'incantation + 2 tailles', () => {
    const reqs = getAncestrySubChoiceRequirements('tiefling', ANCESTRIES);
    const byKey = Object.fromEntries(reqs.map((r) => [r.key, r.admissibleValues]));
    expect(byKey.tieflingLegacy).toEqual(['abyssal', 'chthonic', 'infernal']);
    expect(byKey.ancestryCastingAbility).toEqual(ANCESTRY_CASTING_ABILITY_VALUES);
    expect(byKey.ancestrySize).toEqual(ANCESTRY_SIZE_VALUES);
  });

  it('Elfe : 3 lignages + caract. incantation + Sens Aiguisés (Insight/Perception/Survival)', () => {
    const reqs = getAncestrySubChoiceRequirements('elf', ANCESTRIES);
    const byKey = Object.fromEntries(reqs.map((r) => [r.key, r.admissibleValues]));
    expect(byKey.elfLineage).toEqual(['drow', 'high-elf', 'wood-elf']);
    expect(byKey.ancestryExtraSkill).toEqual(ELF_KEEN_SENSES_SKILLS);
  });

  it('Gnome : 2 lignages (forêts / roches)', () => {
    const reqs = getAncestrySubChoiceRequirements('gnome', ANCESTRIES);
    const lineage = reqs.find((r) => r.key === 'gnomeLineage');
    expect(lineage?.admissibleValues).toEqual(['forest', 'rock']);
  });

  it('Goliath : 6 ascendances gigantes', () => {
    const reqs = getAncestrySubChoiceRequirements('goliath', ANCESTRIES);
    expect(reqs).toHaveLength(1);
    expect(reqs[0]!.admissibleValues).toEqual([
      'cloud',
      'fire',
      'frost',
      'hill',
      'stone',
      'storm',
    ]);
  });

  it('Humain : 18 skills SRD via skillfulOptions (pas un sous-ensemble de 3 elf)', () => {
    const reqs = getAncestrySubChoiceRequirements('human', ANCESTRIES);
    const skill = reqs.find((r) => r.key === 'ancestryExtraSkill');
    expect(skill?.admissibleValues.length).toBeGreaterThanOrEqual(18);
    expect(skill?.admissibleValues).toContain('perception');
    expect(skill?.admissibleValues).toContain('athletics');
    expect(skill?.admissibleValues).toContain('persuasion');
  });
});

describe('isAncestrySubChoicesCompleted', () => {
  it('Drakéide sans dragonAncestry → INCOMPLET (rouge avant fix wizard)', () => {
    expect(
      isAncestrySubChoicesCompleted('dragonborn', EMPTY_ANCESTRY_SUB_CHOICES),
    ).toBe(false);
  });

  it('Drakéide avec dragonAncestry posé → complet', () => {
    expect(
      isAncestrySubChoicesCompleted('dragonborn', {
        ...EMPTY_ANCESTRY_SUB_CHOICES,
        dragonAncestry: 'red',
      }),
    ).toBe(true);
  });

  it('Tieffelin partiel (héritage seul, sans caract. incantation ni taille) → incomplet', () => {
    expect(
      isAncestrySubChoicesCompleted('tiefling', {
        ...EMPTY_ANCESTRY_SUB_CHOICES,
        tieflingLegacy: 'infernal',
      }),
    ).toBe(false);
  });

  it('Tieffelin complet (3 sous-choix posés) → complet', () => {
    expect(
      isAncestrySubChoicesCompleted('tiefling', {
        ...EMPTY_ANCESTRY_SUB_CHOICES,
        tieflingLegacy: 'infernal',
        ancestryCastingAbility: 'cha',
        ancestrySize: 'medium',
      }),
    ).toBe(true);
  });

  it('Nain sans aucun sous-choix → complet (aucun requis)', () => {
    expect(
      isAncestrySubChoicesCompleted('dwarf', EMPTY_ANCESTRY_SUB_CHOICES),
    ).toBe(true);
  });

  it('ancestryId null (wizard step 1 pas encore posé) → complet (rien à valider)', () => {
    expect(
      isAncestrySubChoicesCompleted(null, EMPTY_ANCESTRY_SUB_CHOICES),
    ).toBe(true);
  });
});
